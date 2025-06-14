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
use app\models\Device;

class DeviceRegisterController extends Controller
{    /**
     * {@inheritdoc}
     */    public function behaviors()
    {
        return [
            'access' => [
                'class' => AccessControl::class,
                'rules' => [
                    [
                        'allow' => true,
                        'actions' => ['register', 'create'],
                        'roles' => ['?'],
                    ],
                    [
                        'allow' => true,
                        'roles' => ['@'],
                    ],
                ],
            ],
            'verbs' => [
                'class' => VerbFilter::class,
                'actions' => [
                    'register' => ['post'],
                    'create' => ['post'],
                    'update' => ['put', 'post'],
                    'delete' => ['delete'],
                    'list' => ['get'],
                    'view' => ['get'],
                ],
            ],
            'corsFilter' => [
                'class' => \yii\filters\Cors::class,
                'cors' => [
                    'Origin' => ['*'],
                    'Access-Control-Request-Method' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
                    'Access-Control-Request-Headers' => ['*'],
                    'Access-Control-Allow-Credentials' => true,
                ],
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
    }/**
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

            if (!isset($data['deviceId']) || !isset($data['config'])) {
                return [
                    'success' => false,
                    'error' => 'Missing deviceId or config in request body',
                ];
            }

            // Find device by deviceId
            $device = Device::findOne(['device_id' => $data['deviceId']]);
            if (!$device) {
                return [
                    'success' => false,
                    'error' => 'Device not found',
                ];
            }

            // Check access token
            if ($device->access_token !== $accessToken) {
                return [
                    'success' => false,
                    'error' => 'Invalid access token',
                ];
            }

            // Update config and status
            $device->config = json_encode($data['config']);
            $device->status = Device::STATUS_ACTIVE;
            $device->updated_at = time();

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
            $device->updated_at = time();

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
            if (!isset($data['name']) || !isset($data['type'])) {
                return [
                    'success' => false,
                    'error' => 'Missing name or type in request body',
                ];
            }
            $device = new Device();
            $device->device_uuid = Yii::$app->security->generateRandomString(32);
            $device->device_id = Yii::$app->security->generateRandomString(12);
            $device->access_token = Yii::$app->security->generateRandomString(32);
            $device->name = $data['name'];
            $device->type = $data['type'];
            $device->status = Device::STATUS_INACTIVE;
            $device->created_at = time();
            $device->updated_at = time();
            if (!$device->save()) {
                return [
                    'success' => false,
                    'error' => 'Error saving device: ' . Json::encode($device->errors),
                ];
            }
            return [
                'success' => true,
                'deviceId' => $device->device_id,
                'access_token' => $device->access_token,
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