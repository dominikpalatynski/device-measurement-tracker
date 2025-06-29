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
     * GET /api/mongodb/measurements
     * Get measurement data with flexible filtering
     * 
     * Supported parameters:
     * - deviceId: Filter by device ID
     * - faultId: Filter by fault ID
     * - conditionId: Filter by condition ID
     * - dataSeriesId: Filter by data series ID
     * - conditionName: Filter by condition name
     * - faultName: Filter by fault name
     * - dataSeriesValue: Filter by data series value
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
            
            if ($faultName = $request->get('faultName')) {
                $filters['faultName'] = $faultName;
            }
            
            if ($dataSeriesValue = $request->get('dataSeriesValue')) {
                $filters['dataSeriesValue'] = $dataSeriesValue;
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
}
