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
 * MongoDB Data API Controller
 * 
 * Provides REST API endpoints for retrieving electrical measurement data from MongoDB
 */
class MongoDataController extends Controller
{
    private $mongoService;
    
    public function behaviors()
    {
        return [
            'corsFilter' => [
                'class' => Cors::class,
                'cors' => [
                    'Origin' => ['*'],
                    'Access-Control-Request-Method' => ['GET', 'POST', 'OPTIONS'],
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
    
    /**
     * Initialize MongoDB service
     */
    public function init()
    {
        parent::init();
        
        try {
            $this->mongoService = new MongoDBService();
        } catch (\Exception $e) {
            Yii::error("Failed to initialize MongoDB service: " . $e->getMessage(), 'api.mongo-data');
            throw new \yii\web\ServerErrorHttpException('MongoDB service unavailable');
        }
    }
    
    /**
     * Fetch measurement data from MongoDB
     * 
     * @param string $deviceId Optional device ID filter
     * @param string $faultId Optional fault ID filter
     * @param string $conditionId Optional condition ID filter
     * @param string $dataSeriesId Optional data series ID filter
     * @param string $timeRange Optional time range (e.g., "1h", "6h", "24h", "7d")
     * @param int $limit Maximum number of records to return
     * @param int $offset Offset for pagination
     * @param bool $includeData Whether to include decompressed waveform data
     * 
     * @return array JSON response with measurement data
     */
    public function actionFetch(
        $deviceId = null,
        $faultId = null,
        $conditionId = null,
        $dataSeriesId = null,
        $timeRange = null,
        $limit = 100,
        $offset = 0,
        $includeData = false
    ) {
        Yii::$app->response->format = Response::FORMAT_JSON;
        
        try {
            // Build filter parameters
            $filter = [];
            
            if ($deviceId) {
                $filter['deviceId'] = $deviceId;
            }
            
            if ($faultId) {
                $filter['faultId'] = $faultId;
            }
            
            if ($conditionId) {
                $filter['conditionId'] = $conditionId;
            }
            
            if ($dataSeriesId) {
                $filter['dataSeriesId'] = $dataSeriesId;
            }
            
            if ($timeRange) {
                $filter['timeRange'] = $this->parseTimeRange($timeRange);
            }
            
            // Query options
            $options = [
                'limit' => min((int)$limit, 1000), // Cap at 1000 records
                'skip' => (int)$offset,
                'sort' => ['timestamp' => -1]
            ];
            
            Yii::info("Fetching MongoDB data with params: deviceId={$deviceId}, faultId={$faultId}, conditionId={$conditionId}, dataSeriesId={$dataSeriesId}, timeRange={$timeRange}", 'api.mongo-data');
            
            // Execute query
            $data = $this->mongoService->getMeasurementData($deviceId, $options['limit']);
            
            // Process results
            $processedData = [];
            foreach ($data as $record) {
                $processedRecord = [
                    'id' => $record['_id'],
                    'deviceId' => $record['deviceId'],
                    'timestamp' => $record['timestamp'],
                    'data' => $record['data']
                ];
                
                $processedData[] = $processedRecord;
            }
            
            return [
                'success' => true,
                'message' => 'MongoDB data retrieved successfully',
                'data' => $processedData,
                'count' => count($processedData),
                'filters' => $filter,
                'options' => $options
            ];
            
        } catch (\Exception $e) {
            Yii::error("Error fetching MongoDB data: " . $e->getMessage(), 'api.mongo-data');
            
            return [
                'success' => false,
                'error' => 'Failed to fetch MongoDB data: ' . $e->getMessage(),
                'data' => []
            ];
        }
    }
    
    /**
     * Fetch hierarchical data summary from MongoDB
     * 
     * @return array JSON response with hierarchical data structure
     */
    public function actionHierarchy() 
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        
        try {
            // Get aggregated data by dataSeriesId
            $pipeline = [
                [
                    '$group' => [
                        '_id' => [
                            'dataSeriesId' => '$dataSeriesId',
                            'conditionId' => '$conditionId',
                            'faultId' => '$faultId'
                        ],
                        'count' => ['$sum' => 1],
                        'latest_timestamp' => ['$max' => '$timestamp'],
                        'earliest_timestamp' => ['$min' => '$timestamp'],
                        'total_samples' => ['$sum' => '$total_samples'],
                        'avg_compression_ratio' => ['$avg' => '$compression_ratio']
                    ]
                ],
                [
                    '$sort' => ['latest_timestamp' => -1]
                ]
            ];
            
            $collection = $this->mongoClient->getCollection('raw_waveforms');
            $cursor = $collection->aggregate($pipeline);
            
            $hierarchicalData = [];
            foreach ($cursor as $doc) {
                $dataSeriesId = $doc['_id']['dataSeriesId'];
                $conditionId = $doc['_id']['conditionId'];
                $faultId = $doc['_id']['faultId'];
                
                if (!isset($hierarchicalData[$dataSeriesId])) {
                    $hierarchicalData[$dataSeriesId] = [
                        'dataSeriesId' => $dataSeriesId,
                        'conditions' => []
                    ];
                }
                
                if (!isset($hierarchicalData[$dataSeriesId]['conditions'][$conditionId])) {
                    $hierarchicalData[$dataSeriesId]['conditions'][$conditionId] = [
                        'conditionId' => $conditionId,
                        'faults' => []
                    ];
                }
                
                $hierarchicalData[$dataSeriesId]['conditions'][$conditionId]['faults'][$faultId] = [
                    'faultId' => $faultId,
                    'measurements' => $doc['count'],
                    'latest_timestamp' => $doc['latest_timestamp']->toDateTime()->getTimestamp(),
                    'earliest_timestamp' => $doc['earliest_timestamp']->toDateTime()->getTimestamp(),
                    'total_samples' => $doc['total_samples'],
                    'avg_compression_ratio' => round($doc['avg_compression_ratio'], 2)
                ];
            }
            
            // Convert to indexed arrays
            foreach ($hierarchicalData as &$series) {
                $series['conditions'] = array_values($series['conditions']);
                foreach ($series['conditions'] as &$condition) {
                    $condition['faults'] = array_values($condition['faults']);
                }
            }
            
            return [
                'success' => true,
                'message' => 'Hierarchical data retrieved successfully',
                'data' => array_values($hierarchicalData)
            ];
            
        } catch (\Exception $e) {
            Yii::error("Error fetching hierarchical data: " . $e->getMessage(), 'api.mongo-data');
            
            return [
                'success' => false,
                'error' => 'Failed to fetch hierarchical data: ' . $e->getMessage(),
                'data' => []
            ];
        }
    }
    
    /**
     * Get MongoDB statistics
     * 
     * @return array JSON response with MongoDB statistics
     */
    public function actionStats() 
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        
        try {
            // Get basic stats from MongoDB
            $totalDevices = count($this->mongoService->getMeasurementData(null, 0));
            
            return [
                'success' => true,
                'message' => 'MongoDB statistics retrieved successfully',
                'data' => [
                    'database' => 'device_measurements',
                    'collection' => 'measurements',
                    'total_measurements' => $totalDevices,
                    'connection_status' => 'connected'
                ]
            ];
            
        } catch (\Exception $e) {
            Yii::error("Error getting MongoDB stats: " . $e->getMessage(), 'api.mongo-data');
            
            return [
                'success' => false,
                'error' => 'Failed to get MongoDB statistics: ' . $e->getMessage(),
                'data' => []
            ];
        }
    }
    
    /**
     * Parse time range string into start/end timestamps
     * 
     * @param string $timeRange Time range string (e.g., "1h", "6h", "24h", "7d")
     * @return array Array with 'start' and 'end' timestamps
     */
    private function parseTimeRange($timeRange) 
    {
        $now = time();
        $start = $now;
        
        if (preg_match('/^(\d+)([hd])$/', $timeRange, $matches)) {
            $value = (int)$matches[1];
            $unit = $matches[2];
            
            switch ($unit) {
                case 'h':
                    $start = $now - ($value * 3600); // hours to seconds
                    break;
                case 'd':
                    $start = $now - ($value * 86400); // days to seconds
                    break;
            }
        }
        
        return [
            'start' => $start,
            'end' => $now
        ];
    }
    
    /**
     * Test MongoDB connection
     * 
     * @return array JSON response with connection status
     */
    public function actionPing() 
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        
        try {
            $stats = $this->mongoClient->getStats();
            
            return [
                'success' => true,
                'message' => 'MongoDB connection successful',
                'timestamp' => time(),
                'database' => $stats['config']['database'] ?? 'unknown'
            ];
            
        } catch (\Exception $e) {
            return [
                'success' => false,
                'error' => 'MongoDB connection failed: ' . $e->getMessage(),
                'timestamp' => time()
            ];
        }
    }
}
