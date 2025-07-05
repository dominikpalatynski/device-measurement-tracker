<?php

namespace app\modules\api\controllers;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use app\models\Devices;
use yii\web\NotFoundHttpException;
use yii\web\ServerErrorHttpException;
use yii\helpers\Json;
use app\models\VerificationToken;
use yii\filters\AccessControl;
use yii\filters\VerbFilter;
use app\filters\JwtAuthFilter;
use app\components\PerformanceLogger;

/**
 * Device Registration and Management Controller
 * Handles device CRUD operations, activation/deactivation, and live fault monitoring
 */

class DeviceRegisterController extends Controller
{
    /**
     * @var PerformanceLogger Performance logging component
     */
    private $performanceLogger;

    /**
     * Initialize the controller and performance logger
     */
    public function init()
    {
        parent::init();
        $this->performanceLogger = new PerformanceLogger();
    }

    /**
     * {@inheritdoc}
     */    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['contentNegotiator']['formats']['application/json'] = Response::FORMAT_JSON;
        
        // Add JWT authentication filter
        $behaviors['jwtAuth'] = [
            'class' => JwtAuthFilter::class,
            'except' => ['test', 'register'], // Public endpoints
        ];
        
        // Add HTTP method filter
        $behaviors['verbs'] = [
            'class' => \yii\filters\VerbFilter::class,
            'actions' => [
                'register' => ['POST', 'OPTIONS'],
                'create' => ['POST', 'OPTIONS'],
                'update' => ['PUT', 'PATCH', 'OPTIONS'],
                'delete' => ['DELETE', 'OPTIONS'],
                'list' => ['GET', 'OPTIONS'],
                'view' => ['GET', 'OPTIONS'],
                'activate' => ['POST', 'OPTIONS'],
                'deactivate' => ['POST', 'OPTIONS'],
                'regenerate-token' => ['POST', 'OPTIONS'],
                'test' => ['GET', 'OPTIONS'],
                'live-fault' => ['GET', 'POST', 'DELETE'],
                'start-condition' => ['POST'],
                'stop-condition' => ['POST'],
            ],
        ];
        
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
    
    /**
     * @OA\Get(
     *     path="/device/test",
     *     tags={"Devices"},
     *     summary="Test device controller",
     *     description="Simple test endpoint to verify controller is working",
     *     @OA\Response(
     *         response=200,
     *         description="Controller test successful",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="DeviceRegisterController is working"),
     *             @OA\Property(property="timestamp", type="string", format="date-time"),
     *             @OA\Property(property="controller", type="string")
     *         )
     *     )
     * )
     * 
     * Simple test endpoint to verify controller is working
     */
    public function actionTest()
    {
        Yii::info("DeviceRegister test endpoint called", 'api.device-register');
        
        return [
            'success' => true,
            'message' => 'DeviceRegisterController is working',
            'timestamp' => date('Y-m-d H:i:s'),
            'controller' => static::class,
        ];
    }

    /**
     * @OA\Post(
     *     path="/device/regenerate-token",
     *     tags={"Devices"},
     *     summary="Regenerate device verification token",
     *     description="Generate a new verification token for an inactive device",
     *     security={{"BearerAuth": {}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"deviceId"},
     *             @OA\Property(property="deviceId", type="string", example="DEV001", description="Device ID to regenerate token for")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Token regenerated successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="New verification token generated successfully"),
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="device_id", type="string", example="DEV001"),
     *                 @OA\Property(property="verification_token", type="string", example="abc123def456"),
     *                 @OA\Property(property="device_name", type="string", example="Temperature Sensor 1"),
     *                 @OA\Property(property="device_type", type="string", example="sensor"),
     *                 @OA\Property(property="status", type="string", example="inactive"),
     *                 @OA\Property(property="expiration_date", type="integer", example=1672531200)
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Bad request - Missing deviceId or device not awaiting verification",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Device not found",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=405,
     *         description="Method not allowed",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     )
     * )
     * 
     * Regenerates verification token for a device
     */
    public function actionRegenerateToken()
    {
        Yii::info("Device token regeneration endpoint called", 'api.device-register');
        
        // Ensure this is only accessible via POST
        if (!Yii::$app->request->isPost) {
            Yii::$app->response->statusCode = 405;
            return [
                'success' => false,
                'error' => 'Method not allowed. Use POST to regenerate token.',
                'allowed_methods' => ['POST']
            ];
        }
        
        try {
            // Parse JSON body
            $data = Json::decode(Yii::$app->request->rawBody);

            if (!isset($data['deviceId'])) {
                return [
                    'success' => false,
                    'error' => 'Missing deviceId in request body',
                ];
            }

            // Find device by deviceId
            $device = Devices::findOne(['device_id' => $data['deviceId']]);
            if (!$device) {
                return [
                    'success' => false,
                    'error' => 'Device not found',
                ];
            }

            // Check if device is inactive (awaiting verification)
            if ($device->status !== Devices::STATUS_INACTIVE) {
                return [
                    'success' => false,
                    'error' => 'Device is not awaiting verification',
                ];
            }

            // Find existing verification token
            $existingToken = VerificationToken::findOne(['device_id' => $data['deviceId']]);
            
            if ($existingToken) {
                // Mark existing token as used/expired
                if(!$existingToken->delete()){
                    return [
                        'success' => false,
                        'error' => 'Error deleting existing verification token: ' . Json::encode($existingToken->errors),
                    ];
                }
            }

            // Create new verification token
            $newToken = new VerificationToken();
            $newToken->token = Yii::$app->security->generateRandomString(10);
            $newToken->expiration_date = time() + 3600; // 1 hour expiration
            $newToken->device_id = $device->device_id;
            $newToken->used = false;
            $newToken->created_at = time();
            $newToken->updated_at = time();

            if (!$newToken->save()) {
                return [
                    'success' => false,
                    'error' => 'Error creating new verification token: ' . Json::encode($newToken->errors),
                ];
            }

            return [
                'success' => true,
                'data' => [
                    'device_id' => $device->device_id,
                    'verification_token' => $newToken->token,
                    'device_name' => $device->device_name,
                    'device_type' => $device->device_type,
                    'status' => $device->status,
                    'expiration_date' => $newToken->expiration_date,
                ],
                'message' => 'New verification token generated successfully',
            ];

        } catch (\Exception $e) {
            Yii::error("Token regeneration error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        } catch (\Throwable $e) {
            Yii::error("Critical token regeneration error: " . $e->getMessage() . "\n" . $e->getTraceAsString());
            Yii::$app->response->statusCode = 500;
            return [
                'success' => false,
                'error' => 'Unexpected error during token regeneration',
            ];
        }
    }    /**
     * @OA\Post(
     *     path="/device/register",
     *     tags={"Devices"},
     *     summary="Register a new device",
     *     description="Register a new IoT device in the system",
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"device_id","device_name","device_type"},
     *             @OA\Property(property="device_id", type="string", example="DEV001"),
     *             @OA\Property(property="device_name", type="string", example="Temperature Sensor 1"),
     *             @OA\Property(property="device_type", type="string", example="sensor"),
     *             @OA\Property(property="location", type="string", example="Building A, Room 101"),
     *             @OA\Property(property="description", type="string", example="IoT temperature monitoring device")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Device registered successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Device registered successfully"),
     *             @OA\Property(property="data", ref="#/components/schemas/Device"),
     *             @OA\Property(property="verification_token", type="string", example="abc123def456")
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Validation error",
     *         @OA\JsonContent(ref="#/components/schemas/ValidationErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=409,
     *         description="Device already exists",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     )
     * )
     * 
     * Rejestruje nowe urządzenie
     */
    public function actionRegister()
    {
        Yii::info("Device registration endpoint called via " . Yii::$app->request->method, 'api.device-register');
        // Ensure this is only accessible via POST
        if (!Yii::$app->request->isPost) {
            Yii::$app->response->statusCode = 405;
            return [
                'success' => false,
                'error' => 'Method not allowed. Use POST to register a device.',
                'allowed_methods' => ['POST']
            ];
        }
        
        try {
            // Get Bearer token from header
            $authHeader = Yii::$app->request->getHeaders()->get('Authorization');
            if (!$authHeader || !preg_match('/Bearer\s(\S+)/', $authHeader, $matches)) {
                return [
                    'success' => false,
                    'error' => 'Missing or invalid Authorization header',
                ];
            }
            $accessToken = $matches[1];

            // Parse JSON body
            $data = Json::decode(Yii::$app->request->rawBody);

            if (!isset($data['deviceId'])) {
                return [
                    'success' => false,
                    'error' => 'Missing deviceId  in request body',
                ];
            }

            // Find device by deviceId
            $device = Devices::findOne(['device_id' => $data['deviceId']]);
            if (!$device) {
                return [
                    'success' => false,
                    'error' => 'Device not found',
                ];
            }
            $verification_token = VerificationToken::findOne(['device_id' => $data['deviceId'], 'used' => false]);
            if (!$verification_token) {
                return [
                    'success' => false,
                    'error' => 'Verification token not found',
                ];
            }
            if ($verification_token->token !== $accessToken) {
                return [
                    'success' => false,
                    'error' => 'Invalid access token',
                ];
            }
            if ($verification_token->used) {
                return [
                    'success' => false,
                    'error' => 'Verification token already used',
                ];
            }
            $verification_token->used = true;
            $verification_token->updated_at = time();
            if (!$verification_token->save()) {
                return [
                    'success' => false,
                    'error' => 'Error updating verification token: ' . Json::encode($verification_token->errors),
                ];
            }
 
            $device->status = Devices::STATUS_ACTIVE;
            $device->last_updated = new \yii\db\Expression('NOW()');

            if (!$device->save()) {
                return [
                    'success' => false,
                    'error' => 'Error updating device: ' . Json::encode($device->errors),
                ];
            }

            return [
                'success' => true,
                'device' => $device->attributes,
            ];
        } catch (\Exception $e) {
            Yii::error("Device registration error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        } catch (\Throwable $e) {
            Yii::error("Krytyczny błąd rejestracji urządzenia: " . $e->getMessage() . "\n" . $e->getTraceAsString());
            Yii::$app->response->statusCode = 500;
            return [
                'success' => false,
                'error' => 'Wystąpił nieoczekiwany błąd podczas rejestracji urządzenia',
            ];
        }
    }

    /**
     * @OA\Put(
     *     path="/device/update/{id}",
     *     tags={"Devices"},
     *     summary="Update device information",
     *     description="Update device name and status",
     *     security={{"BearerAuth": {}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Device ID",
     *         @OA\Schema(type="string")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="name", type="string", example="Updated Device Name"),
     *             @OA\Property(property="status", type="string", enum={"active", "inactive"}, example="active")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Device updated successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="device", ref="#/components/schemas/Device")
     *         )
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden - No permission to update this device",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Device not found",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Server error during update",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     )
     * )
     * 
     * Aktualizuje dane urządzenia
     */
    public function actionUpdate($id)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        
        try {
            $device = $this->checkDeviceOwnership($id);
            
            $data = Json::decode(Yii::$app->request->rawBody);

            if (isset($data['name'])) {
                $device->device_name = $data['name'];
            }
            if (isset($data['status'])) {
                $device->status = $data['status'];
            }
            // $device->updated_at = time();

            if (!$device->save()) {
                throw new ServerErrorHttpException('Błąd podczas aktualizacji urządzenia: ' . 
                    Json::encode($device->errors));
            }

            return [
                'success' => true,
                'device' => $device->attributes,
            ];
        } catch (\Exception $e) {
            Yii::error("Błąd aktualizacji urządzenia: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * @OA\Delete(
     *     path="/device/delete/{id}",
     *     tags={"Devices"},
     *     summary="Delete device",
     *     description="Delete a device from the system",
     *     security={{"BearerAuth": {}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="path",
     *         required=true,
     *         description="Device ID",
     *         @OA\Schema(type="string")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Device deleted successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Urządzenie zostało usunięte")
     *         )
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden - No permission to delete this device",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Device not found",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Error deleting device",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     )
     * )
     * 
     * Usuwa urządzenie
     */
    public function actionDelete($id)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        
        try {
            $device = $this->checkDeviceOwnership($id);
            
            if (!$device->delete()) {
                throw new ServerErrorHttpException('Błąd podczas usuwania urządzenia');
            }

            return [
                'success' => true,
                'message' => 'Urządzenie zostało usunięte',
            ];
        } catch (\Exception $e) {
            Yii::error("Błąd usuwania urządzenia: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }    /**
     * @OA\Get(
     *     path="/device/list",
     *     tags={"Devices"},
     *     summary="Get list of devices",
     *     description="Retrieve all devices (admin) or user's own devices (regular user)",
     *     security={{"BearerAuth":{}}},
     *     @OA\Response(
     *         response=200,
     *         description="Device list retrieved successfully",
     *         @OA\JsonContent(ref="#/components/schemas/DeviceList")
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Internal server error",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     )
     * )
     * 
     * Zwraca listę wszystkich urządzeń
     */
    public function actionList()
    {
        Yii::info("Device list endpoint called", 'api.device-register');
        
        try {
            $user = Yii::$app->user->identity;
            
            // Admins can see all devices, regular users only see their own
            if ($user->isAdmin()) {
                $devices = Devices::find()->all();
            } else {
                $devices = Devices::findByOwner($user->id)->all();
            }
            
            return [
                'success' => true,
                'data' => array_map(function($device) {
                    return $device->attributes;
                }, $devices),
            ];
        } catch (\Exception $e) {
            Yii::error("Błąd pobierania listy urządzeń: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }    /**
     * @OA\Get(
     *     path="/device/view",
     *     tags={"Devices"},
     *     summary="Get device details",
     *     description="Retrieve details of a specific device",
     *     security={{"BearerAuth": {}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="query",
     *         required=true,
     *         description="Device ID",
     *         @OA\Schema(type="string")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Device details retrieved successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="data", ref="#/components/schemas/Device")
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Bad request - Missing required parameter",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden - No permission to view this device",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Device not found",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     )
     * )
     * 
     * Zwraca szczegóły konkretnego urządzenia
     */
    public function actionView()
    {
        Yii::info("Device view endpoint called", 'api.device-register');
        
        try {
            $id = Yii::$app->request->get('id');
            if (!$id) {
                throw new ServerErrorHttpException('Missing required parameter: id');
            }
            
            $device = $this->checkDeviceOwnership($id);
            
            return [
                'success' => true,
                'data' => $device->attributes,
            ];
        } catch (\Exception $e) {
            Yii::error("Błąd pobierania danych urządzenia: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }    /**
     * @OA\Post(
     *     path="/device/activate",
     *     tags={"Devices"},
     *     summary="Activate device",
     *     description="Activate a device to enable measurement collection",
     *     security={{"BearerAuth": {}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="query",
     *         required=true,
     *         description="Device ID",
     *         @OA\Schema(type="string")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Device activated successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="data", ref="#/components/schemas/Device"),
     *             @OA\Property(property="message", type="string", example="Device activated successfully")
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Bad request - Missing required parameter",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden - No permission to activate this device",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Device not found",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Error activating device",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     )
     * )
     * 
     * Activate a device
     */
    public function actionActivate()
    {
        try {
            $id = Yii::$app->request->get('id');
            if (!$id) {
                throw new ServerErrorHttpException('Missing required parameter: id');
            }
            
            $device = $this->checkDeviceOwnership($id);
            
            $device->status = Devices::STATUS_ACTIVE;
            
            if (!$device->save()) {
                throw new ServerErrorHttpException('Error activating device: ' . 
                    Json::encode($device->errors));
            }
            
            return [
                'success' => true,
                'data' => $device->attributes,
                'message' => 'Device activated successfully',
            ];
        } catch (\Exception $e) {
            Yii::error("Error activating device: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * @OA\Post(
     *     path="/device/create",
     *     tags={"Devices"},
     *     summary="Create a new device",
     *     description="Create a new device (frontend endpoint)",
     *     security={{"BearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"device_name","device_type"},
     *             @OA\Property(property="device_name", type="string", example="Temperature Sensor 1"),
     *             @OA\Property(property="device_type", type="string", example="sensor")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Device created successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="device_id", type="string", example="DEV001"),
     *                 @OA\Property(property="verification_token", type="string", example="abc123def456"),
     *                 @OA\Property(property="device_name", type="string", example="Temperature Sensor 1"),
     *                 @OA\Property(property="device_type", type="string", example="sensor"),
     *                 @OA\Property(property="status", type="string", example="Inactive"),
     *                 @OA\Property(property="owner_id", type="integer", example=1)
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Validation error",
     *         @OA\JsonContent(ref="#/components/schemas/ValidationErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     )
     * )
     * 
     * Tworzy nowe urządzenie (endpoint dla frontendu)
     */
    public function actionCreate()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        try {
            $data = Json::decode(Yii::$app->request->rawBody);
            if (!isset($data['device_name']) || !isset($data['device_type'])) {
                return [
                    'success' => false,
                    'error' => 'Missing name or type in request body',
                ];
            }

            $user = Yii::$app->user->identity;
            
            $device = new Devices();
            $device->device_id = Yii::$app->security->generateRandomString(12);
            $device->device_name = $data['device_name'];
            $device->device_type = $data['device_type'];
            $device->owner_id = $user->id; // Set the current user as owner
            $device->status = Devices::STATUS_INACTIVE;
            $device->registration_date = new \yii\db\Expression('NOW()');
            $device->last_updated = new \yii\db\Expression('NOW()');
            
            if (!$device->save()) {
                return [
                    'success' => false,
                    'error' => 'Error saving device: ' . Json::encode($device->errors),
                ];
            }

            $verification_token = new VerificationToken();
            $verification_token->token = Yii::$app->security->generateRandomString(10);
            $verification_token->expiration_date = time() + 3600;
            $verification_token->device_id = $device->device_id;
            $verification_token->used = false;
            $verification_token->created_at = time();
            $verification_token->updated_at = time();
            if (!$verification_token->save()) {
                return [
                    'success' => false,
                    'error' => 'Error saving verification token: ' . Json::encode($verification_token->errors),
                ];
            }

            return [
                'success' => true,
                'data' => [
                    'device_id' => $device->device_id,
                    'verification_token' => $verification_token->token,
                    'device_name' => $device->device_name,
                    'device_type' => $device->device_type,
                    'status' => $device->status,
                    'owner_id' => $device->owner_id,
                ],
            ];
        } catch (\Exception $e) {
            Yii::error("Device create error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * @OA\Post(
     *     path="/device/deactivate",
     *     tags={"Devices"},
     *     summary="Deactivate device",
     *     description="Deactivate a device to stop measurement collection",
     *     security={{"BearerAuth": {}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="query",
     *         required=true,
     *         description="Device ID",
     *         @OA\Schema(type="string")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Device deactivated successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="data", ref="#/components/schemas/Device"),
     *             @OA\Property(property="message", type="string", example="Device deactivated successfully")
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Bad request - Missing required parameter",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden - No permission to deactivate this device",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Device not found",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Error deactivating device",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     )
     * )
     * 
     * Deactivate a device
     */
    public function actionDeactivate()
    {
        try {
            $id = Yii::$app->request->get('id');
            if (!$id) {
                throw new ServerErrorHttpException('Missing required parameter: id');
            }
            
            $device = $this->checkDeviceOwnership($id);
            
            $device->status = Devices::STATUS_INACTIVE;
            
            if (!$device->save()) {
                throw new ServerErrorHttpException('Error deactivating device: ' . 
                    Json::encode($device->errors));
            }
            
            return [
                'success' => true,
                'data' => $device->attributes,
                'message' => 'Device deactivated successfully',
            ];
        } catch (\Exception $e) {
            Yii::error("Error deactivating device: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Check if user owns device or is admin
     */
    private function checkDeviceOwnership($deviceId)
    {
        $device = Devices::findOne(['device_id' => $deviceId]);
        
        if (!$device) {
            throw new NotFoundHttpException('Device not found.');
        }

        $user = Yii::$app->user->identity;
        
        // Admin can access all devices
        if ($user->isAdmin()) {
            return $device;
        }

        // Check ownership
        if ($device->owner_id !== $user->id) {
            throw new \yii\web\ForbiddenHttpException('You do not have permission to access this device.');
        }

        return $device;
    }

    /**
     * Znajduje urządzenie po ID lub UUID
     */
    protected function findDevice($id)    {
        // Try to find by device_id
        $device = Devices::findByDeviceId($id);
        
        if ($device === null) {
            throw new NotFoundHttpException('Urządzenie nie zostało znalezione');
        }
        return $device;
    }

    /**
     * @OA\Get(
     *     path="/devices/{deviceId}/live-fault",
     *     tags={"Devices", "Faults"},
     *     summary="Get live fault for device",
     *     description="Get current active live fault for a specific device",
     *     security={{"BearerAuth":{}}},
     *     @OA\Parameter(ref="#/components/parameters/DeviceIdPath"),
     *     @OA\Response(
     *         response=200,
     *         description="Live fault retrieved successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="data", ref="#/components/schemas/LiveFault")
     *         )
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="No active live fault found",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     )
     * )
     * @OA\Post(
     *     path="/devices/{deviceId}/live-fault",
     *     tags={"Devices", "Faults"},
     *     summary="Start live fault for device",
     *     description="Start a new live fault for real-time data collection",
     *     security={{"BearerAuth":{}}},
     *     @OA\Parameter(ref="#/components/parameters/DeviceIdPath"),
     *     @OA\RequestBody(
     *         required=false,
     *         @OA\JsonContent(
     *             @OA\Property(property="name", type="string", example="Live Fault - Temperature Monitoring")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Live fault started successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="data", ref="#/components/schemas/LiveFault")
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Device already has active live fault",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     )
     * )
     * @OA\Delete(
     *     path="/devices/{deviceId}/live-fault",
     *     tags={"Devices", "Faults"},
     *     summary="Stop live fault for device",
     *     description="Stop the active live fault and all associated conditions",
     *     security={{"BearerAuth":{}}},
     *     @OA\Parameter(ref="#/components/parameters/DeviceIdPath"),
     *     @OA\Response(
     *         response=200,
     *         description="Live fault stopped successfully",
     *         @OA\JsonContent(ref="#/components/schemas/SuccessResponse")
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="No active live fault found",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     )
     * )
     * 
     * Handle live fault operations for a device
     * GET/POST/DELETE /api/devices/{deviceId}/live-fault
     */
    public function actionLiveFault($deviceId)
    {
        $request = Yii::$app->request;
        
        if ($request->isGet) {
            return $this->getLiveFault($deviceId);
        } elseif ($request->isPost) {
            return $this->startLiveFault($deviceId);
        } elseif ($request->isDelete) {
            return $this->stopLiveFault($deviceId);
        }
        
        throw new \yii\web\BadRequestHttpException('Method not allowed');
    }

    /**
     * Get current live fault for a device
     */
    protected function getLiveFault($deviceId)
    {
        $device = $this->findDevice($deviceId);
        
        $liveFault = \app\models\Faults::findActiveByDevice($deviceId);

        if (!$liveFault) {
            return [
                'success' => false,
                'message' => 'No active live fault found for this device',
                'data' => null
            ];
        }

        // Get current active condition
        $currentCondition = \app\models\Condition::find()
            ->where(['fault_id' => $liveFault->fault_id, 'status' => \app\models\Condition::STATUS_ACTIVE])
            ->one();

        return [
            'success' => true,
            'data' => [
                'fault_id' => $liveFault->fault_id,
                'device_id' => $liveFault->device_id,
                'duration' => $liveFault->getDuration(),
                'conditions_count' => \app\models\Condition::find()->where(['fault_id' => $liveFault->fault_id])->count(),
                'current_condition' => $currentCondition ? [
                    'condition_id' => $currentCondition->condition_id,
                    'name' => $currentCondition->name,
                    'description' => $currentCondition->description,
                    'status' => $currentCondition->status,
                    'duration' => time() - strtotime($currentCondition->start_time),
                ] : null,
                'start_time' => $liveFault->start_time,
                'end_time' => $liveFault->end_time,
            ]
        ];
    }

    /**
     * Start a live fault
     */
    protected function startLiveFault($deviceId)
    {
        $device = $this->findDevice($deviceId);
        
        // Check if device is active
        if ($device->status !== 'Active') {
            throw new \yii\web\BadRequestHttpException('Device must be active to start a live fault');
        }

        // Check if there's already an active live fault
        $existingLive = \app\models\Faults::findActiveByDevice($deviceId);

        if ($existingLive) {
            throw new \yii\web\BadRequestHttpException('Device already has an active live fault');
        }

        $data = Json::decode(Yii::$app->request->rawBody);
        $faultName = $data['name'] ?? 'Live Fault - ' . date('Y-m-d H:i:s');

        $transaction = Yii::$app->db->beginTransaction();
        try {
            $fault = new \app\models\Faults();
            $fault->fault_id = uniqid('flt_');
            $fault->fault_name = $faultName;
            $fault->description = 'Live fault for real-time data collection';
            $fault->device_id = $deviceId;
            $fault->status = \app\models\Faults::STATUS_ACTIVE;
            $fault->start_time = date('Y-m-d H:i:s');

            if (!$fault->save()) {
                throw new \yii\web\ServerErrorHttpException('Failed to create fault: ' . Json::encode($fault->errors));
            }

            $transaction->commit();

            return [
                'success' => true,
                'data' => [
                    'fault_id' => $fault->fault_id,
                    'device_id' => $deviceId,
                    'duration' => 0,
                    'conditions_count' => 0,
                    'current_condition' => null,
                    'start_time' => $fault->start_time,
                    'end_time' => $fault->end_time,
                ]
            ];

        } catch (\Exception $e) {
            $transaction->rollBack();
            throw new \yii\web\ServerErrorHttpException('Failed to start live fault: ' . $e->getMessage());
        }
    }

    /**
     * Stop a live fault
     */
    protected function stopLiveFault($deviceId)
    {
        $device = $this->findDevice($deviceId);
        
        $liveFault = \app\models\Faults::findActiveByDevice($deviceId);

        if (!$liveFault) {
            throw new \yii\web\NotFoundHttpException('No active live fault found for this device');
        }

        $transaction = Yii::$app->db->beginTransaction();
        try {
            // Deactivate any active conditions
            \app\models\Condition::updateAll(
                ['status' => \app\models\Condition::STATUS_INACTIVE, 'end_time' => date('Y-m-d H:i:s')],
                ['fault_id' => $liveFault->fault_id, 'status' => \app\models\Condition::STATUS_ACTIVE]
            );

            // Deactivate the fault
            $fault = \app\models\Faults::findOne($liveFault->fault_id);
            if ($fault) {
                $fault->status = \app\models\Faults::STATUS_INACTIVE;
                $fault->end_time = date('Y-m-d H:i:s');
                $fault->save();
            }

            $transaction->commit();

            return [
                'success' => true,
                'message' => 'Live fault stopped successfully'
            ];

        } catch (\Exception $e) {
            $transaction->rollBack();
            throw new \yii\web\ServerErrorHttpException('Failed to stop live fault: ' . $e->getMessage());
        }
    }

    /**
     * @OA\Post(
     *     path="/device/{deviceId}/start-condition",
     *     tags={"Devices", "Conditions"},
     *     summary="Start condition for device",
     *     description="Start a new condition for an active fault on a device",
     *     security={{"BearerAuth": {}}},
     *     @OA\Parameter(ref="#/components/parameters/DeviceIdPath"),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             @OA\Property(property="name", type="string", example="High Temperature Condition"),
     *             @OA\Property(property="description", type="string", example="Temperature monitoring condition")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Condition started successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(
     *                 property="data",
     *                 type="object",
     *                 @OA\Property(property="condition_id", type="string", example="cnd_12345"),
     *                 @OA\Property(property="name", type="string", example="High Temperature Condition"),
     *                 @OA\Property(property="description", type="string", example="Temperature monitoring condition"),
     *                 @OA\Property(property="fault_id", type="string", example="flt_67890"),
     *                 @OA\Property(property="status", type="string", example="active"),
     *                 @OA\Property(property="start_time", type="string", format="date-time"),
     *                 @OA\Property(property="duration", type="integer", example=0)
     *             )
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="No active fault found for device",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Device not found",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Failed to create condition",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     )
     * )
     * 
     * Start a condition for a device
     * POST /api/devices/{deviceId}/start-condition
     */
    public function actionStartCondition($deviceId)
    {
        $device = $this->findDevice($deviceId);
        
        $data = Json::decode(Yii::$app->request->rawBody);
        $conditionName = $data['name'] ?? 'New Condition';
        $description = $data['description'] ?? '';

        // Find active fault for device
        $activeFault = \app\models\Faults::findActiveByDevice($deviceId);
        if (!$activeFault) {
            throw new \yii\web\BadRequestHttpException('No active fault found for this device. Start a live fault first.');
        }

        $transaction = Yii::$app->db->beginTransaction();
        try {
            // Deactivate any existing active condition for this fault
            \app\models\Condition::updateAll(
                ['status' => \app\models\Condition::STATUS_INACTIVE, 'end_time' => date('Y-m-d H:i:s')],
                ['fault_id' => $activeFault->fault_id, 'status' => \app\models\Condition::STATUS_ACTIVE]
            );

            // Create new condition
            $condition = new \app\models\Condition();
            $condition->condition_id = uniqid('cnd_');
            $condition->name = $conditionName;
            $condition->description = $description;
            $condition->fault_id = $activeFault->fault_id;
            $condition->status = \app\models\Condition::STATUS_ACTIVE;
            $condition->start_time = date('Y-m-d H:i:s');

            if (!$condition->save()) {
                throw new \yii\web\ServerErrorHttpException('Failed to create condition: ' . Json::encode($condition->errors));
            }

            $transaction->commit();

            return [
                'success' => true,
                'data' => [
                    'condition_id' => $condition->condition_id,
                    'name' => $condition->name,
                    'description' => $condition->description,
                    'fault_id' => $condition->fault_id,
                    'status' => $condition->status,
                    'start_time' => $condition->start_time,
                    'duration' => 0,
                ]
            ];

        } catch (\Exception $e) {
            $transaction->rollBack();
            throw new \yii\web\ServerErrorHttpException('Failed to start condition: ' . $e->getMessage());
        }
    }

    /**
     * @OA\Post(
     *     path="/device/{deviceId}/stop-condition",
     *     tags={"Devices", "Conditions"},
     *     summary="Stop condition for device",
     *     description="Stop an active condition on a device",
     *     security={{"BearerAuth": {}}},
     *     @OA\Parameter(ref="#/components/parameters/DeviceIdPath"),
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"condition_id"},
     *             @OA\Property(property="condition_id", type="string", example="cnd_12345", description="ID of the condition to stop")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Condition stopped successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Condition stopped successfully")
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Bad request - Missing condition_id",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Active condition not found",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Failed to stop condition",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     )
     * )
     * 
     * Stop a condition
     * POST /api/devices/{deviceId}/stop-condition
     */
    public function actionStopCondition($deviceId)
    {
        $device = $this->findDevice($deviceId);
        
        $data = Json::decode(Yii::$app->request->rawBody);
        $conditionId = $data['condition_id'] ?? null;

        if (!$conditionId) {
            throw new \yii\web\BadRequestHttpException('Condition ID is required');
        }

        // Find the condition by condition_id and ensure it belongs to a fault for this device
        $condition = \app\models\Condition::find()
            ->alias('c')
            ->leftJoin('faults f', 'c.fault_id = f.fault_id')
            ->where(['c.condition_id' => $conditionId, 'f.device_id' => $deviceId, 'c.status' => \app\models\Condition::STATUS_ACTIVE])
            ->one();

        if (!$condition) {
            throw new \yii\web\NotFoundHttpException('Active condition not found');
        }

        $condition->status = \app\models\Condition::STATUS_INACTIVE;
        $condition->end_time = date('Y-m-d H:i:s');

        if (!$condition->save()) {
            throw new \yii\web\ServerErrorHttpException('Failed to stop condition: ' . Json::encode($condition->errors));
        }

        return [
            'success' => true,
            'message' => 'Condition stopped successfully'
        ];
    }
}