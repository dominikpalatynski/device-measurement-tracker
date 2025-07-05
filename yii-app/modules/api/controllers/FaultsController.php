<?php

namespace app\modules\api\controllers;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use yii\web\NotFoundHttpException;
use yii\web\ServerErrorHttpException;
use yii\helpers\Json;
use app\models\Faults;
use app\models\Devices;
use app\models\Condition;
use app\filters\JwtAuthFilter;
use app\components\PerformanceLogger;

/**
 * Faults Management Controller
 * Handles fault CRUD operations and fault monitoring
 */

class FaultsController extends Controller
{
    /**
     * @var PerformanceLogger Performance logging component
     */
    private $performanceLogger;

    /**
     * Initialize the controller and performance logger
     */
    public function init()
    {
        parent::init();
        $this->performanceLogger = new PerformanceLogger();
    }

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
     * Check if user owns device associated with fault or is admin
     */
    private function checkFaultOwnership($faultId)
    {
        $fault = Faults::findOne(['fault_id' => $faultId]);
        
        if (!$fault) {
            throw new NotFoundHttpException('Fault not found.');
        }

        $device = Devices::findOne(['device_id' => $fault->device_id]);
        
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

    /**
     * Check if user owns device or is admin (for fault creation)
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

    /**
     * Get all faults (filtered by device ownership)
     * GET /api/faults
     */
    /**
     * @OA\Get(
     *     path="/fault/list",
     *     tags={"Faults"},
     *     summary="Get list of faults",
     *     description="Retrieve all faults (admin) or faults from user's devices (regular user)",
     *     security={{"BearerAuth":{}}},
     *     @OA\Response(
     *         response=200,
     *         description="Fault list retrieved successfully",
     *         @OA\JsonContent(ref="#/components/schemas/FaultList")
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
        $this->performanceLogger->startLog('method_time', 'API', [
            'endpoint' => '/api/faults',
            'method' => 'GET',
            'action' => 'list'
        ]);
        
        Yii::info("Faults list endpoint called", 'api.faults');
        
        try {
            $user = Yii::$app->user->identity;
            
            $this->performanceLogger->startLog('query_build', 'Database', [
                'operation' => 'query_build',
                'model' => 'Faults',
                'user_type' => $user->isAdmin() ? 'admin' : 'regular'
            ]);
            
            if ($user->isAdmin()) {
                // Admin can see all faults
                $faults = Faults::find()->all();
            } else {
                // Regular users only see faults from their devices
                $userDeviceIds = Devices::find()
                    ->select('device_id')
                    ->where(['owner_id' => $user->id])
                    ->column();
                
                $faults = Faults::find()
                    ->where(['device_id' => $userDeviceIds])
                    ->all();
            }
            
            $this->performanceLogger->stopLog('query_build');
            
            $this->performanceLogger->startLog('serialization', 'API', [
                'operation' => 'serialization',
                'record_count' => count($faults)
            ]);
            
            $result = [
                'success' => true,
                'data' => array_map(function($fault) {
                    return $fault->toArray();
                }, $faults),
            ];
            
            $this->performanceLogger->stopLog('serialization');
            $this->performanceLogger->stopLog('method_time');
            
            return $result;
        } catch (\Exception $e) {
            $this->performanceLogger->stopLog('method_time');
            Yii::error("Error fetching faults: " . $e->getMessage());
            throw new ServerErrorHttpException('Failed to fetch faults: ' . $e->getMessage());
        }
    }

    /**
     * Test endpoint for faults controller
     * GET /api/faults/test
     */
    public function actionTest()
    {
        Yii::info("Faults test endpoint called", 'api.faults');
        
        return [
            'success' => true,
            'message' => 'FaultsController is working',
            'timestamp' => date('Y-m-d H:i:s'),
        ];
    }

    /**
     * View a specific fault (with ownership check)
     * GET /api/faults/{id}
     */
    public function actionView($id)
    {
        Yii::info("Fault view endpoint called", 'api.faults');
        
        try {
            $fault = $this->checkFaultOwnership($id);
            return [
                'success' => true,
                'data' => $fault->toArray(),
            ];
        } catch (NotFoundHttpException $e) {
            Yii::error("Fault not found: $id");
            return [
                'success' => false,
                'error' => 'Fault not found',
            ];
        } catch (\yii\web\ForbiddenHttpException $e) {
            Yii::error("Access denied for fault: $id");
            return [
                'success' => false,
                'error' => 'Access denied',
            ];
        }
    }

    /**
     * @OA\Post(
     *     path="/fault/create",
     *     tags={"Faults"},
     *     summary="Create a new fault",
     *     description="Create a new fault for a device",
     *     security={{"BearerAuth":{}}},
     *     @OA\RequestBody(
     *         required=true,
     *         @OA\JsonContent(
     *             required={"fault_name","device_id"},
     *             @OA\Property(property="fault_name", type="string", example="Overheating Issue"),
     *             @OA\Property(property="device_id", type="string", example="DEV001"),
     *             @OA\Property(property="description", type="string", example="Device temperature exceeds normal range"),
     *             @OA\Property(property="severity", type="string", enum={"Low", "Medium", "High", "Critical"}, example="High"),
     *             @OA\Property(property="status", type="string", enum={"Active", "Inactive", "Resolved"}, example="Active")
     *         )
     *     ),
     *     @OA\Response(
     *         response=201,
     *         description="Fault created successfully",
     *         @OA\JsonContent(
     *             @OA\Property(property="success", type="boolean", example=true),
     *             @OA\Property(property="message", type="string", example="Fault created successfully"),
     *             @OA\Property(property="data", ref="#/components/schemas/Fault")
     *         )
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Validation error",
     *         @OA\JsonContent(ref="#/components/schemas/ValidationErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=401,
     *         description="Unauthorized",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     )
     * )
     * 
     * Create a new fault
     * POST /api/faults
     */
    public function actionCreate()
    {
        Yii::info("Fault create endpoint called", 'api.faults');
        
        $data = Yii::$app->request->post();
        Yii::info("Received fault data: " . Json::encode($data), 'api.faults');
        
        try {
            // Validate required fields
            if (!isset($data['device_id']) || !isset($data['fault_name'])) {
                throw new ServerErrorHttpException('device_id and fault_name are required');
            }
            
            // Check if device exists
            $device = Devices::findOne($data['device_id']);
            if (!$device) {
                throw new NotFoundHttpException('Device not found');
            }
            
            $fault = Faults::createFault(
                $data['device_id'],
                $data['fault_name'],
                $data['description'] ?? null
            );
            
            if (!$fault) {
                throw new ServerErrorHttpException('Failed to create fault');
            }
            
            // Create initial conditions if provided
            // if (!empty($data['conditions']) && is_array($data['conditions'])) {
            //     foreach ($data['conditions'] as $conditionData) {
            //         if (isset($conditionData['name'])) {
            //             Conditions::createCondition(
            //                 $fault->fault_id,
            //                 $conditionData['name'],
            //                 $conditionData['description'] ?? null
            //             );
            //         }
            //     }
            // }
            
            return [
                'success' => true,
                'data' => $fault->toArray(),
                'message' => 'Fault created successfully',
            ];
            
        } catch (\Exception $e) {
            Yii::error("Error creating fault: " . $e->getMessage());
            throw new ServerErrorHttpException('Failed to create fault: ' . $e->getMessage());
        }
    }

    /**
     * Update a fault
     * PUT /api/faults/{id}
     */
    public function actionUpdate($id)
    {
        Yii::info("Fault update endpoint called for ID: $id", 'api.faults');
        
        try {
            $fault = $this->findFault($id);
            $data = Yii::$app->request->post();
            
            // Update allowed fields
            if (isset($data['fault_name'])) {
                $fault->fault_name = $data['fault_name'];
            }
            if (isset($data['description'])) {
                $fault->description = $data['description'];
            }
            if (isset($data['status'])) {
                $fault->status = $data['status'];
            }
            
            if ($fault->save()) {
                return [
                    'success' => true,
                    'data' => $fault->toArray(),
                    'message' => 'Fault updated successfully',
                ];
            } else {
                throw new ServerErrorHttpException('Failed to update fault: ' . Json::encode($fault->errors));
            }
            
        } catch (NotFoundHttpException $e) {
            return [
                'success' => false,
                'error' => 'Fault not found',
            ];
        } catch (\Exception $e) {
            Yii::error("Error updating fault: " . $e->getMessage());
            throw new ServerErrorHttpException('Failed to update fault: ' . $e->getMessage());
        }
    }

    /**
     * Delete a fault
     * DELETE /api/faults/{id}
     */
    public function actionDelete($id)
    {
        Yii::info("Fault delete endpoint called for ID: $id", 'api.faults');
        
        try {
            $fault = $this->findFault($id);
            
            // Check if fault can be deleted (only if no active conditions)
            $activeConditions = Condition::find()
                ->where(['fault_id' => $fault->fault_id])
                ->andWhere(['!=', 'status', Condition::STATUS_INACTIVE])
                ->count();
                
            if ($activeConditions > 0) {
                throw new ServerErrorHttpException('Cannot delete fault with active conditions');
            }
            
            if ($fault->delete()) {
                return [
                    'success' => true,
                    'message' => 'Fault deleted successfully',
                ];
            } else {
                throw new ServerErrorHttpException('Failed to delete fault');
            }
            
        } catch (NotFoundHttpException $e) {
            return [
                'success' => false,
                'error' => 'Fault not found',
            ];
        } catch (\Exception $e) {
            Yii::error("Error deleting fault: " . $e->getMessage());
            throw new ServerErrorHttpException('Failed to delete fault: ' . $e->getMessage());
        }
    }

    /**
     * Find fault by ID
     */
    protected function findFault($id)
    {
        $fault = Faults::findOne(['fault_id' => $id]);
        if ($fault === null) {
            throw new NotFoundHttpException('Fault not found');
        }
        return $fault;
    }
}
