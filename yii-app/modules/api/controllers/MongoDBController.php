<?php

namespace app\modules\api\controllers;

use Yii;
use yii\web\Controller;
use yii\web\Response;
use yii\filters\Cors;
use yii\filters\ContentNegotiator;
use yii\helpers\Json;
use app\services\MongoDBService;

/**
 * MongoDB API Controller for testing measurement data operations
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
                    'Origin' => ['*'],
                    'Access-Control-Request-Method' => ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
                    'Access-Control-Request-Headers' => ['*'],
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
     * POST /api/mongodb/measurement
     * Save measurement data
     */
    public function actionMeasurement()
    {
        $request = Yii::$app->request;
        
        if (!$request->isPost) {
            return [
                'success' => false,
                'error' => 'Only POST method allowed'
            ];
        }
        
        try {
            $data = Json::decode($request->getRawBody());
            
            if (!isset($data['deviceId'])) {
                return [
                    'success' => false,
                    'error' => 'deviceId is required'
                ];
            }
            
            $deviceId = $data['deviceId'];
            $measurementData = $data['data'] ?? $data;
            
            $result = $this->mongoService->saveMeasurementData($deviceId, $measurementData);
            
            if ($result) {
                return [
                    'success' => true,
                    'message' => 'Measurement data saved successfully',
                    'deviceId' => $deviceId,
                    'timestamp' => date('Y-m-d H:i:s')
                ];
            } else {
                return [
                    'success' => false,
                    'error' => 'Failed to save measurement data'
                ];
            }
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'Invalid JSON data: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * GET /api/mongodb/measurements?deviceId={deviceId}&limit={limit}
     * Get measurement data
     */
    public function actionMeasurements()
    {
        $request = Yii::$app->request;
        
        try {
            $deviceId = $request->get('deviceId');
            $limit = (int)$request->get('limit', 10);
            
            $data = $this->mongoService->getMeasurementData($deviceId, $limit);
            
            return [
                'success' => true,
                'data' => $data,
                'count' => count($data),
                'filters' => [
                    'deviceId' => $deviceId,
                    'limit' => $limit
                ]
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * GET /api/mongodb/stats?deviceId={deviceId}
     * Get device statistics
     */
    public function actionStats()
    {
        $request = Yii::$app->request;
        
        try {
            $deviceId = $request->get('deviceId');
            
            if (!$deviceId) {
                return [
                    'success' => false,
                    'error' => 'deviceId parameter is required'
                ];
            }
            
            $stats = $this->mongoService->getDeviceStats($deviceId);
            
            return [
                'success' => true,
                'stats' => $stats
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * GET /api/mongodb/latest?deviceId={deviceId}
     * Get latest measurement for a device
     */
    public function actionLatest()
    {
        $request = Yii::$app->request;
        
        try {
            $deviceId = $request->get('deviceId');
            
            if (!$deviceId) {
                return [
                    'success' => false,
                    'error' => 'deviceId parameter is required'
                ];
            }
            
            $latest = $this->mongoService->getLatestMeasurement($deviceId);
            
            return [
                'success' => true,
                'data' => $latest
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * GET /api/mongodb/aggregated?deviceId={deviceId}&timeRange={timeRange}
     * Get aggregated data for analytics
     */
    public function actionAggregated()
    {
        $request = Yii::$app->request;
        
        try {
            $deviceId = $request->get('deviceId');
            $timeRange = $request->get('timeRange', '1h');
            
            if (!$deviceId) {
                return [
                    'success' => false,
                    'error' => 'deviceId parameter is required'
                ];
            }
            
            $data = $this->mongoService->getAggregatedData($deviceId, $timeRange);
            
            return [
                'success' => true,
                'data' => $data,
                'count' => count($data),
                'parameters' => [
                    'deviceId' => $deviceId,
                    'timeRange' => $timeRange
                ]
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * DELETE /api/mongodb/cleanup?days={days}
     * Delete old measurements
     */
    public function actionCleanup()
    {
        $request = Yii::$app->request;
        
        if (!$request->isDelete) {
            return [
                'success' => false,
                'error' => 'Only DELETE method allowed'
            ];
        }
        
        try {
            $days = (int)$request->get('days', 30);
            
            $deletedCount = $this->mongoService->deleteOldMeasurements($days);
            
            return [
                'success' => true,
                'message' => 'Old measurements deleted successfully',
                'deletedCount' => $deletedCount,
                'olderThanDays' => $days
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * GET /api/mongodb/range?deviceId={deviceId}&startTime={timestamp}&endTime={timestamp}
     * Get measurements within a time range
     */
    public function actionRange()
    {
        $request = Yii::$app->request;
        
        try {
            $deviceId = $request->get('deviceId');
            $startTime = (int)$request->get('startTime');
            $endTime = (int)$request->get('endTime');
            
            if (!$deviceId || !$startTime || !$endTime) {
                return [
                    'success' => false,
                    'error' => 'deviceId, startTime, and endTime parameters are required'
                ];
            }
            
            $data = $this->mongoService->getMeasurementsInRange($deviceId, $startTime, $endTime);
            
            return [
                'success' => true,
                'data' => $data,
                'count' => count($data),
                'parameters' => [
                    'deviceId' => $deviceId,
                    'startTime' => date('Y-m-d H:i:s', $startTime),
                    'endTime' => date('Y-m-d H:i:s', $endTime)
                ]
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    // ==============================================
    // NEW ENHANCED ENDPOINTS
    // ==============================================
    
    /**
     * Get data series measurements (by dataSeriesId)
     */
    public function actionDataSeries()
    {
        $request = Yii::$app->request;
        
        try {
            $dataSeriesId = $request->get('dataSeriesId');
            $timeRange = $request->get('timeRange', '-24h');
            
            if (!$dataSeriesId) {
                return [
                    'success' => false,
                    'error' => 'dataSeriesId parameter is required'
                ];
            }
            
            $result = $this->mongoService->fetchDataSeriesMeasurements($dataSeriesId, $timeRange);
            
            return $result;
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get condition data (all data series under a condition by conditionId)
     */
    public function actionCondition()
    {
        $request = Yii::$app->request;
        
        try {
            $conditionId = $request->get('conditionId');
            $timeRange = $request->get('timeRange', '-24h');
            
            if (!$conditionId) {
                return [
                    'success' => false,
                    'error' => 'conditionId parameter is required'
                ];
            }
            
            $result = $this->mongoService->fetchConditionData($conditionId, $timeRange);
            
            return $result;
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get fault data (all conditions under a fault)
     */
    public function actionFault()
    {
        $request = Yii::$app->request;
        
        try {
            $faultId = $request->get('faultId');
            $timeRange = $request->get('timeRange', '-24h');
            
            if (!$faultId) {
                return [
                    'success' => false,
                    'error' => 'faultId parameter is required'
                ];
            }
            
            $result = $this->mongoService->fetchFaultData($faultId, $timeRange);
            
            return $result;
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get device data (complete hierarchy: faults -> conditions -> data series)
     */
    public function actionDevice()
    {
        $request = Yii::$app->request;
        
        try {
            $deviceId = $request->get('deviceId');
            $timeRange = $request->get('timeRange', '-24h');
            
            if (!$deviceId) {
                return [
                    'success' => false,
                    'error' => 'deviceId parameter is required'
                ];
            }
            
            $result = $this->mongoService->fetchDeviceData($deviceId, $timeRange);
            
            return $result;
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get all conditions data
     */
    public function actionAllConditions()
    {
        $request = Yii::$app->request;
        
        try {
            $deviceId = $request->get('deviceId'); // Optional
            $timeRange = $request->get('timeRange', '-24h');
            
            $result = $this->mongoService->fetchAllConditionsData($deviceId, $timeRange);
            
            return $result;
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get all devices
     */
    public function actionDevices()
    {
        try {
            $devices = $this->mongoService->getAllDevices();
            
            return [
                'success' => true,
                'data' => $devices,
                'count' => count($devices)
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Create device
     */
    public function actionCreateDevice()
    {
        $request = Yii::$app->request;
        
        try {
            $data = $request->getBodyParams();
            
            $deviceId = $data['deviceId'] ?? null;
            $deviceName = $data['deviceName'] ?? null;
            $deviceType = $data['deviceType'] ?? 'unknown';
            $metadata = $data['metadata'] ?? [];
            
            if (!$deviceId || !$deviceName) {
                return [
                    'success' => false,
                    'error' => 'deviceId and deviceName are required'
                ];
            }
            
            $result = $this->mongoService->createDevice($deviceId, $deviceName, $deviceType, $metadata);
            
            return [
                'success' => $result,
                'message' => $result ? 'Device created/updated successfully' : 'Failed to create device',
                'deviceId' => $deviceId
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Create fault
     */
    public function actionCreateFault()
    {
        $request = Yii::$app->request;
        
        try {
            $data = $request->getBodyParams();
            
            $faultId = $data['faultId'] ?? null;
            $deviceId = $data['deviceId'] ?? null;
            $faultName = $data['faultName'] ?? null;
            $metadata = $data['metadata'] ?? [];
            
            if (!$faultId || !$deviceId || !$faultName) {
                return [
                    'success' => false,
                    'error' => 'faultId, deviceId, and faultName are required'
                ];
            }
            
            $result = $this->mongoService->createFault($faultId, $deviceId, $faultName, $metadata);
            
            return [
                'success' => $result,
                'message' => $result ? 'Fault created/updated successfully' : 'Failed to create fault',
                'faultId' => $faultId
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Create condition
     */
    public function actionCreateCondition()
    {
        $request = Yii::$app->request;
        
        try {
            $data = $request->getBodyParams();
            
            $conditionId = $data['conditionId'] ?? null;
            $faultId = $data['faultId'] ?? null;
            $name = $data['name'] ?? null;
            $metadata = $data['metadata'] ?? [];
            
            if (!$conditionId || !$faultId || !$name) {
                return [
                    'success' => false,
                    'error' => 'conditionId, faultId, and name are required'
                ];
            }
            
            $result = $this->mongoService->createCondition($conditionId, $faultId, $name, $metadata);
            
            return [
                'success' => $result,
                'message' => $result ? 'Condition created/updated successfully' : 'Failed to create condition',
                'conditionId' => $conditionId
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Create data series
     */
    public function actionCreateDataSeries()
    {
        $request = Yii::$app->request;
        
        try {
            $data = $request->getBodyParams();
            
            $dataSeriesId = $data['dataSeriesId'] ?? null;
            $conditionId = $data['conditionId'] ?? null;
            $metadata = $data['metadata'] ?? [];
            
            if (!$dataSeriesId || !$conditionId) {
                return [
                    'success' => false,
                    'error' => 'dataSeriesId and conditionId are required'
                ];
            }
            
            $result = $this->mongoService->createDataSeries($dataSeriesId, $conditionId, $metadata);
            
            return [
                'success' => $result,
                'message' => $result ? 'Data series created/updated successfully' : 'Failed to create data series',
                'dataSeriesId' => $dataSeriesId
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Get database information
     */
    public function actionDbInfo()
    {
        try {
            $info = $this->mongoService->getDatabaseInfo();
            
            return [
                'success' => true,
                'data' => $info
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
    
    /**
     * Migrate existing documents to add hierarchy IDs
     */
    public function actionMigrate()
    {
        $request = Yii::$app->request;
        
        try {
            $limit = (int)$request->get('limit', 1000);
            
            $result = $this->mongoService->migrateExistingDocuments($limit);
            
            return $result;
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
}
