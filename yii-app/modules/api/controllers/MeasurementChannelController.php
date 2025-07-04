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
use OpenApi\Attributes as OA;

/**
 * Measurement Channel Controller
 * Handles measurement channel configuration and management
 * 
 * @OA\Tag(
 *     name="Measurement Channels",
 *     description="Measurement channel configuration and management operations"
 * )
 */

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
     * 
     * @OA\Get(
     *     path="/measurement-channel/list",
     *     tags={"Measurement Channels"},
     *     summary="List measurement channels",
     *     description="Get all measurement channels accessible to the current user",
     *     security={{"BearerAuth": {}}},
     *     @OA\Response(
     *         response=200,
     *         description="List of measurement channels",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(
     *                 property="data",
     *                 type="array",
     *                 @OA\Items(ref="#/components/schemas/MeasurementChannel")
     *             )
     *         )
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
     * 
     * @OA\Get(
     *     path="/measurement-channel/test",
     *     tags={"Measurement Channels"},
     *     summary="Test measurement channel controller",
     *     description="Simple test endpoint to verify controller functionality",
     *     @OA\Response(
     *         response=200,
     *         description="Controller test successful",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="MeasurementChannelController is working"),
     *             @OA\Property(property="timestamp", type="string", example="2024-01-15 10:30:00"),
     *             @OA\Property(property="controller", type="string")
     *         )
     *     )
     * )
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
     * 
     * @OA\Get(
     *     path="/measurement-channel/view",
     *     tags={"Measurement Channels"},
     *     summary="Get measurement channel details",
     *     description="Retrieve details of a specific measurement channel by ID",
     *     security={{"BearerAuth": {}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="query",
     *         required=true,
     *         description="Measurement channel ID",
     *         @OA\Schema(type="string")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Measurement channel details",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="data", ref="#/components/schemas/MeasurementChannel")
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Bad request - Missing required parameter",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden - No permission to access this channel",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Measurement channel not found",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     )
     * )
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
     * 
     * @OA\Post(
     *     path="/measurement-channel/create",
     *     tags={"Measurement Channels"},
     *     summary="Create measurement channel",
     *     description="Create a new measurement channel for a device",
     *     security={{"BearerAuth": {}}},
     *     @OA\RequestBody(
     *         required=true,
     *         description="Measurement channel data",
     *         @OA\JsonContent(
     *             required={"device_id", "channel_name", "channel_type"},
     *             @OA\Property(property="device_id", type="string", example="DEV001"),
     *             @OA\Property(property="channel_name", type="string", example="Temperature Sensor"),
     *             @OA\Property(property="channel_type", type="string", example="temperature"),
     *             @OA\Property(property="unit", type="string", example="°C"),
     *             @OA\Property(property="description", type="string", example="Main temperature sensor"),
     *             @OA\Property(property="status", type="string", enum={"active", "inactive"}, example="active")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Measurement channel created successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="data", ref="#/components/schemas/MeasurementChannel"),
     *             @OA\Property(property="message", type="string", example="Channel created successfully")
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Bad request - Invalid data or validation error",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden - No permission to create channel for this device",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Device not found",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     )
     * )
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
     * 
     * @OA\Put(
     *     path="/measurement-channel/update",
     *     tags={"Measurement Channels"},
     *     summary="Update measurement channel",
     *     description="Update an existing measurement channel",
     *     security={{"BearerAuth": {}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="query",
     *         required=true,
     *         description="Measurement channel ID",
     *         @OA\Schema(type="string")
     *     ),
     *     @OA\RequestBody(
     *         required=true,
     *         description="Updated measurement channel data",
     *         @OA\JsonContent(
     *             @OA\Property(property="channel_name", type="string", example="Updated Temperature Sensor"),
     *             @OA\Property(property="channel_type", type="string", example="temperature"),
     *             @OA\Property(property="unit", type="string", example="°C"),
     *             @OA\Property(property="description", type="string", example="Updated description"),
     *             @OA\Property(property="status", type="string", enum={"active", "inactive"}, example="active")
     *         )
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Measurement channel updated successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="data", ref="#/components/schemas/MeasurementChannel"),
     *             @OA\Property(property="message", type="string", example="Channel updated successfully")
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Bad request - Missing ID or invalid data",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden - No permission to update this channel",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Measurement channel not found",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     )
     * )
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
     * 
     * @OA\Delete(
     *     path="/measurement-channel/delete",
     *     tags={"Measurement Channels"},
     *     summary="Delete measurement channel",
     *     description="Delete an existing measurement channel",
     *     security={{"BearerAuth": {}}},
     *     @OA\Parameter(
     *         name="id",
     *         in="query",
     *         required=true,
     *         description="Measurement channel ID",
     *         @OA\Schema(type="string")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Measurement channel deleted successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Channel deleted successfully")
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Bad request - Missing required parameter",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=403,
     *         description="Forbidden - No permission to delete this channel",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=404,
     *         description="Measurement channel not found",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Error deleting channel",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     )
     * )
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