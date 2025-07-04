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
use app\models\Devices;
use app\filters\JwtAuthFilter;

/**
 * Conditions Management Controller
 * Handles condition CRUD operations and condition lifecycle management
 */

class ConditionsController extends Controller
{
    /**
     * @var string Model class for Condition (for testing/mocking)
     */
    public $conditionClass = \app\models\Condition::class;
    /**
     * @var string Model class for Faults (for testing/mocking)
     */
    public $faultsClass = \app\models\Faults::class;
    /**
     * @var string Model class for Devices (for testing/mocking)
     */
    public $devicesClass = \app\models\Devices::class;

    /**
     * {@inheritdoc}
     */
    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['contentNegotiator']['formats']['application/json'] = Response::FORMAT_JSON;
        
        // Add JWT authentication filter
        $behaviors['jwtAuth'] = [
            'class' => JwtAuthFilter::class,
            'except' => ['test'], // Public endpoints
        ];
        
        // Add HTTP method filter
        $behaviors['verbs'] = [
            'class' => \yii\filters\VerbFilter::class,
            'actions' => [
                'create' => ['POST'],
                'update' => ['PUT', 'PATCH'],
                'delete' => ['DELETE'],
                'list' => ['GET'],
                'view' => ['GET'],
                'test' => ['GET'],
                'start' => ['POST'],
                'stop' => ['POST'],
                'data' => ['POST'],
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
     * @OA\Get(
     *     path="/condition/list",
     *     tags={"Conditions"},
     *     summary="Get list of conditions",
     *     description="Retrieve all conditions (admin) or conditions from user's devices (regular user)",
     *     security={{"BearerAuth":{}}},
     *     @OA\Response(
     *         response=200,
     *         description="Condition list retrieved successfully",
     *         @OA\JsonContent(ref="#/components/schemas/ConditionList")
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
     * 
     * Get all conditions
     * GET /api/conditions
     */
    public function actionList()
    {
        Yii::info("Conditions list endpoint called", 'api.conditions');
        
        try {
            $user = Yii::$app->user->identity;
            $query = call_user_func([$this->conditionClass, 'find']);
            
            // Admins can see all conditions, others see only theirs
            if (!$user->isAdmin()) {
                $query->joinWith(['fault.device'])
                      ->where(['devices.owner_id' => $user->id]);
            }
            
            $conditions = $query->all();
            
            return [
                'success' => true,
                'data' => array_map(function($condition) {
                    return $condition->toArray();
                }, $conditions),
            ];
        } catch (\Exception $e) {
            Yii::error("Error fetching conditions: " . $e->getMessage());
            throw new ServerErrorHttpException('Failed to fetch conditions: ' . $e->getMessage());
        }
    }

    /**
     * Test endpoint for conditions controller
     * GET /api/conditions/test
     */
    public function actionTest()
    {
        Yii::info("Conditions test endpoint called", 'api.conditions');
        
        return [
            'success' => true,
            'message' => 'ConditionsController is working',
            'timestamp' => date('Y-m-d H:i:s'),
        ];
    }

    /**
     * View a specific condition
     * GET /api/conditions/{id}
     */
    public function actionView($id)
    {
        Yii::info("Condition view endpoint called", 'api.conditions');
        
        try {
            $condition = $this->checkConditionOwnership($id);
            return [
                'success' => true,
                'data' => $condition->toArray(),
            ];
        } catch (NotFoundHttpException $e) {
            Yii::error("Condition not found: $id");
            return [
                'success' => false,
                'error' => 'Condition not found',
            ];
        } catch (\yii\web\ForbiddenHttpException $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
            ];
        }
    }

    /**
     * Create a new condition
     * POST /api/conditions
     */
    public function actionCreate()
    {
        Yii::info("Condition create endpoint called", 'api.conditions');
        
        $data = Yii::$app->request->post();
        Yii::info("Received condition data: " . Json::encode($data), 'api.conditions');
        
        try {
            // Validate required fields
            if (!isset($data['fault_id']) || !isset($data['name'])) {
                throw new ServerErrorHttpException('fault_id and name are required');
            }
            
            // Check if fault exists and user has permission
            $fault = $this->checkFaultOwnership($data['fault_id']);
            
            // For stream faults, check if there are active conditions
            if ($fault->type === 'stream') {
                $streamConditions = call_user_func([$this->conditionClass, 'find'])->where(['fault_id' => $data['fault_id'], 'status' => $this->conditionClass::STATUS_ACTIVE])->all();
                if ($streamConditions) {
                    throw new ServerErrorHttpException('Cannot create condition while there are active conditions for stream fault');
                }
            }
            
            $condition = call_user_func([$this->conditionClass, 'createCondition'],
                $data['fault_id'],
                $data['name'],
                $data['description'] ?? null
            );
            
            if (!$condition) {
                throw new ServerErrorHttpException('Failed to create condition');
            }
            
            return [
                'success' => true,
                'data' => $condition->toArray(),
                'message' => 'Condition created successfully',
            ];
            
        } catch (\Exception $e) {
            Yii::error("Error creating condition: " . $e->getMessage());
            throw new ServerErrorHttpException('Failed to create condition: ' . $e->getMessage());
        }
    }

    /**
     * Update a condition
     * PUT /api/conditions/{id}
     */
    public function actionUpdate($id)
    {
        Yii::info("Condition update endpoint called for ID: $id", 'api.conditions');
        
        try {
            $condition = $this->checkConditionOwnership($id);
            $data = Yii::$app->request->post();
            
            // Update allowed fields
            if (isset($data['name'])) {
                $condition->name = $data['name'];
            }
            if (isset($data['description'])) {
                $condition->description = $data['description'];
            }
            if (isset($data['status'])) {
                $condition->status = $data['status'];
            }
            
            if ($condition->save()) {
                return [
                    'success' => true,
                    'data' => $condition->toArray(),
                    'message' => 'Condition updated successfully',
                ];
            } else {
                throw new ServerErrorHttpException('Failed to update condition: ' . Json::encode($condition->errors));
            }
            
        } catch (NotFoundHttpException $e) {
            return [
                'success' => false,
                'error' => 'Condition not found',
            ];
        } catch (\Exception $e) {
            Yii::error("Error updating condition: " . $e->getMessage());
            throw new ServerErrorHttpException('Failed to update condition: ' . $e->getMessage());
        }
    }

    /**
     * Delete a condition
     * DELETE /api/conditions/{id}
     */
    public function actionDelete($id)
    {
        Yii::info("Condition delete endpoint called for ID: $id", 'api.conditions');
        
        try {
            $condition = $this->checkConditionOwnership($id);
            
            // Allow deletion of any condition - simplified approach
            if ($condition->delete()) {
                return [
                    'success' => true,
                    'message' => 'Condition deleted successfully',
                ];
            } else {
                throw new ServerErrorHttpException('Failed to delete condition');
            }
            
        } catch (NotFoundHttpException $e) {
            return [
                'success' => false,
                'error' => 'Condition not found',
            ];
        } catch (\Exception $e) {
            Yii::error("Error deleting condition: " . $e->getMessage());
            throw new ServerErrorHttpException('Failed to delete condition: ' . $e->getMessage());
        }
    }

    /**
     * Start a condition
     * POST /api/conditions/{id}/start
     */
    public function actionStart($id)
    {
        Yii::info("Condition start endpoint called for ID: $id", 'api.conditions');
        
        try {
            $condition = $this->checkConditionOwnership($id);
            
            if ($condition->activateCondition()) {
                return [
                    'success' => true,
                    'data' => $condition->toArray(),
                    'message' => 'Condition activated successfully',
                ];
            } else {
                throw new ServerErrorHttpException('Failed to activate condition');
            }
            
        } catch (NotFoundHttpException $e) {
            return [
                'success' => false,
                'error' => 'Condition not found',
            ];
        } catch (\Exception $e) {
            Yii::error("Error starting condition: " . $e->getMessage());
            throw new ServerErrorHttpException('Failed to start condition: ' . $e->getMessage());
        }
    }

    /**
     * Stop a condition
     * POST /api/conditions/{id}/stop
     */
    public function actionStop($id)
    {
        Yii::info("Condition stop endpoint called for ID: $id", 'api.conditions');
        
        try {
            $condition = $this->checkConditionOwnership($id);
            
            if ($condition->deactivateCondition()) {
                return [
                    'success' => true,
                    'data' => $condition->toArray(),
                    'message' => 'Condition deactivated successfully',
                ];
            } else {
                throw new ServerErrorHttpException('Failed to deactivate condition');
            }
            
        } catch (NotFoundHttpException $e) {
            return [
                'success' => false,
                'error' => 'Condition not found',
            ];
        } catch (\Exception $e) {
            Yii::error("Error stopping condition: " . $e->getMessage());
            throw new ServerErrorHttpException('Failed to stop condition: ' . $e->getMessage());
        }
    }

    /**
     * Add measurement data to a condition
     * POST /api/conditions/{conditionId}/data
     */
    public function actionData($conditionId)
    {
        Yii::info("Condition data endpoint called for condition: $conditionId", 'api.conditions');
        
        try {
            $condition = $this->checkConditionOwnership($conditionId);
            $data = Yii::$app->request->post();
            
            if (!isset($data['measurements']) || !is_array($data['measurements'])) {
                throw new ServerErrorHttpException('measurements array is required');
            }
            
            // MeasurementData logic removed (model no longer exists)
            // You may want to implement new logic here or remove this endpoint if obsolete.
            $dataPoints = count($data['measurements']);
            Yii::info("Received {$dataPoints} data points for condition {$conditionId}: " . Json::encode($data), 'api.conditions.data');
            return [
                'success' => true,
                'message' => "Measurement data endpoint is deprecated or not implemented.",
                'saved_count' => 0,
                'total_count' => $dataPoints,
            ];
            
        } catch (NotFoundHttpException $e) {
            return [
                'success' => false,
                'error' => 'Condition not found',
            ];
        } catch (\Exception $e) {
            Yii::error("Error saving condition data: " . $e->getMessage());
            throw new ServerErrorHttpException('Failed to save condition data: ' . $e->getMessage());
        }
    }

    /**
     * Find condition by ID
     */
    protected function findCondition($id)
    {
        $condition = call_user_func([$this->conditionClass, 'findOne'], ['condition_id' => $id]);
        if ($condition === null) {
            throw new NotFoundHttpException('Condition not found');
        }
        return $condition;
    }

    /**
     * Check if user owns device associated with condition or is admin
     */
    private function checkConditionOwnership($conditionId)
    {
        $condition = call_user_func([$this->conditionClass, 'findOne'], ['condition_id' => $conditionId]);
        
        if (!$condition) {
            throw new NotFoundHttpException('Condition not found.');
        }

        $fault = call_user_func([$this->faultsClass, 'findOne'], ['fault_id' => $condition->fault_id]);
        
        if (!$fault) {
            throw new NotFoundHttpException('Associated fault not found.');
        }

        $device = call_user_func([$this->devicesClass, 'findOne'], ['device_id' => $fault->device_id]);
        
        if (!$device) {
            throw new NotFoundHttpException('Associated device not found.');
        }

        $user = Yii::$app->user->identity;
        
        // Admin can access all conditions
        if ($user->isAdmin()) {
            return $condition;
        }

        // Check ownership of the device
        if ($device->owner_id !== $user->id) {
            throw new \yii\web\ForbiddenHttpException('You do not have permission to access this condition.');
        }

        return $condition;
    }

    /**
     * Check if user owns device associated with fault or is admin (for condition creation)
     */
    private function checkFaultOwnership($faultId)
    {
        $fault = call_user_func([$this->faultsClass, 'findOne'], ['fault_id' => $faultId]);
        
        if (!$fault) {
            throw new NotFoundHttpException('Fault not found.');
        }

        $device = call_user_func([$this->devicesClass, 'findOne'], ['device_id' => $fault->device_id]);
        
        if (!$device) {
            throw new NotFoundHttpException('Associated device not found.');
        }

        $user = Yii::$app->user->identity;
        
        // Admin can access all faults
        if ($user->isAdmin()) {
            return $fault;
        }

        // Check ownership of the device
        if ($device->owner_id !== $user->id) {
            throw new \yii\web\ForbiddenHttpException('You do not have permission to access this fault.');
        }

        return $fault;
    }
}
