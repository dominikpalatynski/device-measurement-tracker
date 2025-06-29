<?php

namespace app\modules\api\controllers;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use yii\web\NotFoundHttpException;
use yii\web\ServerErrorHttpException;
use yii\web\BadRequestHttpException;
use yii\helpers\Json;
use app\models\Devices;
use app\models\Faults;
use app\models\Condition;
use app\models\LiveFaults;

class DevicesController extends Controller
{
    /**
     * {@inheritdoc}
     */
    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['contentNegotiator']['formats']['application/json'] = Response::FORMAT_JSON;
        
        // Add HTTP method filter
        $behaviors['verbs'] = [
            'class' => \yii\filters\VerbFilter::class,
            'actions' => [
                'live-fault' => ['GET', 'POST', 'DELETE'],
                'start-condition' => ['POST'],
                'stop-condition' => ['POST'],
            ],
        ];
        
        // Add CORS filter
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
     * Start a live fault for a device
     * POST /api/devices/{deviceId}/live-fault
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
        
        throw new BadRequestHttpException('Method not allowed');
    }    /**
     * Get current live fault for a device
     */
    protected function getLiveFault($deviceId)
    {
        $device = $this->findDevice($deviceId);
        
        $liveFault = Faults::findActiveByDevice($deviceId);

        if (!$liveFault) {
            return [
                'success' => false,
                'message' => 'No active live fault found for this device',
                'data' => null
            ];
        }        // Get current active condition
        $currentCondition = Condition::find()
            ->where(['fault_id' => $liveFault->fault_id, 'status' => Condition::STATUS_ACTIVE])
            ->one();

        return [            'success' => true,
            'data' => [
                'fault_id' => $liveFault->fault_id,
                'device_id' => $liveFault->device_id,
                'duration' => $liveFault->getDuration(),
                'conditions_count' => Condition::find()->where(['fault_id' => $liveFault->fault_id])->count(),                'current_condition' => $currentCondition ? [
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
            throw new BadRequestHttpException('Device must be active to start a live fault');
        }        // Check if there's already an active live fault
        $existingLive = Faults::findActiveByDevice($deviceId);

        if ($existingLive) {
            throw new BadRequestHttpException('Device already has an active live fault');
        }

        $data = Json::decode(Yii::$app->request->rawBody);
        $faultName = $data['name'] ?? 'Live Fault - ' . date('Y-m-d H:i:s');        $transaction = Yii::$app->db->beginTransaction();
        try {
            // Create the fault

            $fault = Faults::findOne(['device_id' => $deviceId, 'status' => Faults::STATUS_ACTIVE]);
            if ($fault) {
                throw new BadRequestHttpException('Device already has an active fault');
            }
            $fault = new Faults();
            $fault->fault_id = uniqid('flt_');
            $fault->fault_name = $faultName;
            $fault->description = 'Live fault for real-time data collection';
            $fault->device_id = $deviceId;
            $fault->status = Faults::STATUS_ACTIVE;
            $fault->start_time = date('Y-m-d H:i:s');

            if (!$fault->save()) {
                throw new ServerErrorHttpException('Failed to create fault: ' . Json::encode($fault->errors));
            }

            $transaction->commit();            return [
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
            throw new ServerErrorHttpException('Failed to start live fault: ' . $e->getMessage());
        }
    }

    /**
     * Stop a live fault
     */
    protected function stopLiveFault($deviceId)
    {
        $device = $this->findDevice($deviceId);
          $liveFault = Faults::findActiveByDevice($deviceId);

        if (!$liveFault) {
            throw new NotFoundHttpException('No active live fault found for this device');
        }

        $transaction = Yii::$app->db->beginTransaction();
        try {
            // Deactivate any active conditions
            Condition::updateAll(
                ['status' => Condition::STATUS_INACTIVE, 'end_time' => date('Y-m-d H:i:s')],
                ['fault_id' => $liveFault->fault_id, 'status' => Condition::STATUS_ACTIVE]
            );

            // Deactivate the fault
            $fault = Faults::findOne($liveFault->fault_id);
            if ($fault) {
                $fault->status = Faults::STATUS_INACTIVE;
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
            throw new ServerErrorHttpException('Failed to stop live fault: ' . $e->getMessage());
        }
    }

    /**
     * Start a condition in a live fault
     * POST /api/devices/{deviceId}/start-condition
     */
    public function actionStartCondition($deviceId)
    {
        $device = $this->findDevice($deviceId);
          $liveFault = Faults::findActiveByDevice($deviceId);

        if (!$liveFault) {
            throw new BadRequestHttpException('No active live fault found for this device');
        }

        $data = Json::decode(Yii::$app->request->rawBody);
        $name = $data['name'] ?? null;
        $description = $data['description'] ?? '';

        if (!$name) {
            throw new BadRequestHttpException('Condition name is required');
        }

        $transaction = Yii::$app->db->beginTransaction();
        try {            // Deactivate any currently active condition
            Condition::updateAll(
                ['status' => Condition::STATUS_INACTIVE, 'end_time' => date('Y-m-d H:i:s')],
                ['fault_id' => $liveFault->fault_id, 'status' => Condition::STATUS_ACTIVE]
            );// Create new condition
            $condition = new Condition();
            $condition->condition_id = uniqid('cnd_');
            $condition->name = $name;
            $condition->description = $description;            $condition->fault_id = $liveFault->fault_id;
            $condition->status = Condition::STATUS_ACTIVE;
            $condition->start_time = date('Y-m-d H:i:s');

            if (!$condition->save()) {
                throw new ServerErrorHttpException('Failed to create condition: ' . Json::encode($condition->errors));
            }

            $transaction->commit();            return [
                'success' => true,
                'data' => [
                    'condition_id' => $condition->condition_id,
                    'name' => $condition->name,
                    'description' => $condition->description,
                    'status' => $condition->status,
                    'start_time' => $condition->start_time,
                    'duration' => 0,
                ]
            ];

        } catch (\Exception $e) {
            $transaction->rollBack();
            throw new ServerErrorHttpException('Failed to start condition: ' . $e->getMessage());
        }
    }

    /**
     * Stop a condition
     * POST /api/devices/{deviceId}/stop-condition
     */    public function actionStopCondition($deviceId)
    {
        $device = $this->findDevice($deviceId);
        
        $data = Json::decode(Yii::$app->request->rawBody);
        $conditionId = $data['condition_id'] ?? null;

        if (!$conditionId) {
            throw new BadRequestHttpException('Condition ID is required');
        }        // Find the condition by condition_id and ensure it belongs to a fault for this device
        $condition = Condition::find()
            ->alias('c')
            ->leftJoin('faults f', 'c.fault_id = f.fault_id')
            ->where(['c.condition_id' => $conditionId, 'f.device_id' => $deviceId, 'c.status' => Conditions::STATUS_ACTIVE])
            ->one();

        if (!$condition) {
            throw new NotFoundHttpException('Active condition not found');
        }

        $condition->status = Condition::STATUS_INACTIVE;
        $condition->end_time = date('Y-m-d H:i:s');

        if (!$condition->save()) {
            throw new ServerErrorHttpException('Failed to stop condition: ' . Json::encode($condition->errors));
        }

        return [
            'success' => true,
            'message' => 'Condition stopped successfully'
        ];
    }

    /**
     * Find device by ID
     */
    protected function findDevice($deviceId)
    {
        $device = Devices::findOne($deviceId);
        if (!$device) {
            throw new NotFoundHttpException('Device not found');
        }
        return $device;
    }
}
