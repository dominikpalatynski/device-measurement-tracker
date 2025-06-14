<?php

namespace app\modules\api\controllers;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use app\models\Experiments;
use app\models\Devices;
use app\models\Phenomena;
use yii\web\NotFoundHttpException;

/**
 * ExperimentController implements the API actions for Experiments model.
 */
class ExperimentController extends Controller
{
    /**
     * {@inheritdoc}
     */
    public function behaviors()
    {
        $behaviors = parent::behaviors();
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
        
        // Format response as JSON
        $behaviors['contentNegotiator'] = [
            'class' => \yii\filters\ContentNegotiator::class,
            'formats' => [
                'application/json' => Response::FORMAT_JSON,
            ],
        ];
        
        return $behaviors;
    }

    /**
     * List all experiments
     * @return array
     */
    public function actionList()
    {
        $experiments = Experiments::find()
            ->orderBy(['created_at' => SORT_DESC])
            ->all();
            
        return [
            'success' => true,
            'data' => $experiments,
        ];
    }

    /**
     * View a single experiment
     * @param string $id
     * @return array
     * @throws NotFoundHttpException
     */
    public function actionView($id)
    {
        $experiment = $this->findExperiment($id);
        
        return [
            'success' => true,
            'data' => $experiment,
        ];
    }

    /**
     * Create a new experiment
     * @return array
     */
    public function actionCreate()
    {
        $data = Yii::$app->request->getBodyParams();
        
        if (empty($data['name']) || empty($data['device_ids']) || !is_array($data['device_ids'])) {
            return [
                'success' => false,
                'error' => 'Invalid experiment data. Name and device_ids are required.',
            ];
        }
        
        // Use the first device for the main experiment
        $deviceId = $data['device_ids'][0];        // Check if device exists
        $device = Devices::findByDeviceId($deviceId);
        if (!$device) {
            return [
                'success' => false,
                'error' => 'Device not found.',
            ];
        }        // Create the experiment
        $experiment = Experiments::createExperiment(
            $deviceId,
            $data['name'],
            $data['description'] ?? null
        );
        
        if (!$experiment) {
            return [
                'success' => false,
                'error' => 'Failed to create experiment.',
            ];
        }
        
        // Set status to Running for new experiments
        $experiment->status = Experiments::STATUS_RUNNING;
        $experiment->save();
          // Format the response for the frontend
        $responseData = [
            'experiment_id' => $experiment->experiment_id,
            'name' => $experiment->experiment_name,
            'description' => $experiment->description,
            'status' => $experiment->status,
            'start_date' => $experiment->start_time,
            'end_date' => $experiment->end_time,
            'device_id' => $experiment->device_id,
            'phenomena' => [],
            'created_at' => $experiment->created_at,
            'updated_at' => $experiment->updated_at,
        ];
        
        return [
            'success' => true,
            'data' => $responseData,
        ];
    }

    /**
     * Update an experiment
     * @param string $id
     * @return array
     * @throws NotFoundHttpException
     */
    public function actionUpdate($id)
    {
        $experiment = $this->findExperiment($id);
        $data = Yii::$app->request->getBodyParams();
        
        // Update experiment attributes
        if (isset($data['name'])) {
            $experiment->experiment_name = $data['name'];
        }
        
        if (isset($data['description'])) {
            $experiment->description = $data['description'];
        }
          if (isset($data['status'])) {
            // Map frontend status to backend status
            $statusMap = [
                'Running' => Experiments::STATUS_RUNNING,
                'Completed' => Experiments::STATUS_COMPLETED,
                'Scheduled' => Experiments::STATUS_SCHEDULED,
                'Failed' => Experiments::STATUS_FAILED,
            ];
            
            if (isset($statusMap[$data['status']])) {
                $experiment->status = $statusMap[$data['status']];
                
                // If status is completed, set end_time
                if ($data['status'] === 'Completed') {
                    $experiment->end_time = new \yii\db\Expression('NOW()');
                }
            }
        }
          if ($experiment->save()) {
            // Format the response for the frontend
            $responseData = [
                'experiment_id' => $experiment->experiment_id,
                'name' => $experiment->experiment_name,
                'description' => $experiment->description,
                'status' => $experiment->status,
                'start_date' => $experiment->start_time,
                'end_date' => $experiment->end_time,
                'device_ids' => [$experiment->device_id],
                'phenomena' => [], // Would need to load phenomena here
                'created_at' => $experiment->created_at,
                'updated_at' => $experiment->updated_at,
            ];
            
            return [
                'success' => true,
                'data' => $responseData,
            ];
        } else {
            return [
                'success' => false,
                'error' => 'Failed to update experiment: ' . json_encode($experiment->errors),
            ];
        }
    }

    /**
     * Delete an experiment
     * @param string $id
     * @return array
     * @throws NotFoundHttpException
     */    public function actionDelete($id)
    {
        $experiment = $this->findExperiment($id);
        
        // Delete the experiment (phenomena will be deleted by foreign key cascade)
        if ($experiment->delete()) {
            return [
                'success' => true,
            ];
        } else {
            return [
                'success' => false,
                'error' => 'Failed to delete experiment.',
            ];
        }
    }

    /**
     * Find an experiment by ID
     * @param string $id
     * @return Experiments
     * @throws NotFoundHttpException
     */
    protected function findExperiment($id)
    {
        $experiment = Experiments::findOne(['experiment_id' => $id]);
        
        if (!$experiment) {
            throw new NotFoundHttpException('Experiment not found.');
        }
        
        return $experiment;
    }

    /**
     * Map backend status to frontend status
     * @param string $status
     * @return string
     */
    protected function mapStatusToFrontend($status)
    {
        $map = [
            Experiments::STATUS_RUNNING => 'Active',
            Experiments::STATUS_COMPLETED => 'Completed',
            Experiments::STATUS_SCHEDULED => 'Paused',
            Experiments::STATUS_FAILED => 'Failed',
        ];
        
        return $map[$status] ?? 'Unknown';
    }
}
