<?php

namespace app\modules\api\controllers;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use yii\web\NotFoundHttpException;
use yii\web\ServerErrorHttpException;
use yii\helpers\Json;
use app\models\MeasurementChannel;

class MeasurementChannelController extends Controller
{
    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['contentNegotiator']['formats']['application/json'] = Response::FORMAT_JSON;
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
     * List all measurement channels
     */
    public function actionList()
    {
        try {
            $channels = MeasurementChannel::find()->all();
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
            $channel = $this->findChannel($id);
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
            $channel = $this->findChannel($id);
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
            $channel = $this->findChannel($id);
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
} 