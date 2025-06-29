<?php
namespace app\modules\api\controllers;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use app\services\DeviceMeasurementService;
use app\models\Condition;
use app\models\Faults;
use app\models\Devices;
use app\services\MongoDBService;

class DeviceMeasurementController extends Controller
{
    /**
     * @var MongoDBService
     */
    private $mongoService;
    
    /**
     * @inheritdoc
     */
    public function init()
    {
        parent::init();
        
        // Initialize MongoDB service
        try {
            $this->mongoService = new MongoDBService();
            Yii::info("MongoDB service initialized successfully", 'api.device-measurement');
        } catch (\Exception $e) {
            Yii::error("Failed to initialize MongoDB service: " . $e->getMessage(), 'api.device-measurement');
            $this->mongoService = null;
        }
    }
    
    /**
     * @inheritdoc
     */    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['contentNegotiator']['formats']['application/json'] = Response::FORMAT_JSON;
        
        // Add CORS filter with improved configuration
        $behaviors['corsFilter'] = [
            'class' => \yii\filters\Cors::class,
            'cors' => [
                'Origin' => ['http://localhost:3000', 'http://localhost:3001', 'http://172.22.176.1:3000', 'http://172.22.176.1:3001'], // Specific allowed origins
                'Access-Control-Request-Method' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
                'Access-Control-Request-Headers' => ['*'],
                'Access-Control-Allow-Credentials' => true,
                'Access-Control-Max-Age' => 3600, // Cache preflight for 1 hour
                'Access-Control-Expose-Headers' => ['X-Pagination-Current-Page', 'X-Pagination-Page-Count', 'X-Pagination-Per-Page', 'X-Pagination-Total-Count'],
            ],
        ];
        
        return $behaviors;
    }   


    public function actionPhenomenBatch()
    {
        try {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $request = Yii::$app->request;
        $body = $request->getRawBody();
        $data = json_decode($body, true);

        if (!$data) {
            Yii::$app->response->statusCode = 400;
            return [
                'success' => false,
                'error' => 'Invalid JSON payload.'
            ];
        }

        $mongoResult = $this->processBatchData($data);

            return [
                'success' => true,
            ];
            
        } catch (\Throwable $e) {
            Yii::error("Error saving batch measurement: " . $e->getMessage(), 'api.device-measurement');
            Yii::$app->response->statusCode = 500;
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    protected function processBatchData($data)
    {
        $deviceId = $data['deviceId'];
        $device = Devices::findByDeviceId($deviceId);
        if (!$device) {
            throw new \Exception("Device not found: $deviceId");
        }

        $condition = Condition::find()->where(['name' => $data['condition_name']])->one();
        if (!$condition) {
            $fault = Faults::find()
            ->where(['device_id' => $deviceId, 'status' => Faults::STATUS_ACTIVE])
            ->one();
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

        $fault = Faults::find()
            ->where(['device_id' => $deviceId, 'status' => Faults::STATUS_ACTIVE])
            ->one();
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

        // Write to MongoDB if service is available
        if ($this->mongoService !== null) {
            try {
                // Handle both deviceId (camelCase from real-time sender) and device_id (snake_case)
                $deviceIdFromPayload = $data['deviceId'] ?? $data['device_id'] ?? $deviceId;
                
                $result = $this->mongoService->saveMeasurementData($deviceIdFromPayload, $measurementData);
                
                if ($result) {
                    Yii::info("Measurement written to MongoDB successfully", 'mongodb');
                    
                    return [
                        'success' => true,
                        'dataSeriesId' => $measurementData['conditionId'], // Fixed: use conditionId instead of undefined dataSeriesId
                        'timestamp' => time(),
                        'deviceId' => $deviceIdFromPayload
                    ];
                } else {
                    Yii::error("Failed to write measurement to MongoDB", 'mongodb');
                    throw new \Exception("Failed to save measurement to MongoDB");
                }
            } catch (\Exception $e) {
                Yii::error("MongoDB write error: " . $e->getMessage(), 'mongodb');
                throw new \Exception("MongoDB write failed: " . $e->getMessage());
            }
        } else {
            Yii::warning("MongoDB service not available, skipping MongoDB write", 'mongodb');
            throw new \Exception("MongoDB service not available");
        }
    }
}