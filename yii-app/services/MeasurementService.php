<?php
namespace app\services;

use Yii;
use app\models\Devices;
use app\models\Measurement;
use yii\base\Component;
use yii\helpers\Json;
use yii\web\ServerErrorHttpException;
use app\models\Experiments;
use app\models\MeasurementData;
class MeasurementService extends Component
{
    /**
     * Process incoming measurement from MQTT
     */
    public function processMqttMessage($topic, $payload)
    {
        try {
            echo "\033[32m[MQTT] Processing message: $payload\033[0m\n";
            
            // Przykład debugowania z użyciem Yii2
            Yii::info([
                'topic' => $topic,
                'payload' => $payload,
                'decoded' => Json::decode($payload)
            ], 'mqtt-debug');

            Yii::info("Processing MQTT message: $payload", 'mqtt');
            // Parse the payload
            $data = Json::decode($payload);
            
            if (!isset($data['deviceId'])) {
                echo "\033[31m[MQTT] Error: Missing deviceId in payload\033[0m\n";
                Yii::error("Missing deviceId in MQTT payload: $payload", 'mqtt');
                return false;
            }
            
            // Find or create the device
            $deviceUuid = $data['deviceId'];
            $device = $this->getOrCreateDevice($deviceUuid);
            
            // Update device last seen timestamp
            $device->last_seen_at = time();
            $device->save();
              // Create new measurement
            $measurement = new MeasurementData();
            $measurement->device_id = $device->device_id;
            $measurement->temperature = $data['temperature'] ?? null;
            $measurement->humidity = $data['humidity'] ?? null;
            $measurement->pressure = $data['pressure'] ?? null;
            $measurement->battery_level = $data['batteryLevel'] ?? null;
            $measurement->raw_data = $payload;
            $measurement->measured_at = isset($data['timestamp']) ? 
                $data['timestamp'] : time();
            $measurement->created_at = time();
            
            if (!$measurement->save()) {
                echo "\033[31m[MQTT] Error: Failed to save measurement\033[0m\n";
                Yii::error("Failed to save measurement: " . Json::encode($measurement->errors), 'mqtt');
                return false;
            }

            $this->sendMeasurementToPredictionService($measurement);
            echo "\033[32m[MQTT] Successfully processed measurement for device: $deviceUuid\033[0m\n";
            return $measurement;
        } catch (\Exception $e) {
            echo "\033[31m[MQTT] Error: " . $e->getMessage() . "\033[0m\n";
            Yii::error("Error processing MQTT message: " . $e->getMessage(), 'mqtt');
            return false;
        }
    }
    
    /**
     * Find or create a device by UUID
     */
    protected function getOrCreateDevice($deviceUuid)
    {        $device = Devices::findByDeviceId($deviceUuid);
        
        if (!$device) {
            $device = new Devices();
            $device->device_id = $deviceUuid;
            $device->device_name = "Device $deviceUuid";
            $device->device_type = Devices::TYPE_PMSM_MECHANICAL_VIBRATION; // Default type
            $device->status = Devices::STATUS_ACTIVE;
            $device->registration_date = new \yii\db\Expression('NOW()');
            $device->last_updated = new \yii\db\Expression('NOW()');
            
            if (!$device->save()) {
                throw new ServerErrorHttpException('Failed to create device: ' . 
                    Json::encode($device->errors));
            }
        }
        
        return $device;
    }
    
    public function processRealTimeDataMqttMessage($topic, $payload)
    {
        try {
            $parts = explode('/', $topic);
            $deviceId = isset($parts[1]) ? $parts[1] : null;
            echo "\033[32m[MQTT] Processing real time data message: $payload\033[0m\n";
            $data = Json::decode($payload);
            $device = Devices::findByDeviceId($deviceId);
            if (!$device) {
                throw new \Exception("Device not found: $deviceId");
            }

            $activeExperiment = $device->getExperiments()
                ->where(['type' => Experiments::STREAM, 'status' => Experiments::STATUS_RUNNING])
                ->one();
            if ($activeExperiment) {
                echo "\033[32m[MQTT] Found active experiment for device: $deviceId\033[0m\n";
                $activePhenomena = $activeExperiment->getPhenomena()
                    ->where(['status' => 'Active'])
                    ->all();
                
                if (!empty($activePhenomena)) {
                    echo "\033[32m[MQTT] Found active experiment and phenomena for device: $deviceId\033[0m\n";
                    // ... Twoja logika dla aktywnych phenomena ...
                    $measurement = new \app\models\MeasurementData();
                    $measurement->device_id = $deviceId;
                    $measurement->phenomenon_id = $activePhenomena[0]->phenomenon_id;
                    $measurement->data_payload = $data['data'];
                    $measurement->timestamp = date('Y-m-d H:i:s');
                    $measurement->save();
                    return $measurement;
                }
            }

            echo "\033[33m[MQTT] No active experiment or phenomena, saving to UnassignedData for device: $deviceId\033[0m\n";
            $measurement = new \app\models\MeasurementData();
            $measurement->device_id = $deviceId;
            $measurement->data_payload = $data['data'];
            $measurement->timestamp = date('Y-m-d H:i:s');
            $measurement->save();
            return $measurement;
        } catch (\Exception $e) {
            echo "\033[31m[MQTT] Error: " . $e->getMessage() . "\033[0m\n";
            Yii::error("Error processing real time data MQTT message: " . $e->getMessage(), 'mqtt');
            return false;
        }
    }

    /**
     * Get latest measurements for all devices or a specific device
     */
    public function getLatestMeasurements($deviceId = null, $limit = 10)
    {
        $query = MeasurementData::find()
            ->orderBy(['measured_at' => SORT_DESC]);
            
        if ($deviceId !== null) {
            $query->andWhere(['device_id' => $deviceId]);
        }
        
        return $query->limit($limit)->all();
    }

    protected function sendMeasurementToPredictionService($measurement)
    {
       $topic = 'predictions/'.$measurement->device_id.'/measurements';
       $payload = [
        'temperature' => $measurement->temperature,
        'humidity' => $measurement->humidity,
        'pressure' => $measurement->pressure,
        'batteryLevel' => $measurement->battery_level,
        'timestamp' => $measurement->measured_at,
       ];
        
       Yii::$app->mqtt->publish($topic, Json::encode($payload), 1);
       echo "\033[32m[MQTT] Measurement sent to prediction service: $topic\033[0m\n";
       Yii::info("Measurement sent successfully to topic: {$topic}", 'mqtt');
    }
}