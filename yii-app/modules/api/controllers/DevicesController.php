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
use app\models\Experiments;
use app\models\LiveExperiments;
use app\models\Phenomena;

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
                'live-experiment' => ['GET', 'POST', 'DELETE'],
                'start-phenomenon' => ['POST'],
                'stop-phenomenon' => ['POST'],
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
     * Start a live experiment for a device
     * POST /api/devices/{deviceId}/live-experiment
     */
    public function actionLiveExperiment($deviceId)
    {
        $request = Yii::$app->request;
        
        if ($request->isGet) {
            return $this->getLiveExperiment($deviceId);
        } elseif ($request->isPost) {
            return $this->startLiveExperiment($deviceId);
        } elseif ($request->isDelete) {
            return $this->stopLiveExperiment($deviceId);
        }
        
        throw new BadRequestHttpException('Method not allowed');
    }    /**
     * Get current live experiment for a device
     */
    protected function getLiveExperiment($deviceId)
    {
        $device = $this->findDevice($deviceId);
        
        $liveExperiment = LiveExperiments::findActiveByDevice($deviceId);

        if (!$liveExperiment) {
            return [
                'success' => false,
                'message' => 'No active live experiment found for this device',
                'data' => null
            ];
        }        // Get current active phenomenon
        $currentPhenomenon = Phenomena::find()
            ->where(['experiment_id' => $liveExperiment->experiment_id, 'status' => Phenomena::STATUS_ACTIVE])
            ->one();

        return [            'success' => true,
            'data' => [
                'experiment_id' => $liveExperiment->experiment_id,
                'device_id' => $liveExperiment->device_id,
                'live_experiment_id' => $liveExperiment->live_experiment_id,
                'stream_url' => $liveExperiment->stream_url,
                'is_active' => $liveExperiment->is_active,
                'duration' => $liveExperiment->getDuration(),
                'phenomena_count' => Phenomena::find()->where(['experiment_id' => $liveExperiment->experiment_id])->count(),                'current_phenomenon' => $currentPhenomenon ? [
                    'phenomenon_id' => $currentPhenomenon->phenomenon_id,
                    'name' => $currentPhenomenon->name,
                    'description' => $currentPhenomenon->description,
                    'status' => $currentPhenomenon->status,
                    'duration' => time() - strtotime($currentPhenomenon->start_time),
                ] : null,
                'start_time' => $liveExperiment->start_time,
                'end_time' => $liveExperiment->end_time,
            ]
        ];
    }

    /**
     * Start a live experiment
     */
    protected function startLiveExperiment($deviceId)
    {
        $device = $this->findDevice($deviceId);
        
        // Check if device is active
        if ($device->status !== 'Active') {
            throw new BadRequestHttpException('Device must be active to start a live experiment');
        }        // Check if there's already an active live experiment
        $existingLive = LiveExperiments::findActiveByDevice($deviceId);

        if ($existingLive) {
            throw new BadRequestHttpException('Device already has an active live experiment');
        }

        $data = Json::decode(Yii::$app->request->rawBody);
        $experimentName = $data['name'] ?? 'Live Experiment - ' . date('Y-m-d H:i:s');        $transaction = Yii::$app->db->beginTransaction();
        try {
            // Create the experiment

            $experiment = Experiments::findOne(['device_id' => $deviceId, 'type' => Experiments::STREAM, 'status' => Experiments::STATUS_RUNNING]);
            if ($experiment) {
                throw new BadRequestHttpException('Device already has an active live experiment');
            }
            $experiment = new Experiments();
            $experiment->experiment_id = uniqid('exp_');
            $experiment->experiment_name = $experimentName;
            $experiment->description = 'Live experiment for real-time data collection';
            $experiment->device_id = $deviceId;
            $experiment->type = Experiments::STREAM;
            $experiment->status = 'Running'; // This is key for frontend access
            $experiment->start_time = date('Y-m-d H:i:s');

            if (!$experiment->save()) {
                throw new ServerErrorHttpException('Failed to create experiment: ' . Json::encode($experiment->errors));
            }

            // Create the live experiment record
            $liveExperiment = LiveExperiments::createLiveExperiment($experiment->experiment_id, $deviceId);
            
            if (!$liveExperiment) {
                throw new ServerErrorHttpException('Failed to create live experiment');
            }

            $transaction->commit();            return [
                'success' => true,
                'data' => [
                    'experiment_id' => $experiment->experiment_id,
                    'device_id' => $deviceId,
                    'live_experiment_id' => $liveExperiment->live_experiment_id,
                    'stream_url' => $liveExperiment->stream_url,
                    'is_active' => $liveExperiment->is_active,
                    'duration' => 0,
                    'phenomena_count' => 0,
                    'current_phenomenon' => null,
                    'start_time' => $liveExperiment->start_time,
                    'end_time' => $liveExperiment->end_time,
                ]
            ];

        } catch (\Exception $e) {
            $transaction->rollBack();
            throw new ServerErrorHttpException('Failed to start live experiment: ' . $e->getMessage());
        }
    }

    /**
     * Stop a live experiment
     */
    protected function stopLiveExperiment($deviceId)
    {
        $device = $this->findDevice($deviceId);
          $liveExperiment = LiveExperiments::findActiveByDevice($deviceId);

        if (!$liveExperiment) {
            throw new NotFoundHttpException('No active live experiment found for this device');
        }

        $transaction = Yii::$app->db->beginTransaction();
        try {
            // Stop any active phenomena
            Phenomena::updateAll(
                ['status' => 'Completed', 'end_time' => date('Y-m-d H:i:s')],
                ['experiment_id' => $liveExperiment->experiment_id, 'status' => 'Active']
            );

            // Stop the experiment
            $experiment = Experiments::findOne($liveExperiment->experiment_id);
            if ($experiment) {
                $experiment->status = Experiments::STATUS_COMPLETED;
                $experiment->end_time = date('Y-m-d H:i:s');
                $experiment->save();
            }

            // Mark live experiment as completed
            $liveExperiment->stopLiveExperiment();

            $transaction->commit();

            return [
                'success' => true,
                'message' => 'Live experiment stopped successfully'
            ];

        } catch (\Exception $e) {
            $transaction->rollBack();
            throw new ServerErrorHttpException('Failed to stop live experiment: ' . $e->getMessage());
        }
    }

    /**
     * Start a phenomenon in a live experiment
     * POST /api/devices/{deviceId}/start-phenomenon
     */
    public function actionStartPhenomenon($deviceId)
    {
        $device = $this->findDevice($deviceId);
          $liveExperiment = LiveExperiments::findActiveByDevice($deviceId);

        if (!$liveExperiment) {
            throw new BadRequestHttpException('No active live experiment found for this device');
        }

        $data = Json::decode(Yii::$app->request->rawBody);
        $name = $data['name'] ?? null;
        $description = $data['description'] ?? '';

        if (!$name) {
            throw new BadRequestHttpException('Phenomenon name is required');
        }

        $transaction = Yii::$app->db->beginTransaction();
        try {            // Stop any currently active phenomenon
            Phenomena::updateAll(
                ['status' => Phenomena::STATUS_FINISHED, 'end_time' => date('Y-m-d H:i:s')],
                ['experiment_id' => $liveExperiment->experiment_id, 'status' => Phenomena::STATUS_ACTIVE]
            );// Create new phenomenon
            $phenomenon = new Phenomena();
            $phenomenon->phenomenon_id = uniqid('phen_');
            $phenomenon->name = $name;
            $phenomenon->description = $description;            $phenomenon->experiment_id = $liveExperiment->experiment_id;
            $phenomenon->status = Phenomena::STATUS_ACTIVE;
            $phenomenon->start_time = date('Y-m-d H:i:s');

            if (!$phenomenon->save()) {
                throw new ServerErrorHttpException('Failed to create phenomenon: ' . Json::encode($phenomenon->errors));
            }

            $transaction->commit();            return [
                'success' => true,
                'data' => [
                    'phenomenon_id' => $phenomenon->phenomenon_id,
                    'name' => $phenomenon->name,
                    'description' => $phenomenon->description,
                    'status' => $phenomenon->status,
                    'start_time' => $phenomenon->start_time,
                    'duration' => 0,
                ]
            ];

        } catch (\Exception $e) {
            $transaction->rollBack();
            throw new ServerErrorHttpException('Failed to start phenomenon: ' . $e->getMessage());
        }
    }

    /**
     * Stop a phenomenon
     * POST /api/devices/{deviceId}/stop-phenomenon
     */    public function actionStopPhenomenon($deviceId)
    {
        $device = $this->findDevice($deviceId);
        
        $data = Json::decode(Yii::$app->request->rawBody);
        $phenomenonId = $data['phenomenon_id'] ?? null;

        if (!$phenomenonId) {
            throw new BadRequestHttpException('Phenomenon ID is required');
        }        // Find the phenomenon by phenomenon_id and ensure it belongs to an experiment for this device
        $phenomenon = Phenomena::find()
            ->alias('p')
            ->leftJoin('experiments e', 'p.experiment_id = e.experiment_id')
            ->where(['p.phenomenon_id' => $phenomenonId, 'e.device_id' => $deviceId, 'p.status' => Phenomena::STATUS_ACTIVE])
            ->one();

        if (!$phenomenon) {
            throw new NotFoundHttpException('Active phenomenon not found');
        }        $phenomenon->status = Phenomena::STATUS_STOPPED;
        $phenomenon->end_time = date('Y-m-d H:i:s');

        if (!$phenomenon->save()) {
            throw new ServerErrorHttpException('Failed to stop phenomenon: ' . Json::encode($phenomenon->errors));
        }

        return [
            'success' => true,
            'message' => 'Phenomenon stopped successfully'
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
