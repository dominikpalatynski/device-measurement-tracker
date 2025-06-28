<?php

namespace app\modules\api\controllers;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use app\models\Faults;
use app\models\Devices;
use app\models\Conditions;
use yii\web\NotFoundHttpException;

/**
 * FaultController implements the API actions for Faults model.
 */
class FaultController extends Controller
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
     * List all faults
     * @return array
     */
    public function actionList()
    {
        $faults = Faults::find()
            ->orderBy(['created_at' => SORT_DESC])
            ->all();
            
        return [
            'success' => true,
            'data' => $faults,
        ];
    }

    /**
     * View a single fault
     * @param string $id
     * @return array
     * @throws NotFoundHttpException
     */
    public function actionView($id)
    {        $fault = $this->findFault($id);

        return [
            'success' => true,
            'data' => $fault,
        ];
    }

    /**
     * Create a new fault
     * @return array
     */
    public function actionCreate()
    {
        $data = Yii::$app->request->getBodyParams();
        
        if (empty($data['name']) || empty($data['device_ids']) || !is_array($data['device_ids'])) {
            return [
                'success' => false,
                'error' => 'Invalid fault data. Name and device_ids are required.',
            ];
        }
        
        // Use the first device for the main fault
        $deviceId = $data['device_ids'][0];        // Check if device exists
        $device = Devices::findByDeviceId($deviceId);
        if (!$device) {
            return [
                'success' => false,
                'error' => 'Device not found.',
            ];
        }        // Create the fault
        $fault = Faults::createFault(
            $deviceId,
            $data['name'],
            $data['description'] ?? null
        );
        
        if (!$fault) {
            return [
                'success' => false,
                'error' => 'Failed to create fault.',
            ];
        }
        
        // Set status to Running for new faults
        $fault->status = Faults::STATUS_RUNNING;
        $fault->save();
          // Format the response for the frontend
        $responseData = [
            'fault_id' => $fault->fault_id,
            'name' => $fault->fault_name,
            'description' => $fault->description,
            'status' => $fault->status,
            'start_date' => $fault->start_time,
            'end_date' => $fault->end_time,
            'device_id' => $fault->device_id,
            'conditions' => [],
            'created_at' => $fault->created_at,
            'updated_at' => $fault->updated_at,
        ];
        
        return [
            'success' => true,
            'data' => $responseData,
        ];
    }

    /**
     * Update a fault
     * @param string $id
     * @return array
     * @throws NotFoundHttpException
     */
    public function actionUpdate($id)
    {
        $fault = $this->findFault($id);
        $data = Yii::$app->request->getBodyParams();
        
        // Update fault attributes
        if (isset($data['name'])) {
            $fault->fault_name = $data['name'];
        }
        
        if (isset($data['description'])) {
            $fault->description = $data['description'];
        }
          if (isset($data['status'])) {
            // Map frontend status to backend status
            $statusMap = [
                'Running' => Faults::STATUS_RUNNING,
                'Completed' => Faults::STATUS_COMPLETED,
                'Scheduled' => Faults::STATUS_SCHEDULED,
                'Failed' => Faults::STATUS_FAILED,
            ];
            
            if (isset($statusMap[$data['status']])) {
                $fault->status = $statusMap[$data['status']];
                
                // If status is completed, set end_time
                if ($data['status'] === 'Completed') {
                    $fault->end_time = new \yii\db\Expression('NOW()');
                }
            }
        }
          if ($fault->save()) {
            // Format the response for the frontend
            $responseData = [
                'fault_id' => $fault->fault_id,
                'name' => $fault->fault_name,
                'description' => $fault->description,
                'status' => $fault->status,
                'start_date' => $fault->start_time,
                'end_date' => $fault->end_time,
                'device_ids' => [$fault->device_id],
                'conditions' => [], // Would need to load conditions here
                'created_at' => $fault->created_at,
                'updated_at' => $fault->updated_at,
            ];
            
            return [
                'success' => true,
                'data' => $responseData,
            ];
        } else {
            return [
                'success' => false,
                'error' => 'Failed to update fault: ' . json_encode($fault->errors),
            ];
        }
    }

    /**
     * Delete a fault
     * @param string $id
     * @return array
     * @throws NotFoundHttpException
     */    public function actionDelete($id)
    {
        $fault = $this->findFault($id);
        
        // Delete the fault (conditions will be deleted by foreign key cascade)
        if ($fault->delete()) {
            return [
                'success' => true,
            ];
        } else {
            return [
                'success' => false,
                'error' => 'Failed to delete fault.',
            ];
        }
    }

    /**
     * Find a fault by ID
     * @param string $id
     * @return Faults
     * @throws NotFoundHttpException
     */
    protected function findFault($id)
    {
        $fault = Faults::findOne(['fault_id' => $id]);
        
        if (!$fault) {
            throw new NotFoundHttpException('Fault not found.');
        }
        
        return $fault;
    }

    /**
     * Map backend status to frontend status
     * @param string $status
     * @return string
     */
    protected function mapStatusToFrontend($status)
    {
        $map = [
            Faults::STATUS_RUNNING => 'Active',
            Faults::STATUS_COMPLETED => 'Completed',
            Faults::STATUS_SCHEDULED => 'Paused',
            Faults::STATUS_FAILED => 'Failed',
        ];
        
        return $map[$status] ?? 'Unknown';
    }
}
