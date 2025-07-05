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
use OpenApi\Attributes as OA;
use app\components\PerformanceLogger;

/**
 * Device Measurement Controller
 * Handles measurement data operations and statistics
 * 
 * @OA\Tag(
 *     name="Device Measurements",
 *     description="Device measurement data operations including batch processing and token management"
 * )
 */

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
     * 
     * @OA\Post(
     *     path="/device-measurement/generate-batch-token",
     *     tags={"Device Measurements"},
     *     summary="Generate batch token for device",
     *     description="Generate a JWT token for batch measurement operations for a specific device",
     *     security={{"BearerAuth": {}}},
     *     @OA\Parameter(ref="#/components/parameters/DeviceIdPath"),
     *     @OA\Response(
     *         response=200,
     *         description="Batch token generated successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="batch_token", type="string", description="JWT batch token"),
     *                 @OA\Property(property="device_id", type="string", example="DEV001"),
     *                 @OA\Property(property="expires_at", type="integer", description="Unix timestamp of expiration"),
     *                 @OA\Property(property="expires_in", type="integer", example=3600, description="Token lifetime in seconds")
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Bad request - Missing deviceId or device not active",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Device not found",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Internal server error",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     )
     * )
     */
    public function actionGenerateBatchToken()
    {
        PerformanceLogger::startLog('generate_batch_token_method', PerformanceLogger::CATEGORY_API, [
            'endpoint' => '/api/device-measurement/generate-batch-token',
            'method' => 'POST'
        ]);
        
        try {
            Yii::$app->response->format = Response::FORMAT_JSON;
            $request = Yii::$app->request;
            
            PerformanceLogger::startLog('generate_batch_token_validation', PerformanceLogger::CATEGORY_VALIDATION);
            // Get device ID from request
            $deviceId = $request->get('deviceId');
            if (!$deviceId) {
                PerformanceLogger::stopLog('generate_batch_token_validation', [
                    'validation_result' => 'failed',
                    'reason' => 'missing_device_id'
                ]);
                PerformanceLogger::stopLog('generate_batch_token_method', [
                    'success' => false,
                    'error' => 'missing_device_id'
                ]);
                Yii::$app->response->statusCode = 400;
                return [
                    'success' => false,
                    'error' => 'Missing deviceId parameter'
                ];
            }
            PerformanceLogger::stopLog('generate_batch_token_validation', [
                'validation_result' => 'passed',
                'device_id' => $deviceId
            ]);
            
            // Validate device exists and is active
            PerformanceLogger::startLog('generate_batch_token_db_query', PerformanceLogger::CATEGORY_DATABASE, [
                'table' => 'devices',
                'operation' => 'find_by_device_id',
                'device_id' => $deviceId
            ]);
            $device = Devices::findByDeviceId($deviceId);
            PerformanceLogger::stopLog('generate_batch_token_db_query', [
                'device_found' => $device !== null,
                'device_id' => $deviceId
            ]);
            
            if (!$device) {
                PerformanceLogger::stopLog('generate_batch_token_method', [
                    'success' => false,
                    'error' => 'device_not_found',
                    'device_id' => $deviceId
                ]);
                Yii::$app->response->statusCode = 404;
                return [
                    'success' => false,
                    'error' => "Device not found: $deviceId"
                ];
            }
            
            PerformanceLogger::startLog('generate_batch_token_business_logic', PerformanceLogger::CATEGORY_BUSINESS_LOGIC, [
                'checking' => 'device_status',
                'device_id' => $deviceId,
                'device_status' => $device->status
            ]);
            if ($device->status !== Devices::STATUS_ACTIVE) {
                PerformanceLogger::stopLog('generate_batch_token_business_logic', [
                    'validation_result' => 'failed',
                    'reason' => 'device_inactive',
                    'device_status' => $device->status
                ]);
                PerformanceLogger::stopLog('generate_batch_token_method', [
                    'success' => false,
                    'error' => 'device_inactive',
                    'device_id' => $deviceId
                ]);
                Yii::$app->response->statusCode = 400;
                return [
                    'success' => false,
                    'error' => "Device $deviceId is not active"
                ];
            }
            PerformanceLogger::stopLog('generate_batch_token_business_logic', [
                'validation_result' => 'passed'
            ]);
            
            // Generate JWT batch token
            PerformanceLogger::startLog('generate_batch_token_jwt_creation', PerformanceLogger::CATEGORY_BUSINESS_LOGIC, [
                'token_type' => 'JWT',
                'algorithm' => 'HS256',
                'expires_in_seconds' => 3600
            ]);
            
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
            PerformanceLogger::stopLog('generate_batch_token_jwt_creation', [
                'token_length' => strlen($batchToken),
                'device_id' => $deviceId
            ]);
            
            Yii::info("Generated batch token for device: $deviceId", 'api.device-measurement');
            
            PerformanceLogger::stopLog('generate_batch_token_method', [
                'success' => true,
                'device_id' => $deviceId,
                'token_expires_at' => $expiresAt
            ]);
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
            PerformanceLogger::stopLog('generate_batch_token_method');
            Yii::error("Error generating batch token: " . $e->getMessage(), 'api.device-measurement');
            Yii::$app->response->statusCode = 500;
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Process batch measurement data
     * 
     * @OA\Post(
     *     path="/device-measurement/phenomen-batch",
     *     tags={"Device Measurements"},
     *     summary="Process batch measurement data",
     *     description="Submit batch measurement data for a device with proper authentication token",
     *     security={{"BatchAuth": {}}},
     *     @OA\RequestBody(
     *         required=true,
     *         description="Batch measurement data",
     *         @OA\JsonContent(
     *             required={"deviceId", "data_series"},
     *             @OA\Property(property="deviceId", type="string", example="DEV001", description="Device identifier"),
     *             @OA\Property(property="data_series", type="array", @OA\Items(ref="#/components/schemas/DataSeries"), description="Array of measurement data series"),
     *             @OA\Property(property="condition_name", type="string", example="normal_operation", description="Optional condition name"),
     *             @OA\Property(property="data", type="object", description="Additional data payload")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Batch data processed successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true)
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Bad request - Invalid JSON or missing required fields",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized - Invalid or missing batch token",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Internal server error",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     )
     * )
     */
    public function actionPhenomenBatch()
    {
        PerformanceLogger::startLog('phenomen_batch_method', PerformanceLogger::CATEGORY_API, [
            'endpoint' => '/api/device-measurement/phenomen-batch',
            'method' => 'POST'
        ]);
        
        try {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $request = Yii::$app->request;
        $body = $request->getRawBody();
        
        PerformanceLogger::startLog('phenomen_batch_json_parsing', PerformanceLogger::CATEGORY_SERIALIZATION, [
            'payload_size_bytes' => strlen($body)
        ]);
        $data = json_decode($body, true);
        PerformanceLogger::stopLog('phenomen_batch_json_parsing', [
            'parsing_successful' => $data !== null,
            'payload_size_bytes' => strlen($body)
        ]);

        if (!$data) {
            PerformanceLogger::stopLog('phenomen_batch_method', [
                'success' => false,
                'error' => 'invalid_json'
            ]);
            Yii::$app->response->statusCode = 400;
            return [
                'success' => false,
                'error' => 'Invalid JSON payload.'
            ];
        }

        // Validate batch token
        PerformanceLogger::startLog('phenomen_batch_token_validation', PerformanceLogger::CATEGORY_AUTHENTICATION, [
            'device_id' => $data['deviceId'] ?? 'unknown'
        ]);
        $this->validateBatchToken($data);
        PerformanceLogger::stopLog('phenomen_batch_token_validation', [
            'validation_successful' => true,
            'device_id' => $data['deviceId'] ?? 'unknown'
        ]);

        PerformanceLogger::startLog('phenomen_batch_data_processing', PerformanceLogger::CATEGORY_BUSINESS_LOGIC, [
            'device_id' => $data['deviceId'] ?? 'unknown',
            'data_channels' => isset($data['data']) ? count($data['data']) : 0,
            'sequence_number' => $data['sequenceNumber'] ?? 'unknown'
        ]);
        $mongoResult = $this->processBatchData($data);
        PerformanceLogger::stopLog('phenomen_batch_data_processing', [
            'processing_successful' => true,
            'device_id' => $data['deviceId'] ?? 'unknown'
        ]);

            PerformanceLogger::stopLog('phenomen_batch_method', [
                'success' => true,
                'device_id' => $data['deviceId'] ?? 'unknown',
                'data_channels' => isset($data['data']) ? count($data['data']) : 0
            ]);
            return [
                'success' => true,
            ];
            
        } catch (\Throwable $e) {
            PerformanceLogger::stopLog('phenomen_batch_method', [
                'success' => false,
                'error' => $e->getMessage(),
                'error_type' => get_class($e)
            ]);
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