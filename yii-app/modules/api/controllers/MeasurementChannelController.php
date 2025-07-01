<?php

namespace app\modules\api\controllers;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use yii\web\NotFoundHttpException;
use yii\web\ServerErrorHttpException;
use yii\helpers\Json;
use app\models\MeasurementChannel;
use app\models\Devices;
use app\filters\JwtAuthFilter;

class MeasurementChannelController extends Controller
{
    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['contentNegotiator']['formats']['application/json'] = Response::FORMAT_JSON;
        
        // Add JWT authentication filter
        $behaviors['jwtAuth'] = [
            'class' => JwtAuthFilter::class,
            'except' => ['test'], // Public endpoints
        ];
        
        $behaviors['verbs'] = [
            'class' => \yii\filters\VerbFilter::class,
            'actions' => [
                'create' => ['POST'],
                'update' => ['PUT', 'PATCH'],
                'delete' => ['DELETE'],
                'list' => ['GET'],
                'view' => ['GET'],
                'test' => ['GET'],
            ],
        ];
        $behaviors['corsFilter'] = [
            'class' => \yii\filters\Cors::class,
            'cors' => [
                'Origin' => ['http://localhost:3000', 'http://localhost:3001', 'http://172.22.176.1:3000', 'http://172.22.176.1:3001'],
                'Access-Control-Request-Method' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
                'Access-Control-Request-Headers' => ['*'],
                'Access-Control-Allow-Credentials' => true,
                'Access-Control-Max-Age' => 3600,
            ],
        ];
        return $behaviors;
    }

    /**
     * List all measurement channels (filtered by device ownership)
     */
    public function actionList()
    {
        try {
            $user = Yii::$app->user->identity;
            
            if ($user->isAdmin()) {
                // Admin can see all channels
                $channels = MeasurementChannel::find()->all();
            } else {
                // Regular users only see channels from their devices
                $userDeviceIds = Devices::find()
                    ->select('device_id')
                    ->where(['owner_id' => $user->id])
                    ->column();
                    
                $channels = MeasurementChannel::find()
                    ->where(['device_id' => $userDeviceIds])
                    ->all();
            }
            
            return [
                'success' => true,
                'data' => array_map(function($ch) { return $ch->attributes; }, $channels),
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Test endpoint
     */
    public function actionTest()
    {
        return [
            'success' => true,
            'message' => 'MeasurementChannelController is working',
            'timestamp' => date('Y-m-d H:i:s'),
            'controller' => static::class,
        ];
    }

    /**
     * View a single channel by ID
     */
    public function actionView()
    {
        try {
            $id = Yii::$app->request->get('id');
            if (!$id) {
                throw new ServerErrorHttpException('Missing required parameter: id');
            }
            $channel = $this->checkChannelOwnership($id);
            return [
                'success' => true,
                'data' => $channel->attributes,
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Create a new channel
     */
    public function actionCreate()
    {
        try {
            $rawBody = Yii::$app->request->rawBody;
            if (empty($rawBody)) {
                throw new ServerErrorHttpException('Request body is empty');
            }
            $data = Json::decode($rawBody);
            
            // Check if user can create channels for this device
            if (isset($data['device_id'])) {
                $this->checkDeviceOwnership($data['device_id']);
            }
            
            $channel = new MeasurementChannel();
            $channel->attributes = $data;
            if (!$channel->save()) {
                throw new ServerErrorHttpException('Error creating channel: ' . Json::encode($channel->errors));
            }
            return [
                'success' => true,
                'data' => $channel->attributes,
                'message' => 'Channel created successfully',
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Update a channel
     */
    public function actionUpdate()
    {
        try {
            $id = Yii::$app->request->get('id');
            if (!$id) {
                throw new ServerErrorHttpException('Missing required parameter: id');
            }
            $channel = $this->checkChannelOwnership($id);
            $rawBody = Yii::$app->request->rawBody;
            if (empty($rawBody)) {
                throw new ServerErrorHttpException('Request body is empty');
            }
            $data = Json::decode($rawBody);
            $channel->attributes = $data;
            if (!$channel->save()) {
                throw new ServerErrorHttpException('Error updating channel: ' . Json::encode($channel->errors));
            }
            return [
                'success' => true,
                'data' => $channel->attributes,
                'message' => 'Channel updated successfully',
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Delete a channel
     */
    public function actionDelete()
    {
        try {
            $id = Yii::$app->request->get('id');
            if (!$id) {
                throw new ServerErrorHttpException('Missing required parameter: id');
            }
            $channel = $this->checkChannelOwnership($id);
            if (!$channel->delete()) {
                throw new ServerErrorHttpException('Error deleting channel');
            }
            return [
                'success' => true,
                'message' => 'Channel deleted successfully',
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Find channel by ID
     */
    protected function findChannel($id)
    {
        $channel = MeasurementChannel::findOne(['id' => $id]);
        if ($channel === null) {
            throw new NotFoundHttpException('Channel not found');
        }
        return $channel;
    }

    /**
     * Check if user owns device associated with measurement channel or is admin
     */
    private function checkChannelOwnership($channelId)
    {
        $channel = MeasurementChannel::findOne(['channel_id' => $channelId]);
        
        if (!$channel) {
            throw new NotFoundHttpException('Measurement channel not found.');
        }

        $device = Devices::findOne(['device_id' => $channel->device_id]);
        
        if (!$device) {
            throw new NotFoundHttpException('Associated device not found.');
        }

        $user = Yii::$app->user->identity;
        
        // Admin can access all channels
        if ($user->isAdmin()) {
            return $channel;
        }

        // Check ownership of the device
        if ($device->owner_id !== $user->id) {
            throw new \yii\web\ForbiddenHttpException('You do not have permission to access this measurement channel.');
        }

        return $channel;
    }

    /**
     * Check if user owns device or is admin (for channel creation)
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
}