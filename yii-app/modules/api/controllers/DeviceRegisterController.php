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

class DeviceRegisterController extends Controller
{    /**
     * {@inheritdoc}
     */    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['contentNegotiator']['formats']['application/json'] = Response::FORMAT_JSON;
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
    }    /**
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

            // Check if device is in pending registration status
            if ($device->status !== Devices::STATUS_PENDING) {
                return [
                    'success' => false,
                    'error' => 'Device is not in pending registration status',
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
     * Aktualizuje dane urządzenia
     */
    public function actionUpdate($id)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        
        try {
            $device = $this->findDevice($id);
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
     * Usuwa urządzenie
     */
    public function actionDelete($id)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        
        try {
            $device = $this->findDevice($id);
            
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
     * Zwraca listę wszystkich urządzeń
     */
    public function actionList()
    {
        Yii::info("Device list endpoint called", 'api.device-register');
        
        try {
            $devices = Devices::find()->all();
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
            
            $device = $this->findDevice($id);
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
     * Activate a device
     */
    public function actionActivate()
    {
        try {
            $id = Yii::$app->request->get('id');
            if (!$id) {
                throw new ServerErrorHttpException('Missing required parameter: id');
            }
            
            $device = $this->findDevice($id);
            
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

            $device = new Devices();
            $device->device_id = Yii::$app->security->generateRandomString(12);
            $device->device_name = $data['device_name'];
            $device->device_type = $data['device_type'];
            $device->status = Devices::STATUS_PENDING;
            new \yii\db\Expression('NOW()');
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
     * Znajduje urządzenie po ID
     */
    public function actionDeactivate()
    {
        try {
            $id = Yii::$app->request->get('id');
            if (!$id) {
                throw new ServerErrorHttpException('Missing required parameter: id');
            }
            
            $device = $this->findDevice($id);
            
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
}