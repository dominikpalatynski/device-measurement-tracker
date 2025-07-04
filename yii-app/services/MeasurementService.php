<?php
namespace app\services;

use Yii;
use app\models\Devices;
use yii\base\Component;
use yii\helpers\Json;
use yii\web\ServerErrorHttpException;
use app\models\Faults;
use app\models\Condition;
use app\models\MeasurementData;

class MeasurementService extends Component
{
    private $mongoService;
    private $redisService;
    private $deviceRepository;
    private $conditionRepository;
    private $faultRepository;

    public function __construct(
        ?DeviceRepositoryInterface $deviceRepository = null,
        ?ConditionRepositoryInterface $conditionRepository = null,
        ?FaultRepositoryInterface $faultRepository = null,
        $config = []
    ) {
        parent::__construct($config);
        $this->deviceRepository = $deviceRepository ?: new ActiveRecordDeviceRepository();
        $this->conditionRepository = $conditionRepository ?: new ActiveRecordConditionRepository();
        $this->faultRepository = $faultRepository ?: new ActiveRecordFaultRepository();
        try {
            $this->mongoService = new MongoDBService();
            Yii::info("MongoDB service initialized successfully");
        } catch (\Exception $e) {
            Yii::error("Failed to initialize MongoDB service: " . $e->getMessage(), 'mongodb');
            $this->mongoService = null;
        }
    }
    
    /**
     * Find or create a device by UUID
     */
    protected function getOrCreateDevice($deviceUuid)
    {
        $device = $this->deviceRepository->findByDeviceId($deviceUuid);
        
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
            $device = $this->deviceRepository->findByDeviceId($deviceId);
            if (!$device) {
                throw new \Exception("Device not found: $deviceId");
            }

            $measurementData = null;
            if($data['condition_name'] != null) {
            $condition = $this->conditionRepository->findByName($data['condition_name']);
            if (!$condition) {
                $fault = $this->faultRepository->findActiveByDeviceId($deviceId);
                if (!$fault) {
                    throw new \Exception("Fault not found: $deviceId");
                }
                $condition = new Condition();
                $condition->condition_id = Condition::generateConditionId();
                $condition->name = $data['condition_name'];
                $condition->status = Condition::STATUS_ACTIVE;
                $condition->fault_id = $fault->fault_id;
                $condition->save();
            }

            $fault = $this->faultRepository->findActiveByDeviceId($deviceId);
            if (!$fault) {
                throw new \Exception("Fault not found: $deviceId");
            }

            $measurementData = [
                'data_series' => $data['data_series'],
                'conditionId' => $condition->condition_id,
                'faultId' => $fault->fault_id,
                'data_payload' => $data['data'],
                'condition_name' => $data['condition_name'],
            ];
        } else {
            $measurementData = [
                'data_series' => $data['data_series'],
                'conditionId' => null,
                'faultId' => null,
                'data_payload' => $data['data'],
                'condition_name' => null,
            ];
        }
            // Write to MongoDB
            if ($this->mongoService) {
                // Handle both deviceId (camelCase from real-time sender) and device_id (snake_case)
                $deviceIdFromPayload = $data['deviceId'] ?? $data['device_id'] ?? $deviceId;
                $result = $this->mongoService->saveMeasurementData($deviceIdFromPayload, $measurementData);
                if ($result) {
                    Yii::info("Measurement written to MongoDB successfully", 'mongodb');
                    return [
                        'success' => true,
                        'dataSeriesId' => $measurementData['data_series'],
                        'timestamp' => time(),
                        'deviceId' => $deviceIdFromPayload
                    ];
                } else {
                    Yii::error("Failed to write measurement to MongoDB", 'mongodb');
                    return false;
                }
            } else {
                Yii::error("MongoDB service is not available", 'mongodb');
                return false;
            }
        } catch (\Exception $e) {
            echo "\033[31m[MQTT] Error: " . $e->getMessage() . "\033[0m\n";
            Yii::error("Error processing real time data MQTT message: " . $e->getMessage(), 'mqtt');
            return false;
        }
    }
    
}