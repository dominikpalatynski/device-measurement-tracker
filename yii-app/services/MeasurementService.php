<?php
namespace app\services;

use Yii;
use app\models\Device;
use app\models\Measurement;
use yii\base\Component;
use yii\helpers\Json;
use yii\web\ServerErrorHttpException;

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
            $measurement = new Measurement();
            $measurement->device_id = $device->id;
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
    {
        $device = Device::findOne(['device_uuid' => $deviceUuid]);
        
        if (!$device) {
            $device = new Device();
            $device->device_uuid = $deviceUuid;
            $device->name = "Device $deviceUuid";
            $device->status = Device::STATUS_ACTIVE;
            $device->created_at = time();
            $device->updated_at = time();
            
            if (!$device->save()) {
                throw new ServerErrorHttpException('Failed to create device: ' . 
                    Json::encode($device->errors));
            }
        }
        
        return $device;
    }
    
    /**
     * Get latest measurements for all devices or a specific device
     */
    public function getLatestMeasurements($deviceId = null, $limit = 10)
    {
        $query = Measurement::find()
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