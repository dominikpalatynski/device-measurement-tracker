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
     * 
     * @param string $topic The MQTT topic
     * @param string $payload The MQTT message payload
     * @return Measurement|false The saved measurement or false on failure
     */
    public function processMqttMessage($topic, $payload)
    {
        try {
            // Parse the payload
            $data = Json::decode($payload);
            
            if (!isset($data['deviceId'])) {
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
                Yii::error("Failed to save measurement: " . Json::encode($measurement->errors), 'mqtt');
                return false;
            }
            
            // Optionally trigger events or cache updates
            Yii::$app->cache->set(
                "latest_measurement_{$device->id}", 
                $measurement, 
                3600
            );
            
            return $measurement;
        } catch (\Exception $e) {
            Yii::error("Error processing MQTT message: " . $e->getMessage(), 'mqtt');
            return false;
        }
    }
    
    /**
     * Find or create a device by UUID
     * 
     * @param string $deviceUuid
     * @return Device
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
     * 
     * @param integer|null $deviceId
     * @param integer $limit
     * @return array
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
}