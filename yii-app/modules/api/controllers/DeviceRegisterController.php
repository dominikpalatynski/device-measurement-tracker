<?php

namespace app\modules\api\controllers;

use Yii;
use yii\web\Controller;
use yii\web\Response;
use yii\filters\AccessControl;
use yii\filters\VerbFilter;
use app\models\Device;
use yii\web\NotFoundHttpException;
use yii\web\ServerErrorHttpException;
use yii\helpers\Json;
use app\models\VerificationToken;

class DeviceRegisterController extends Controller
{
    /**
     * {@inheritdoc}
     */
    public function behaviors()
    {
        return [
            'access' => [
                'class' => AccessControl::class,
                'rules' => [
                    [
                        'allow' => true,
                        'actions' => ['register'],
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
    }

    /**
     * {@inheritdoc}
     */
    public function beforeAction($action)
    {
        // Wyłącz walidację CSRF dla wszystkich akcji API
        $this->enableCsrfValidation = false;
        return parent::beforeAction($action);
    }

    /**
     * Rejestruje nowe urządzenie
     */
    public function actionRegister()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        
        try {
            $data = Json::decode(Yii::$app->request->rawBody);
            
            if (!isset($data['device_name'])) {
                throw new ServerErrorHttpException('Brak wymaganego parametru device_name');
            }

            $device = new Device();
            $device->device_uuid = Yii::$app->security->generateRandomString(32); // Generujemy unikalny UUID
            $device->name = $data['device_name'];
            $device->status = Device::STATUS_INACTIVE;
            $device->created_at = time();
            $device->updated_at = time();

            if (!$device->save()) {
                throw new ServerErrorHttpException('Błąd podczas zapisywania urządzenia: ' . 
                    Json::encode($device->errors));
            }

            $verificationToken = VerificationToken::generate($device->id);
            if (!$verificationToken->save()) {
                throw new ServerErrorHttpException('Błąd podczas generowania tokenu: ' . 
                    Json::encode($verificationToken->errors));
            }

            return [
                'success' => true,
                'device' => $device->attributes,
                'verification_token' => $verificationToken->token,
            ];
        } catch (\Exception $e) {
            Yii::error("Błąd rejestracji urządzenia: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
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
                $device->name = $data['name'];
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
    }

    /**
     * Zwraca listę wszystkich urządzeń
     */
    public function actionList()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        
        try {
            $devices = Device::find()->all();
            return [
                'success' => true,
                'devices' => array_map(function($device) {
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
    }

    /**
     * Zwraca szczegóły konkretnego urządzenia
     */
    public function actionView($id)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        
        try {
            $device = $this->findDevice($id);
            return [
                'success' => true,
                'device' => $device->attributes,
            ];
        } catch (\Exception $e) {
            Yii::error("Błąd pobierania danych urządzenia: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Znajduje urządzenie po ID
     */
    protected function findDevice($id)
    {
        $device = Device::findOne($id);
        if ($device === null) {
            throw new NotFoundHttpException('Urządzenie nie zostało znalezione');
        }
        return $device;
    }
} 