<?php

namespace app\modules\api\controllers;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use yii\web\NotFoundHttpException;
use yii\web\ServerErrorHttpException;
use yii\helpers\Json;
use app\models\Condition;
use app\models\Faults;

class ConditionController extends Controller
{    /**
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
                'create' => ['POST'],
                'update' => ['PUT', 'PATCH'],
                'delete' => ['DELETE'],
                'list' => ['GET'],
                'view' => ['GET'],
                'start' => ['POST'],
                'stop' => ['POST'],
                'finish' => ['POST'],
                'test' => ['GET'],
                'data' => ['POST'],  // Add new data endpoint
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
    }    /**
     * Get all conditions
     */
    public function actionList()
    {
        Yii::info("Conditions list endpoint called", 'api.conditions');
        
        try {
            $conditions = Condition::find()->all();
            
            return [
                'success' => true,
                'data' => array_map(function($condition) {
                    return $condition->attributes;
                }, $conditions),
            ];
        } catch (\Exception $e) {
            Yii::error("Error fetching conditions: " . $e->getMessage());
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
        Yii::info("Conditions test endpoint called", 'api.conditions');
        
        return [
            'success' => true,
            'message' => 'ConditionController is working',
            'timestamp' => date('Y-m-d H:i:s'),
            'controller' => static::class,
        ];
    }

    /**
     * Get a single condition by ID
     */
    public function actionView()
    {
        Yii::info("Condition view endpoint called", 'api.conditions');
        
        try {
            $id = Yii::$app->request->get('id');
            if (!$id) {
                throw new ServerErrorHttpException('Missing required parameter: id');
            }
            
            $condition = $this->findCondition($id);
            
            return [
                'success' => true,
                'data' => $condition->attributes,
            ];
        } catch (\Exception $e) {
            Yii::error("Error fetching condition: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Create a new condition
     */
    public function actionCreate()
    {
        Yii::info("Condition create endpoint called", 'api.conditions');
        
        try {
            $rawBody = Yii::$app->request->rawBody;
            if (empty($rawBody)) {
                throw new ServerErrorHttpException('Request body is empty');
            }
            
            $data = Json::decode($rawBody);
            
            // Validate required fields
            if (empty($data['name']) || empty($data['fault_id'])) {
                throw new ServerErrorHttpException('Missing required fields: name and fault_id are required');
            }
            
            $fault = Faults::findOne(['fault_id' => $data['fault_id']]);
            if (!$fault) {
                throw new ServerErrorHttpException('Fault not found');
            }

            if ($fault->type === Faults::STREAM) {
                $streamConditions = Condition::find()->where(['fault_id' => $data['fault_id'], 'status' => Condition::STATUS_ACTIVE])->all();
                if ($streamConditions) {
                    throw new ServerErrorHttpException('Stream fault already has an active condition');
                }
            }

            $condition = Condition::createCondition(
                $data['fault_id'],
                $data['name'],
                $data['description'] ?? null
            );
            
            if (!$condition) {
                throw new ServerErrorHttpException('Error creating condition');
            }
            
            return [
                'success' => true,
                'data' => $condition->attributes,
                'message' => 'Condition created successfully',
            ];
        } catch (\Exception $e) {
            Yii::error("Error creating condition: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Update a condition
     */
    public function actionUpdate()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        
        try {
            $id = Yii::$app->request->get('id');
            if (!$id) {
                throw new ServerErrorHttpException('Missing required parameter: id');
            }
            
            $condition = $this->findCondition($id);
            
            $rawBody = Yii::$app->request->rawBody;
            if (empty($rawBody)) {
                throw new ServerErrorHttpException('Request body is empty');
            }
            
            $data = Json::decode($rawBody);
            $condition->attributes = $data;
            
            if (!$condition->save()) {
                throw new ServerErrorHttpException('Error updating condition: ' . 
                    Json::encode($condition->errors));
            }
            
            return [
                'success' => true,
                'data' => $condition->attributes,
                'message' => 'Condition updated successfully',
            ];
        } catch (\Exception $e) {
            Yii::error("Error updating condition: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Delete a condition
     */
    public function actionDelete()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        
        try {
            $id = Yii::$app->request->get('id');
            if (!$id) {
                throw new ServerErrorHttpException('Missing required parameter: id');
            }
            
            $condition = $this->findCondition($id);
            
            // Only allow deletion of Pending conditions to prevent data loss
            if ($condition->status !== 'Pending') {
                throw new ServerErrorHttpException('Only conditions in Pending status can be deleted');
            }
            
            if (!$condition->delete()) {
                throw new ServerErrorHttpException('Error deleting condition: ' . 
                    Json::encode($condition->errors));
            }
            
            return [
                'success' => true,
                'message' => 'Condition deleted successfully',
            ];
        } catch (\Exception $e) {
            Yii::error("Error deleting condition: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }
    
    /**
     * Start a condition
     */
    public function actionStart()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        
        try {
            $id = Yii::$app->request->get('id');
            if (!$id) {
                throw new ServerErrorHttpException('Missing required parameter: id');
            }
            
            $condition = $this->findCondition($id);
            
            if (!$condition->startCondition()) {
                throw new ServerErrorHttpException('Error starting condition');
            }
            
            return [
                'success' => true,
                'data' => $condition->attributes,
                'message' => 'Condition started successfully',
            ];
        } catch (\Exception $e) {
            Yii::error("Error starting condition: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }
    
    /**
     * Finish a condition
     */
    public function actionFinish()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        
        try {
            $id = Yii::$app->request->get('id');
            if (!$id) {
                throw new ServerErrorHttpException('Missing required parameter: id');
            }
            
            $condition = $this->findCondition($id);
            
            if (!$condition->finishCondition()) {
                throw new ServerErrorHttpException('Error finishing condition');
            }
            
            return [
                'success' => true,
                'data' => $condition->attributes,
                'message' => 'Condition finished successfully',
            ];
        } catch (\Exception $e) {
            Yii::error("Error finishing condition: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }
    
    /**
     * Stop a condition
     */
    public function actionStop()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        
        try {
            $id = Yii::$app->request->get('id');
            if (!$id) {
                throw new ServerErrorHttpException('Missing required parameter: id');
            }
            
            $condition = $this->findCondition($id);
            
            if (!$condition->stopCondition()) {
                throw new ServerErrorHttpException('Error stopping condition');
            }
            
            return [
                'success' => true,
                'data' => $condition->attributes,
                'message' => 'Condition stopped successfully',
            ];
        } catch (\Exception $e) {
            Yii::error("Error stopping condition: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }    /**
     * Find condition by ID (for backward compatibility, also supports findPhenomenon)
     */
    protected function findPhenomenon($id)
    {
        $condition = Condition::findOne(['condition_id' => $id]);
        if ($condition === null) {
            throw new NotFoundHttpException('Condition not found');
        }
        return $condition;
    }
    
    /**
     * Submit measurement data for a condition
     * POST /api/conditions/{conditionId}/data (keeping old API endpoint for compatibility)
     */
    public function actionData($conditionId)
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        
        try {
            // Find the condition
            $condition = $this->findCondition($conditionId);
            
            // Get the request body
            $rawData = Yii::$app->request->getRawBody();
            if (empty($rawData)) {
                throw new ServerErrorHttpException('Empty request body');
            }
            
            // Parse JSON data
            $data = Json::decode($rawData, true);
            if (!is_array($data)) {
                throw new ServerErrorHttpException('Invalid JSON format');
            }
              // Validate that condition is in pending status
            if ($condition->status !== 'Pending') {
                throw new ServerErrorHttpException('Condition must be in Pending status to receive data');
            }
            
            // TODO: Store the measurement data in proper measurement tables
            // This would depend on your measurement data model structure
            // For now, we'll update the condition status and log the data
            
            $condition->status = 'Active';
            $condition->start_time = date('Y-m-d H:i:s');
            
            // Store data count for reference
            $dataPoints = 0;
            if (is_array($data)) {
                foreach ($data as $channel => $values) {
                    if (is_array($values)) {
                        $dataPoints += count($values);
                    }
                }
            }
            
            // You might want to store this in a notes or metadata field
            if ($condition->hasAttribute('data_points_count')) {
                $condition->data_points_count = $dataPoints;
            }
            
            if (!$condition->save()) {
                throw new ServerErrorHttpException('Failed to update condition status');
            }
            
            // Log the received data for debugging and audit trail
            Yii::info("Received {$dataPoints} data points for condition {$conditionId}: " . Json::encode($data), 'api.conditions.data');
              return [
                'success' => true,
                'message' => 'Data received and stored successfully',
                'condition_id' => $conditionId,
                'data_points_received' => $dataPoints,
                'condition_status' => $condition->status,
                'channels' => is_array($data) ? array_keys($data) : []
            ];
            
        } catch (\Exception $e) {
            Yii::error("Error receiving condition data: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }
}
