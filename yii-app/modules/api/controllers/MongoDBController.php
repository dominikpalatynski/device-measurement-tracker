<?php

namespace app\modules\api\controllers;

use Yii;
use yii\web\Controller;
use yii\web\Response;
use yii\filters\Cors;
use yii\filters\ContentNegotiator;
use yii\helpers\Json;
use app\services\MongoDBService;
use app\models\Condition;
use app\models\Faults;

/**
 * MongoDB API Controller for testing measurement data operations
 * Handles MongoDB measurement data retrieval and debugging operations
 */
class MongoDBController extends Controller
{
    private $mongoService;
    
    public function behaviors()
    {
        return [
            'corsFilter' => [
                'class' => Cors::class,
                'cors' => [
                    'Origin' => ['http://localhost:3000', 'http://localhost:3001', 'http://172.22.176.1:3000', 'http://172.22.176.1:3001'],
                    'Access-Control-Request-Method' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                    'Access-Control-Request-Headers' => ['*'],
                    'Access-Control-Allow-Credentials' => true,
                    'Access-Control-Max-Age' => 3600,
                ],
            ],
            'contentNegotiator' => [
                'class' => ContentNegotiator::class,
                'formats' => [
                    'application/json' => Response::FORMAT_JSON,
                ],
            ],
        ];
    }
    
    public function init()
    {
        parent::init();
        
        try {
            $this->mongoService = new MongoDBService();
        } catch (\Exception $e) {
            Yii::error("Failed to initialize MongoDB service: " . $e->getMessage());
            throw new \yii\web\ServerErrorHttpException('MongoDB service unavailable');
        }
    }
    
    /**
     * GET /api/mongodb/test
     * Test MongoDB connection
     */
    public function actionTest()
    {
        try {
            $testResult = $this->mongoService->testConnection();
            return [
                'success' => $testResult['success'],
                'message' => $testResult['message'],
                'timestamp' => date('Y-m-d H:i:s'),
                'database' => $testResult['database'] ?? $this->mongoService->databaseName,
                'collections' => $testResult['collections'] ?? $this->mongoService->getCollections()
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * @OA\Get(
     *     path="/mongodb/measurements",
     *     tags={"Measurements"},
     *     summary="Get measurement data from MongoDB",
     *     description="Retrieve measurement data with various filtering options",
     *     @OA\Parameter(
     *         name="deviceId",
     *         in="query",
     *         description="Filter by device ID",
     *         @OA\Schema(type="string", example="DEV001")
     *     ),
     *     @OA\Parameter(
     *         name="faultId",
     *         in="query",
     *         description="Filter by fault ID",
     *         @OA\Schema(type="string", example="FAULT001")
     *     ),
     *     @OA\Parameter(
     *         name="conditionId",
     *         in="query",
     *         description="Filter by condition ID",
     *         @OA\Schema(type="string", example="COND001")
     *     ),
     *     @OA\Parameter(
     *         name="dataSeriesId",
     *         in="query",
     *         description="Filter by data series ID",
     *         @OA\Schema(type="string")
     *     ),
     *     @OA\Parameter(ref="#/components/parameters/TimeRangeQuery"),
     *     @OA\Parameter(ref="#/components/parameters/LimitQuery"),
     *     @OA\Parameter(
     *         name="sort",
     *         in="query",
     *         description="Sort order",
     *         @OA\Schema(type="string", enum={"asc", "desc"}, default="desc")
     *     ),
     *     @OA\Response(
     *         response=200,
     *         description="Measurement data retrieved successfully",
     *         @OA\JsonContent(ref="#/components/schemas/MeasurementList")
     *     ),
     *     @OA\Response(
     *         response=400,
     *         description="Bad request",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     ),
     *     @OA\Response(
     *         response=500,
     *         description="Internal server error",
     *         @OA\JsonContent(ref="#/components/schemas/ErrorResponse")
     *     )
     * )
     * 
     * GET /api/mongodb/measurements
     * Get measurement data with flexible filtering
     * 
     * Supported parameters:
     * - deviceId: Filter by device ID
     * - faultId: Filter by fault ID
     * - conditionId: Filter by condition ID
     * - dataSeriesId: Filter by data series ID
     * - conditionName / condition_name: Filter by condition name
     * - faultName / fault_name: Filter by fault name
     * - dataSeriesValue: Filter by data series value
     * - data_series: Filter by data series ID (maps to dataSeriesId)
     * - startTime: Start time (timestamp or date string)
     * - endTime: End time (timestamp or date string)
     * - timeRange: Relative time range (e.g., '1h', '1d', '1w')
     * - limit: Maximum number of results (default: 100)
     * - sort: Sort order ('asc' or 'desc', default: 'desc')
     */
    public function actionMeasurements()
    {
        $request = Yii::$app->request;
        
        try {
            // Build filters array from query parameters
            $filters = [];
            
            // Basic filters
            if ($deviceId = $request->get('deviceId')) {
                $filters['deviceId'] = $deviceId;
            }
            
            if ($faultId = $request->get('faultId')) {
                $filters['faultId'] = $faultId;
            }
            
            if ($conditionId = $request->get('conditionId')) {
                $filters['conditionId'] = $conditionId;
            }
            
            if ($dataSeriesId = $request->get('dataSeriesId')) {
                $filters['dataSeriesId'] = $dataSeriesId;
            }
            
            if ($conditionName = $request->get('conditionName')) {
                $filters['conditionName'] = $conditionName;
            }
            
            // Handle snake_case parameter name for condition_name
            if ($conditionName = $request->get('condition_name')) {
                $filters['conditionName'] = $conditionName;
            }
            
            if ($faultName = $request->get('faultName')) {
                $filters['faultName'] = $faultName;
            }
            
            // Handle snake_case parameter name for fault_name
            if ($faultName = $request->get('fault_name')) {
                $filters['faultName'] = $faultName;
            }
            
            if ($dataSeriesValue = $request->get('dataSeriesValue')) {
                $filters['dataSeriesValue'] = $dataSeriesValue;
            }
            
            // Handle data_series parameter (mapping to dataSeriesId for filtering by series ID)
            if ($dataSeries = $request->get('data_series')) {
                $filters['dataSeriesId'] = $dataSeries;
            }
            
            // Time range filters
            if ($startTime = $request->get('startTime')) {
                $filters['startTime'] = $startTime;
            }
            
            if ($endTime = $request->get('endTime')) {
                $filters['endTime'] = $endTime;
            }
            
            if ($timeRange = $request->get('timeRange')) {
                $filters['timeRange'] = $timeRange;
            }
            
            if ($sort = $request->get('sort')) {
                $filters['sort'] = $sort;
            }
            
            // Call the unified getMeasurements method
            $data = $this->mongoService->getMeasurements($filters);
            
            return [
                'success' => true,
                'data' => $data,
                'count' => count($data),
                'filters' => $filters,
                'timestamp' => date('Y-m-d H:i:s')
            ];
            
        } catch (\Exception $e) {
            Yii::error("MongoDB measurements API error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'timestamp' => date('Y-m-d H:i:s')
            ];
        }
    }
    
    /**
     * GET /api/mongodb/data-series-list
     * Get list of unique DataSeriesIds based on conditionId and deviceId
     * 
     * Supported parameters:
     * - deviceId: Filter by device ID (required)
     * - conditionId: Filter by condition ID (required) - will look up condition name from MySQL
     * - faultId: Filter by fault ID (optional)
     */
    public function actionDataSeriesList()
    {
        $request = Yii::$app->request;
        
        try {
            // Get required parameters
            $deviceId = $request->get('deviceId');
            $conditionId = $request->get('conditionId');
            
            if (!$deviceId) {
                return [
                    'success' => false,
                    'error' => 'deviceId parameter is required',
                    'timestamp' => date('Y-m-d H:i:s')
                ];
            }
            
            if (!$conditionId) {
                return [
                    'success' => false,
                    'error' => 'conditionId parameter is required',
                    'timestamp' => date('Y-m-d H:i:s')
                ];
            }
            
            // Look up condition name from MySQL using conditionId (with fault relationship)
            $condition = Condition::find()->with('fault')->where(['condition_id' => $conditionId])->one();
            if (!$condition) {
                return [
                    'success' => false,
                    'error' => "Condition not found with ID: {$conditionId}",
                    'debug_info' => [
                        'searched_condition_id' => $conditionId,
                        'available_conditions' => Condition::find()->select(['condition_id', 'name'])->limit(10)->asArray()->all()
                    ],
                    'timestamp' => date('Y-m-d H:i:s')
                ];
            }
            
            // Build filters for getting measurements using the condition name from MySQL
            $filters = [
                'deviceId' => $deviceId,
                'conditionName' => $condition->name // Use the condition name from MySQL
            ];
            
            // Optional fault ID filter - look up fault name if provided
            $faultId = $request->get('faultId');
            if ($faultId && $condition->fault) {
                $filters['faultName'] = $condition->fault->fault_name;
            }
            
            // Get all measurements matching the criteria
            $measurements = $this->mongoService->getMeasurements($filters);
            
            // Extract unique dataSeriesIds
            $dataSeriesIds = [];
            foreach ($measurements as $measurement) {
                if (!empty($measurement['dataSeriesId'])) {
                    $dataSeriesIds[$measurement['dataSeriesId']] = true;
                }
            }
            
            // Convert to sorted array
            $uniqueDataSeriesIds = array_keys($dataSeriesIds);
            sort($uniqueDataSeriesIds, SORT_NATURAL);
            
            return [
                'success' => true,
                'data' => $uniqueDataSeriesIds,
                'count' => count($uniqueDataSeriesIds),
                'filters' => $filters,
                'condition_info' => [
                    'condition_id' => $condition->condition_id,
                    'condition_name' => $condition->name,
                    'fault_id' => $condition->fault_id,
                    'fault_name' => $condition->fault ? $condition->fault->fault_name : null
                ],
                'total_measurements' => count($measurements),
                'debug_info' => [
                    'mysql_condition_found' => true,
                    'mongodb_query_filters' => $filters,
                    'sample_measurements' => count($measurements) > 0 ? array_slice($measurements, 0, 2) : 'No measurements found'
                ],
                'timestamp' => date('Y-m-d H:i:s')
            ];
            
        } catch (\Exception $e) {
            Yii::error("MongoDB data series list API error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'timestamp' => date('Y-m-d H:i:s')
            ];
        }
    }
    
    /**
     * GET /api/mongodb/test-new
     * Simple test endpoint to verify new methods work
     */
    public function actionTestNew()
    {
        return [
            'success' => true,
            'message' => 'New method works!',
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }

    /**
     * GET /api/mongodb/debug-conditions
     * Debug endpoint to see what condition names are actually stored in MongoDB
     */
    public function actionDebugConditions()
    {
        $request = Yii::$app->request;
        $deviceId = $request->get('deviceId');
        $getUnknownSeries = $request->get('unknown_series');
        
        try {
            // If unknown_series parameter is provided, return unknown data series
            if ($getUnknownSeries === 'true') {
                if (!$deviceId) {
                    return [
                        'success' => false,
                        'error' => 'deviceId parameter is required for unknown series',
                        'timestamp' => date('Y-m-d H:i:s')
                    ];
                }
                
                // Build filters for getting measurements with unknown conditions and faults
                $filters = [
                    'deviceId' => $deviceId,
                    'conditionId' => 'unknown_condition',
                    'conditionName' => 'unknown_condition',
                    'faultName' => 'unknown_fault',
                    'faultId' => null
                ];
                
                // Get all measurements matching the criteria
                $measurements = $this->mongoService->getMeasurements($filters);
                
                // Extract unique dataSeriesIds
                $dataSeriesIds = [];
                foreach ($measurements as $measurement) {
                    if (!empty($measurement['dataSeriesId'])) {
                        $dataSeriesIds[$measurement['dataSeriesId']] = true;
                    }
                }
                
                // Convert to sorted array
                $uniqueDataSeriesIds = array_keys($dataSeriesIds);
                sort($uniqueDataSeriesIds, SORT_NATURAL);
                
                return [
                    'success' => true,
                    'data' => $uniqueDataSeriesIds,
                    'count' => count($uniqueDataSeriesIds),
                    'filters' => $filters,
                    'total_measurements' => count($measurements),
                    'debug_info' => [
                        'filter_conditions' => [
                            'conditionId' => 'unknown_condition',
                            'conditionName' => 'unknown_condition',
                            'faultName' => 'unknown_fault'
                        ],
                        'sample_measurements' => count($measurements) > 0 ? array_slice($measurements, 0, 2) : 'No measurements found'
                    ],
                    'timestamp' => date('Y-m-d H:i:s')
                ];
            }
            
            // Original debug conditions functionality
            $filters = [];
            if ($deviceId) {
                $filters['deviceId'] = $deviceId;
            }
            
            // Get some sample measurements to see what condition data is stored
            $measurements = $this->mongoService->getMeasurements($filters);
            
            // Extract unique condition information
            $conditionData = [];
            foreach ($measurements as $measurement) {
                $key = $measurement['conditionId'] ?? 'unknown';
                if (!isset($conditionData[$key])) {
                    $conditionData[$key] = [
                        'conditionId' => $measurement['conditionId'] ?? null,
                        'count' => 0,
                        'sample_measurement' => $measurement
                    ];
                }
                $conditionData[$key]['count']++;
            }
            
            return [
                'success' => true,
                'total_measurements' => count($measurements),
                'unique_conditions' => $conditionData,
                'device_filter' => $deviceId,
                'timestamp' => date('Y-m-d H:i:s')
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'timestamp' => date('Y-m-d H:i:s')
            ];
        }
    }

    /**
     * GET /api/mongodb/unknown-data-series-list
     * Get list of unique DataSeriesIds for unknown conditions and faults
     * 
     * Supported parameters:
     * - deviceId: Filter by device ID (required)
     * 
     * This method specifically looks for measurements with:
     * - conditionId/conditionName = "unknown_condition"
     * - faultName = "unknown_fault"
     * - faultId = null
     */
    public function actionUnknownDataSeriesList()
    {
        $request = Yii::$app->request;
        
        try {
            // Get required parameters
            $deviceId = $request->get('deviceId');
            
            if (!$deviceId) {
                return [
                    'success' => false,
                    'error' => 'deviceId parameter is required',
                    'timestamp' => date('Y-m-d H:i:s')
                ];
            }
            
            // Build filters for getting measurements with unknown conditions and faults
            // Specifically looking for null faultId
            $filters = [
                'deviceId' => $deviceId,
                'conditionId' => 'unknown_condition',
                'conditionName' => 'unknown_condition',
                'faultName' => 'unknown_fault',
                'faultId' => null
            ];
            
            // Get all measurements matching the criteria
            $measurements = $this->mongoService->getMeasurements($filters);
            
            // Extract unique dataSeriesIds
            $dataSeriesIds = [];
            foreach ($measurements as $measurement) {
                if (!empty($measurement['dataSeriesId'])) {
                    $dataSeriesIds[$measurement['dataSeriesId']] = true;
                }
            }
            
            // Convert to sorted array
            $uniqueDataSeriesIds = array_keys($dataSeriesIds);
            sort($uniqueDataSeriesIds, SORT_NATURAL);
            
            return [
                'success' => true,
                'data' => $uniqueDataSeriesIds,
                'count' => count($uniqueDataSeriesIds),
                'filters' => $filters,
                'total_measurements' => count($measurements),
                'debug_info' => [
                    'filter_conditions' => [
                        'conditionId' => 'unknown_condition',
                        'conditionName' => 'unknown_condition',
                        'faultName' => 'unknown_fault'
                    ],
                    'sample_measurements' => count($measurements) > 0 ? array_slice($measurements, 0, 2) : 'No measurements found'
                ],
                'timestamp' => date('Y-m-d H:i:s')
            ];
            
        } catch (\Exception $e) {
            Yii::error("MongoDB unknown data series list API error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'timestamp' => date('Y-m-d H:i:s')
            ];
        }
    }
}
