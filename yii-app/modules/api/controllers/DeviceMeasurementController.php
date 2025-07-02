<?php
namespace app\modules\api\controllers;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use yii\web\UnauthorizedHttpException;
use yii\web\BadRequestHttpException;
use app\services\DeviceMeasurementService;
use app\models\Condition;
use app\models\Faults;
use app\models\Devices;
use app\services\MongoDBService;
use app\filters\JwtAuthFilter;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

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
        
        // Add JWT authentication filter
        $behaviors['jwtAuth'] = [
            'class' => JwtAuthFilter::class,
            'except' => ['phenomen-batch'], // Allow batch operations without user auth (uses batch token)
        ];
        
        return $behaviors;
    }   

    /**
     * Generate batch token for device
     */
    public function actionGenerateBatchToken()
    {
        try {
            Yii::$app->response->format = Response::FORMAT_JSON;
            $request = Yii::$app->request;
            
            // Get device ID from request
            $deviceId = $request->get('deviceId');
            if (!$deviceId) {
                Yii::$app->response->statusCode = 400;
                return [
                    'success' => false,
                    'error' => 'Missing deviceId parameter'
                ];
            }
            
            // Validate device exists and is active
            $device = Devices::findByDeviceId($deviceId);
            if (!$device) {
                Yii::$app->response->statusCode = 404;
                return [
                    'success' => false,
                    'error' => "Device not found: $deviceId"
                ];
            }
            
            if ($device->status !== Devices::STATUS_ACTIVE) {
                Yii::$app->response->statusCode = 400;
                return [
                    'success' => false,
                    'error' => "Device $deviceId is not active"
                ];
            }
            
            // Generate JWT batch token
            $secretKey = Yii::$app->params['jwtSecretKey'] ?? 'your-secret-key';
            $issuedAt = time();
            $expiresAt = $issuedAt + 3600; // 1 hour
            
            $payload = [
                'device_id' => $deviceId,
                'purpose' => 'batch_operations',
                'issued_at' => $issuedAt,
                'expires_at' => $expiresAt,
                'iat' => $issuedAt,
                'exp' => $expiresAt
            ];
            
            $batchToken = JWT::encode($payload, $secretKey, 'HS256');
            
            Yii::info("Generated batch token for device: $deviceId", 'api.device-measurement');
            
            return [
                'success' => true,
                'data' => [
                    'batch_token' => $batchToken,
                    'device_id' => $deviceId,
                    'expires_at' => $expiresAt,
                    'expires_in' => 3600
                ]
            ];
            
        } catch (\Throwable $e) {
            Yii::error("Error generating batch token: " . $e->getMessage(), 'api.device-measurement');
            Yii::$app->response->statusCode = 500;
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
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

        // Validate batch token
        $this->validateBatchToken($data);

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

    /**
     * Validate JWT batch token for authentication
     * @param array $data Request payload data
     * @throws UnauthorizedHttpException
     * @throws BadRequestHttpException
     */
    protected function validateBatchToken($data)
    {
        // Get Bearer token from Authorization header
        $authHeader = Yii::$app->request->getHeaders()->get('Authorization');
        if (!$authHeader || !preg_match('/Bearer\s+(.*)$/i', $authHeader, $matches)) {
            throw new UnauthorizedHttpException('Missing or invalid Authorization header. Batch token required.');
        }
        
        $token = $matches[1];
        
        try {
            // Decode JWT token
            $secretKey = Yii::$app->params['jwtSecretKey'] ?? 'your-secret-key';
            $decoded = JWT::decode($token, new Key($secretKey, 'HS256'));
            
            // Convert to array for easier handling
            $payload = (array) $decoded;
            
            // Validate token purpose
            if (!isset($payload['purpose']) || $payload['purpose'] !== 'batch_operations') {
                throw new UnauthorizedHttpException('Invalid token purpose. Batch token required.');
            }
            
            // Validate device ID matches
            if (!isset($payload['device_id'])) {
                throw new UnauthorizedHttpException('Token missing device_id.');
            }
            
            $tokenDeviceId = $payload['device_id'];
            $requestDeviceId = $data['deviceId'] ?? null;
            
            if (!$requestDeviceId) {
                throw new BadRequestHttpException('Missing deviceId in request payload.');
            }
            
            if ($tokenDeviceId !== $requestDeviceId) {
                throw new UnauthorizedHttpException('Token device_id does not match request deviceId.');
            }
            
            // Validate token expiration
            if (isset($payload['expires_at']) && $payload['expires_at'] < time()) {
                throw new UnauthorizedHttpException('Batch token has expired.');
            }
            
            // Validate device exists and is active
            $device = Devices::findByDeviceId($requestDeviceId);
            if (!$device) {
                throw new BadRequestHttpException("Device not found: $requestDeviceId");
            }
            
            if ($device->status !== Devices::STATUS_ACTIVE) {
                throw new UnauthorizedHttpException("Device $requestDeviceId is not active.");
            }
            
            Yii::info("Batch token validated successfully for device: $requestDeviceId", 'api.device-measurement');
            
        } catch (\Firebase\JWT\ExpiredException $e) {
            throw new UnauthorizedHttpException('Batch token has expired.');
        } catch (\Firebase\JWT\SignatureInvalidException $e) {
            throw new UnauthorizedHttpException('Invalid batch token signature.');
        } catch (\Firebase\JWT\BeforeValidException $e) {
            throw new UnauthorizedHttpException('Batch token not yet valid.');
        } catch (\Exception $e) {
            if ($e instanceof UnauthorizedHttpException || $e instanceof BadRequestHttpException) {
                throw $e;
            }
            Yii::error("Batch token validation error: " . $e->getMessage(), 'api.device-measurement');
            throw new UnauthorizedHttpException('Invalid batch token.');
        }
    }

    protected function processBatchData($data)
    {
        $deviceId = $data['deviceId'];
        $device = Devices::findByDeviceId($deviceId);
        if (!$device) {
            throw new \Exception("Device not found: $deviceId");
        }

        if($data['data_series'] == null) {
            throw new \Exception("Data series is required");
        }

        $measurementData = null;

        if(!$data['condition_name'] == null) {
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
        }
        else {
            $measurementData = [
                'data_series' => $data['data_series'],
                'conditionId' => null,
                'faultId' => null,
                'data_payload' => $data['data'],
                'condition_name' => null,
            ];
        }

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