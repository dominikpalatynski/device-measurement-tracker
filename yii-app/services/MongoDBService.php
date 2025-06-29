<?php

namespace app\services;

use yii\base\Component;
use MongoDB\Client;
use MongoDB\Collection;
use MongoDB\BSON\UTCDateTime;
use MongoDB\BSON\ObjectId;
use MongoDB\Exception\Exception as MongoDBException;

/**
 * MongoDB service using the official MongoDB PHP driver
 * Focused solely on measurement data storage and retrieval.
 * All device, fault, condition and data series info comes from MySQL.
 */
class MongoDBService extends Component
{
    private $client;
    private $database;
    
    // Collections
    private $measurementsCollection;
    private $writeStats;
    
    public $connectionString = 'mongodb://admin:password@localhost:27017';
    public $databaseName = 'device_measurements';
    
    // Collection names
    public $collectionsConfig = [
        'measurements' => 'measurements'
    ];
    
    public function __construct($config = [])
    {
        parent::__construct($config);
        $this->initMongoDB();
        $this->initializeWriteStats();
    }
    
    private function initMongoDB()
    {
        try {
            $this->client = new Client($this->connectionString);
            $this->database = $this->client->selectDatabase($this->databaseName);
            
            // Initialize collections
            $this->measurementsCollection = $this->database->selectCollection($this->collectionsConfig['measurements']);
            
            // Test the connection
            $this->client->listDatabases();
            
            // Create indexes for performance
            $this->createIndexes();
            
            \Yii::info("MongoDB connection established successfully");
        } catch (MongoDBException $e) {
            \Yii::error("Failed to connect to MongoDB: " . $e->getMessage());
            throw $e;
        }
    }
    
    private function initializeWriteStats()
    {
        $this->writeStats = [
            'total_writes' => 0,
            'successful_writes' => 0,
            'failed_writes' => 0,
            'total_points' => 0,
            'last_write_time' => null,
            'errors' => []
        ];
    }
    
    private function createIndexes()
    {
        try {
            // Measurements collection indexes
            $this->measurementsCollection->createIndex(['deviceId' => 1, 'timestamp' => -1]);
            $this->measurementsCollection->createIndex(['faultId' => 1, 'timestamp' => -1]);
            $this->measurementsCollection->createIndex(['conditionId' => 1, 'timestamp' => -1]);
            $this->measurementsCollection->createIndex(['dataSeriesId' => 1, 'timestamp' => -1]);
            $this->measurementsCollection->createIndex(['timestamp' => -1]);
            
            \Yii::info("MongoDB indexes created successfully");
        } catch (MongoDBException $e) {
            \Yii::warning("Failed to create some MongoDB indexes: " . $e->getMessage());
        }
    }
    
    
    // ==============================================
    // MEASUREMENT DATA METHODS
    // ==============================================
    
    /**
     * Save measurement data to MongoDB with simplified hierarchy using actual values as IDs
     */
    public function saveMeasurementData($deviceId, $data)
    {
        try {
            $this->writeStats['total_writes']++;
            
            // Extract condition and data series info from the current data structure
            $conditionName = $data['condition_name'] ?? 'unknown_condition';
            $dataSeriesValue = $data['data_series'] ?? 'unknown_series';
            
            // Use simplified ID generation: actual values as IDs
            $faultId = $deviceId; // Use deviceId as faultId
            $conditionId = $conditionName; // Use condition name as conditionId
            $dataSeriesId = $dataSeriesValue; // Use data series value as dataSeriesId
            
            // Prepare the document with hierarchy IDs at TOP LEVEL for easy filtering
            $document = [
                // TOP-LEVEL FIELDS FOR FILTERING
                'deviceId' => $deviceId,
                'faultId' => $faultId,
                'conditionId' => $conditionId,
                'dataSeriesId' => $dataSeriesId,
                'sequenceNumber' => $data['sequenceNumber'] ?? null,
                
                // TIMESTAMP AND METADATA
                'timestamp' => new UTCDateTime(),
                'created_at' => new UTCDateTime(),
                
                // ACTUAL DATA (preserve original structure)
                'data' => $data['data'] ?? $data
            ];
            
            // Copy additional fields from original data if they exist
            foreach (['timestamp', 'sequenceNumber'] as $field) {
                if (isset($data[$field])) {
                    if ($field === 'timestamp' && is_string($data[$field])) {
                        // Convert string timestamp to MongoDB UTCDateTime
                        $document[$field] = new UTCDateTime(strtotime($data[$field]) * 1000);
                    } else {
                        $document[$field] = $data[$field];
                    }
                }
            }
            
            $result = $this->measurementsCollection->insertOne($document);
            
            $this->writeStats['successful_writes']++;
            $this->writeStats['total_points']++;
            $this->writeStats['last_write_time'] = time();
            
            \Yii::info("Measurement data saved to MongoDB with ID: " . $result->getInsertedId() . 
                      " [Device: {$deviceId}, Fault: {$faultId}, Condition: {$conditionId}, DataSeries: {$dataSeriesId}]");
            return true;
        } catch (MongoDBException $e) {
            $this->writeStats['failed_writes']++;
            $this->writeStats['errors'][] = [
                'timestamp' => time(),
                'error' => $e->getMessage(),
                'deviceId' => $deviceId
            ];
            \Yii::error("Failed to save measurement data to MongoDB: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Unified method to retrieve measurement data with flexible filtering
     * 
     * @param array $filters Optional filters:
     *   - deviceId: string
     *   - faultId: string
     *   - conditionId: string
     *   - dataSeriesId: string
     *   - conditionName: string (converted to conditionId)
     *   - dataSeriesValue: string (converted to dataSeriesId)
     *   - startTime: int (Unix timestamp)
     *   - endTime: int (Unix timestamp)
     *   - timeRange: string (e.g., '-24h', '-1d', '-1w')
     *   - latest: bool (get only the latest measurement)
     *   - limit: int (default: 100)
     *   - sort: array (default: ['timestamp' => -1])
     * 
     * @return array Array of measurement documents
     */
    public function getMeasurements($filters = [])
    {
        try {
            $mongoFilter = [];
            $options = [
                'sort' => $filters['sort'] ?? ['timestamp' => -1]
            ];
            
            // Device filter
            if (!empty($filters['deviceId'])) {
                $mongoFilter['deviceId'] = $filters['deviceId'];
            }
            
            // Fault filter
            if (!empty($filters['faultId'])) {
                $mongoFilter['faultId'] = $filters['faultId'];
            }
            
            // Condition filters
            if (!empty($filters['conditionId'])) {
                $mongoFilter['conditionId'] = $filters['conditionId'];
            } elseif (!empty($filters['conditionName'])) {
                // Convert condition name to conditionId using the new ID format
                $conditionId = $filters['conditionName'];
                if (!empty($filters['deviceId'])) {
                    $conditionId = $filters['deviceId'] . '_' . $conditionId;
                }
                $mongoFilter['conditionId'] = $conditionId;
            }
            
            // Data series filters
            if (!empty($filters['dataSeriesId'])) {
                $mongoFilter['dataSeriesId'] = $filters['dataSeriesId'];
            } elseif (!empty($filters['dataSeriesValue'])) {
                // Convert data series value to dataSeriesId using the new ID format
                $dataSeriesId = $filters['dataSeriesValue'];
                if (!empty($filters['deviceId'])) {
                    $dataSeriesId = $filters['deviceId'] . '_' . $dataSeriesId;
                }
                $mongoFilter['dataSeriesId'] = $dataSeriesId;
            }
            
            // Time range filters
            if (!empty($filters['startTime']) || !empty($filters['endTime']) || !empty($filters['timeRange'])) {
                $timeFilter = [];
                
                if (!empty($filters['timeRange'])) {
                    $startTime = $this->parseTimeRange($filters['timeRange']);
                    $timeFilter['$gte'] = new UTCDateTime($startTime * 1000);
                } elseif (!empty($filters['startTime'])) {
                    $timeFilter['$gte'] = new UTCDateTime($filters['startTime'] * 1000);
                }
                
                if (!empty($filters['endTime'])) {
                    $timeFilter['$lte'] = new UTCDateTime($filters['endTime'] * 1000);
                }
                
                if (!empty($timeFilter)) {
                    $mongoFilter['timestamp'] = $timeFilter;
                }
            }
            
            // Set limit
            if (!empty($filters['latest']) && $filters['latest'] === true) {
                $options['limit'] = 1;
            } elseif (!empty($filters['limit'])) {
                $options['limit'] = (int)$filters['limit'];
            } elseif (!isset($filters['limit'])) {
                $options['limit'] = 100; // Default limit
            }
            
            // Execute query
            if (!empty($filters['latest']) && $filters['latest'] === true) {
                $document = $this->measurementsCollection->findOne($mongoFilter, $options);
                if (!$document) {
                    return null;
                }
                return $this->formatMeasurementDocument($document);
            } else {
                $cursor = $this->measurementsCollection->find($mongoFilter, $options);
                $data = [];
                foreach ($cursor as $document) {
                    $data[] = $this->formatMeasurementDocument($document);
                }
                return $data;
            }
            
        } catch (MongoDBException $e) {
            \Yii::error("Failed to get measurements from MongoDB: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Format a MongoDB measurement document for output
     */
    private function formatMeasurementDocument($document)
    {
        return [
            '_id' => (string)$document['_id'],
            'deviceId' => $document['deviceId'],
            'timestamp' => $document['timestamp']->toDateTime()->format('Y-m-d H:i:s'),
            'timestamp_unix' => $document['timestamp']->toDateTime()->getTimestamp(),
            'data' => $document['data'],
            'faultId' => $document['faultId'] ?? null,
            'conditionId' => $document['conditionId'] ?? null,
            'dataSeriesId' => $document['dataSeriesId'] ?? null,
            'created_at' => $document['created_at']->toDateTime()->getTimestamp()
        ];
    }


    
    
    // ==============================================
    // DATA SERIES METHODS (Level 1)
    // ==============================================
    
    /**
     * Fetch all measurements for a specific DataSeries (by dataSeriesId)
     */
    public function fetchDataSeriesMeasurements($dataSeriesId, $timeRange = '-24h')
    {
        try {
            $startTime = $this->parseTimeRange($timeRange);
            
            $filter = [
                'dataSeriesId' => $dataSeriesId,
                'timestamp' => ['$gte' => new UTCDateTime($startTime * 1000)]
            ];
            
            $cursor = $this->measurementsCollection->find($filter, [
                'sort' => ['timestamp' => 1]
            ]);
            
            $measurements = [];
            $measurementCount = 0;
            
            foreach ($cursor as $document) {
                $measurements[] = [
                    '_id' => (string)$document['_id'],
                    'deviceId' => $document['deviceId'],
                    'timestamp' => $document['timestamp']->toDateTime()->getTimestamp(),
                    'data' => $document['data'],
                    'condition_name' => $document['condition_name'] ?? null,
                    'data_series' => $document['data_series'] ?? null,
                    'sequenceNumber' => $document['sequenceNumber'] ?? null,
                    'faultId' => $document['faultId'] ?? null,
                    'conditionId' => $document['conditionId'] ?? null,
                    'dataSeriesId' => $document['dataSeriesId'] ?? null
                ];
                $measurementCount++;
            }
            
            return [
                'success' => true,
                'dataSeriesId' => $dataSeriesId,
                'totalMeasurements' => $measurementCount,
                'timeRange' => $timeRange,
                'data' => [
                    'measurementCount' => $measurementCount,
                    'measurements' => $measurements
                ]
            ];
        } catch (MongoDBException $e) {
            \Yii::error("Failed to fetch data series measurements: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'data' => null
            ];
        }
    }
    
    /**
     * Create or update a data series
     */
    public function createDataSeries($dataSeriesId, $conditionId, $metadata = [])
    {
        try {
            $document = [
                'dataSeriesId' => $dataSeriesId,
                'conditionId' => $conditionId,
                'metadata' => $metadata,
                'created_at' => new UTCDateTime(),
                'updated_at' => new UTCDateTime()
            ];
            
            $result = $this->dataSeriesCollection->replaceOne(
                ['dataSeriesId' => $dataSeriesId],
                $document,
                ['upsert' => true]
            );
            
            \Yii::info("Data series created/updated: " . $dataSeriesId);
            return true;
        } catch (MongoDBException $e) {
            \Yii::error("Failed to create data series: " . $e->getMessage());
            return false;
        }
    }
    
    // ==============================================
    // CONDITION METHODS (Level 2)
    // ==============================================
    
    /**
     * Fetch all DataSeries under one Condition (by conditionId)
     */
    public function fetchConditionData($conditionId, $timeRange = '-24h')
    {
        try {
            $startTime = $this->parseTimeRange($timeRange);
            
            \Yii::info("Fetching condition data for conditionId: {$conditionId}, timeRange: {$timeRange}");
            
            $filter = [
                'conditionId' => $conditionId,
                'timestamp' => ['$gte' => new UTCDateTime($startTime * 1000)]
            ];
            
            // Group by dataSeriesId to organize data
            $pipeline = [
                ['$match' => $filter],
                [
                    '$group' => [
                        '_id' => '$dataSeriesId',
                        'measurements' => ['$push' => '$$ROOT'],
                        'count' => ['$sum' => 1],
                        'dataSeriesValue' => ['$first' => '$data_series']
                    ]
                ],
                ['$sort' => ['_id' => 1]]
            ];
            
            $cursor = $this->measurementsCollection->aggregate($pipeline);
            
            $dataSeriesMap = [];
            $totalMeasurements = 0;
            
            foreach ($cursor as $group) {
                $dataSeriesId = $group['_id'] ?? 'unknown';
                $dataSeriesValue = $group['dataSeriesValue'] ?? 'unknown';
                
                $dataSeriesMap[$dataSeriesId] = [
                    'dataSeriesId' => $dataSeriesId,
                    'dataSeriesValue' => $dataSeriesValue,
                    'measurementCount' => $group['count'],
                    'measurements' => array_map(function($doc) {
                        return [
                            '_id' => (string)$doc['_id'],
                            'deviceId' => $doc['deviceId'],
                            'timestamp' => $doc['timestamp']->toDateTime()->getTimestamp(),
                            'data' => $doc['data'],
                            'condition_name' => $doc['condition_name'] ?? null,
                            'data_series' => $doc['data_series'] ?? null,
                            'sequenceNumber' => $doc['sequenceNumber'] ?? null
                        ];
                    }, iterator_to_array($group['measurements']))
                ];
                $totalMeasurements += $group['count'];
            }
            
            if ($totalMeasurements === 0) {
                \Yii::info("No records found for conditionId: {$conditionId}");
                return [
                    'success' => true,
                    'conditionId' => $conditionId,
                    'dataSeriesCount' => 0,
                    'totalMeasurements' => 0,
                    'timeRange' => $timeRange,
                    'data' => []
                ];
            }
            
            return [
                'success' => true,
                'conditionId' => $conditionId,
                'dataSeriesCount' => count($dataSeriesMap),
                'totalMeasurements' => $totalMeasurements,
                'timeRange' => $timeRange,
                'data' => array_values($dataSeriesMap)
            ];
        } catch (MongoDBException $e) {
            \Yii::error("Failed to fetch condition data: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'data' => null
            ];
        }
    }
    
    /**
     * Fetch all conditions data for analysis
     */
    public function fetchAllConditionsData($deviceId = null, $timeRange = '-24h')
    {
        try {
            $startTime = $this->parseTimeRange($timeRange);
            
            $filter = [
                'timestamp' => ['$gte' => new UTCDateTime($startTime * 1000)]
            ];
            
            if ($deviceId !== null) {
                $filter['deviceId'] = $deviceId;
            }
            
            // Group by conditionId (hierarchy) and condition_name (original structure)
            $pipeline = [
                ['$match' => $filter],
                [
                    '$group' => [
                        '_id' => [
                            'conditionId' => '$conditionId',
                            'condition_name' => '$condition_name'
                        ],
                        'measurements' => ['$push' => '$$ROOT'],
                        'count' => ['$sum' => 1],
                        'dataSeriesCount' => ['$addToSet' => '$dataSeriesId']
                    ]
                ],
                ['$sort' => ['_id.conditionId' => 1]]
            ];
            
            $cursor = $this->measurementsCollection->aggregate($pipeline);
            
            $allConditions = [];
            foreach ($cursor as $group) {
                $conditionId = $group['_id']['conditionId'] ?? 'unknown';
                $conditionName = $group['_id']['condition_name'] ?? 'unknown';
                
                $allConditions[$conditionId] = [
                    'conditionId' => $conditionId,
                    'conditionName' => $conditionName,
                    'measurementCount' => $group['count'],
                    'dataSeriesCount' => count($group['dataSeriesCount']),
                    'measurements' => array_map(function($doc) {
                        return [
                            '_id' => (string)$doc['_id'],
                            'deviceId' => $doc['deviceId'],
                            'timestamp' => $doc['timestamp']->toDateTime()->getTimestamp(),
                            'data' => $doc['data'],
                            'condition_name' => $doc['condition_name'] ?? null,
                            'data_series' => $doc['data_series'] ?? null,
                            'sequenceNumber' => $doc['sequenceNumber'] ?? null
                        ];
                    }, iterator_to_array($group['measurements']))
                ];
            }
            
            return [
                'success' => true,
                'conditionsCount' => count($allConditions),
                'deviceId' => $deviceId,
                'timeRange' => $timeRange,
                'conditions' => $allConditions
            ];
        } catch (MongoDBException $e) {
            \Yii::error("Failed to fetch all conditions data: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'data' => null
            ];
        }
    }
    
    /**
     * Fetch data by condition name (works with original structure)
     */
    public function fetchDataByConditionName($conditionName, $deviceId = null, $timeRange = '-24h')
    {
        try {
            $startTime = $this->parseTimeRange($timeRange);
            
            $filter = [
                'condition_name' => $conditionName,
                'timestamp' => ['$gte' => new UTCDateTime($startTime * 1000)]
            ];
            
            if ($deviceId !== null) {
                $filter['deviceId'] = $deviceId;
            }
            
            // Group by data_series value
            $pipeline = [
                ['$match' => $filter],
                [
                    '$group' => [
                        '_id' => '$data_series',
                        'measurements' => ['$push' => '$$ROOT'],
                        'count' => ['$sum' => 1]
                    ]
                ],
                ['$sort' => ['_id' => 1]]
            ];
            
            $cursor = $this->measurementsCollection->aggregate($pipeline);
            
            $dataSeries = [];
            $totalMeasurements = 0;
            
            foreach ($cursor as $group) {
                $dataSeriesValue = $group['_id'] ?? 'unknown';
                $dataSeries[$dataSeriesValue] = [
                    'dataSeriesValue' => $dataSeriesValue,
                    'measurementCount' => $group['count'],
                    'measurements' => array_map(function($doc) {
                        return [
                            '_id' => (string)$doc['_id'],
                            'deviceId' => $doc['deviceId'],
                            'timestamp' => $doc['timestamp']->toDateTime()->getTimestamp(),
                            'data' => $doc['data'],
                            'condition_name' => $doc['condition_name'] ?? null,
                            'data_series' => $doc['data_series'] ?? null,
                            'sequenceNumber' => $doc['sequenceNumber'] ?? null
                        ];
                    }, iterator_to_array($group['measurements']))
                ];
                $totalMeasurements += $group['count'];
            }
            
            return [
                'success' => true,
                'conditionName' => $conditionName,
                'deviceId' => $deviceId,
                'dataSeriesCount' => count($dataSeries),
                'totalMeasurements' => $totalMeasurements,
                'timeRange' => $timeRange,
                'data' => $dataSeries
            ];
        } catch (MongoDBException $e) {
            \Yii::error("Failed to fetch data by condition name: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'data' => null
            ];
        }
    }
    
    /**
     * Fetch data by data series value (works with original structure)
     */
    public function fetchDataByDataSeries($dataSeriesValue, $deviceId = null, $timeRange = '-24h')
    {
        try {
            $startTime = $this->parseTimeRange($timeRange);
            
            $filter = [
                'data_series' => $dataSeriesValue,
                'timestamp' => ['$gte' => new UTCDateTime($startTime * 1000)]
            ];
            
            if ($deviceId !== null) {
                $filter['deviceId'] = $deviceId;
            }
            
            $cursor = $this->measurementsCollection->find($filter, [
                'sort' => ['timestamp' => 1]
            ]);
            
            $measurements = [];
            $measurementCount = 0;
            
            foreach ($cursor as $document) {
                $measurements[] = [
                    '_id' => (string)$document['_id'],
                    'deviceId' => $document['deviceId'],
                    'timestamp' => $document['timestamp']->toDateTime()->getTimestamp(),
                    'data' => $document['data'],
                    'condition_name' => $document['condition_name'] ?? null,
                    'data_series' => $document['data_series'] ?? null,
                    'sequenceNumber' => $document['sequenceNumber'] ?? null,
                    'conditionId' => $document['conditionId'] ?? null,
                    'dataSeriesId' => $document['dataSeriesId'] ?? null
                ];
                $measurementCount++;
            }
            
            return [
                'success' => true,
                'dataSeriesValue' => $dataSeriesValue,
                'deviceId' => $deviceId,
                'totalMeasurements' => $measurementCount,
                'timeRange' => $timeRange,
                'data' => $measurements
            ];
        } catch (MongoDBException $e) {
            \Yii::error("Failed to fetch data by data series: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'data' => null
            ];
        }
    }
    
    /**
     * Create or update a condition
     */
    public function createCondition($conditionId, $faultId, $name, $metadata = [])
    {
        try {
            $document = [
                'conditionId' => $conditionId,
                'faultId' => $faultId,
                'name' => $name,
                'metadata' => $metadata,
                'status' => 'Active',
                'created_at' => new UTCDateTime(),
                'updated_at' => new UTCDateTime()
            ];
            
            $result = $this->conditionsCollection->replaceOne(
                ['conditionId' => $conditionId],
                $document,
                ['upsert' => true]
            );
            
            \Yii::info("Condition created/updated: " . $conditionId);
            return true;
        } catch (MongoDBException $e) {
            \Yii::error("Failed to create condition: " . $e->getMessage());
            return false;
        }
    }
    
    
    // ==============================================
    // FAULT METHODS (Level 3)
    // ==============================================
    
    /**
     * Fetch all data under a specific Fault (by faultId)
     */
    public function fetchFaultData($faultId, $timeRange = '-24h')
    {
        try {
            $startTime = $this->parseTimeRange($timeRange);
            
            // Fetch data by faultId and group by conditionId
            $filter = [
                'faultId' => $faultId,
                'timestamp' => ['$gte' => new UTCDateTime($startTime * 1000)]
            ];
            
            $pipeline = [
                ['$match' => $filter],
                [
                    '$group' => [
                        '_id' => '$conditionId',
                        'measurements' => ['$push' => '$$ROOT'],
                        'count' => ['$sum' => 1],
                        'conditionName' => ['$first' => '$condition_name']
                    ]
                ],
                ['$sort' => ['_id' => 1]]
            ];
            
            $cursor = $this->measurementsCollection->aggregate($pipeline);
            
            $conditions = [];
            $totalMeasurements = 0;
            
            foreach ($cursor as $group) {
                $conditionId = $group['_id'] ?? 'unknown';
                $conditionName = $group['conditionName'] ?? 'unknown';
                
                $conditions[$conditionId] = [
                    'conditionId' => $conditionId,
                    'conditionName' => $conditionName,
                    'measurementCount' => $group['count'],
                    'measurements' => array_map(function($doc) {
                        return [
                            '_id' => (string)$doc['_id'],
                            'deviceId' => $doc['deviceId'],
                            'timestamp' => $doc['timestamp']->toDateTime()->getTimestamp(),
                            'data' => $doc['data'],
                            'condition_name' => $doc['condition_name'] ?? null,
                            'data_series' => $doc['data_series'] ?? null,
                            'sequenceNumber' => $doc['sequenceNumber'] ?? null
                        ];
                    }, iterator_to_array($group['measurements']))
                ];
                $totalMeasurements += $group['count'];
            }
            
            return [
                'success' => true,
                'faultId' => $faultId,
                'conditionsCount' => count($conditions),
                'totalMeasurements' => $totalMeasurements,
                'timeRange' => $timeRange,
                'data' => [
                    'conditions' => $conditions
                ]
            ];
        } catch (MongoDBException $e) {
            \Yii::error("Failed to fetch fault data: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'data' => null
            ];
        }
    }
    
    /**
     * Create or update a fault
     */
    public function createFault($faultId, $deviceId, $faultName, $metadata = [])
    {
        try {
            $document = [
                'faultId' => $faultId,
                'deviceId' => $deviceId,
                'faultName' => $faultName,
                'metadata' => $metadata,
                'status' => 'Active',
                'start_time' => new UTCDateTime(),
                'created_at' => new UTCDateTime(),
                'updated_at' => new UTCDateTime()
            ];
            
            $result = $this->faultsCollection->replaceOne(
                ['faultId' => $faultId],
                $document,
                ['upsert' => true]
            );
            
            \Yii::info("Fault created/updated: " . $faultId);
            return true;
        } catch (MongoDBException $e) {
            \Yii::error("Failed to create fault: " . $e->getMessage());
            return false;
        }
    }
    
    // ==============================================
    // DEVICE METHODS (Level 4)
    // ==============================================
    
    /**
     * Fetch ALL data under a Device (organized by condition_name -> data_series)
     */
    public function fetchDeviceData($deviceId, $timeRange = '-24h')
    {
        try {
            $startTime = $this->parseTimeRange($timeRange);
            
            $filter = [
                'deviceId' => $deviceId,
                'timestamp' => ['$gte' => new UTCDateTime($startTime * 1000)]
            ];
            
            // Group by condition_name and data_series to create virtual hierarchy
            $pipeline = [
                ['$match' => $filter],
                [
                    '$group' => [
                        '_id' => [
                            'condition_name' => '$condition_name',
                            'data_series' => '$data_series'
                        ],
                        'measurements' => ['$push' => '$$ROOT'],
                        'count' => ['$sum' => 1]
                    ]
                ],
                ['$sort' => ['_id.condition_name' => 1, '_id.data_series' => 1]]
            ];
            
            $cursor = $this->measurementsCollection->aggregate($pipeline);
            
            $conditions = [];
            $totalMeasurements = 0;
            
            foreach ($cursor as $group) {
                $conditionName = $group['_id']['condition_name'] ?? 'unknown';
                $dataSeriesValue = $group['_id']['data_series'] ?? 'unknown';
                
                if (!isset($conditions[$conditionName])) {
                    $conditions[$conditionName] = [
                        'conditionName' => $conditionName,
                        'dataSeries' => []
                    ];
                }
                
                $conditions[$conditionName]['dataSeries'][$dataSeriesValue] = [
                    'dataSeriesValue' => $dataSeriesValue,
                    'measurementCount' => $group['count'],
                    'measurements' => array_map(function($doc) {
                        return [
                            '_id' => (string)$doc['_id'],
                            'timestamp' => $doc['timestamp']->toDateTime()->getTimestamp(),
                            'data' => $doc['data'],
                            'condition_name' => $doc['condition_name'] ?? null,
                            'data_series' => $doc['data_series'] ?? null,
                            'sequenceNumber' => $doc['sequenceNumber'] ?? null
                        ];
                    }, iterator_to_array($group['measurements']))
                ];
                
                $totalMeasurements += $group['count'];
            }
            
            return [
                'success' => true,
                'deviceId' => $deviceId,
                'conditionsCount' => count($conditions),
                'totalMeasurements' => $totalMeasurements,
                'timeRange' => $timeRange,
                'data' => [
                    'conditions' => $conditions
                ]
            ];
        } catch (MongoDBException $e) {
            \Yii::error("Failed to fetch device data: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'data' => null
            ];
        }
    }
    
    /**
     * Create or update a device
     */
    public function createDevice($deviceId, $deviceName, $deviceType, $metadata = [])
    {
        try {
            $document = [
                'deviceId' => $deviceId,
                'deviceName' => $deviceName,
                'deviceType' => $deviceType,
                'metadata' => $metadata,
                'status' => 'Active',
                'registration_date' => new UTCDateTime(),
                'created_at' => new UTCDateTime(),
                'updated_at' => new UTCDateTime()
            ];
            
            $result = $this->devicesCollection->replaceOne(
                ['deviceId' => $deviceId],
                $document,
                ['upsert' => true]
            );
            
            \Yii::info("Device created/updated: " . $deviceId);
            return true;
        } catch (MongoDBException $e) {
            \Yii::error("Failed to create device: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Get all devices
     */
    public function getAllDevices()
    {
        try {
            $cursor = $this->devicesCollection->find([], [
                'sort' => ['created_at' => -1]
            ]);
            
            $devices = [];
            foreach ($cursor as $document) {
                $devices[] = [
                    '_id' => (string)$document['_id'],
                    'deviceId' => $document['deviceId'],
                    'deviceName' => $document['deviceName'],
                    'deviceType' => $document['deviceType'],
                    'status' => $document['status'],
                    'metadata' => $document['metadata'] ?? [],
                    'registration_date' => $document['registration_date']->toDateTime()->format('Y-m-d H:i:s'),
                    'created_at' => $document['created_at']->toDateTime()->getTimestamp()
                ];
            }
            
            return $devices;
        } catch (MongoDBException $e) {
            \Yii::error("Failed to get all devices: " . $e->getMessage());
            return [];
        }
    }

        public function parseTimeRange($timeRange)
    {
        $currentTime = time();
        
        if (is_numeric($timeRange)) {
            return (int)$timeRange;
        }
        
        if (strpos($timeRange, '-') === 0) {
            $timeRange = substr($timeRange, 1);
        }
        
        $value = (int)$timeRange;
        $unit = substr($timeRange, -1);
        
        switch ($unit) {
            case 'h':
                return $currentTime - ($value * 3600);
            case 'd':
                return $currentTime - ($value * 86400);
            case 'm':
                return $currentTime - ($value * 60);
            case 's':
                return $currentTime - $value;
            default:
                // Default to hours if no unit specified
                return $currentTime - ($value * 3600);
        }
    }
    
    /**
     * Close MongoDB connection (cleanup)
     */
    public function close()
    {
        // MongoDB PHP driver handles connection cleanup automatically
        $this->client = null;
        \Yii::info("MongoDB connection closed");
    }
    
    public function __destruct()
    {
        $this->close();
    }
    
    // ==============================================
    // BACKWARD COMPATIBILITY METHODS
    // ==============================================
    
    /**
     * Test MongoDB connection
     */
    public function testConnection()
    {
        try {
            // Test connection by listing collections
            $collections = $this->getCollections();
            
            return [
                'success' => true,
                'message' => 'MongoDB connection successful',
                'database' => $this->databaseName,
                'collections' => $collections
            ];
        } catch (\Exception $e) {
            return [
                'success' => false,
                'message' => 'MongoDB connection failed: ' . $e->getMessage()
            ];
        }
    }
    
    /**
     * Get list of collections in the database
     */
    public function getCollections()
    {
        try {
            $collections = [];
            $collectionsList = $this->database->listCollections();
            
            foreach ($collectionsList as $collection) {
                $collections[] = $collection->getName();
            }
            
            return $collections;
        } catch (\Exception $e) {
            \Yii::error("Failed to get collections: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * Get device statistics using the unified getMeasurements method
     */
    public function getDeviceStats($deviceId)
    {
        try {
            if (!$deviceId) {
                throw new \InvalidArgumentException("Device ID is required");
            }
            
            // Get total count
            $totalMeasurements = $this->getMeasurements(['deviceId' => $deviceId, 'limit' => 0]);
            $totalCount = count($totalMeasurements);
            
            // Get latest measurement
            $latest = $this->getMeasurements(['deviceId' => $deviceId, 'limit' => 1, 'sort' => 'desc']);
            $latestTimestamp = !empty($latest) ? $latest[0]['timestamp'] ?? null : null;
            
            // Get oldest measurement
            $oldest = $this->getMeasurements(['deviceId' => $deviceId, 'limit' => 1, 'sort' => 'asc']);
            $oldestTimestamp = !empty($oldest) ? $oldest[0]['timestamp'] ?? null : null;
            
            return [
                'deviceId' => $deviceId,
                'totalMeasurements' => $totalCount,
                'latestTimestamp' => $latestTimestamp,
                'oldestTimestamp' => $oldestTimestamp,
                'timespan' => $latestTimestamp && $oldestTimestamp ? 
                    ($latestTimestamp - $oldestTimestamp) : 0
            ];
            
        } catch (\Exception $e) {
            \Yii::error("Failed to get device stats for device $deviceId: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Get latest measurement for a device
     */
    public function getLatestMeasurement($deviceId)
    {
        try {
            if (!$deviceId) {
                throw new \InvalidArgumentException("Device ID is required");
            }
            
            $measurements = $this->getMeasurements([
                'deviceId' => $deviceId,
                'limit' => 1,
                'sort' => 'desc'
            ]);
            
            return !empty($measurements) ? $measurements[0] : null;
            
        } catch (\Exception $e) {
            \Yii::error("Failed to get latest measurement for device $deviceId: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Get aggregated data for analytics (simplified implementation)
     */
    public function getAggregatedData($deviceId, $timeRange = '1h')
    {
        try {
            if (!$deviceId) {
                throw new \InvalidArgumentException("Device ID is required");
            }
            
            // Get measurements for the specified time range
            $measurements = $this->getMeasurements([
                'deviceId' => $deviceId,
                'timeRange' => $timeRange,
                'limit' => 1000 // Reasonable limit for aggregation
            ]);
            
            if (empty($measurements)) {
                return [];
            }
            
            // Simple aggregation - group by hour
            $aggregated = [];
            foreach ($measurements as $measurement) {
                $timestamp = $measurement['timestamp'];
                $hour = date('Y-m-d H:00:00', $timestamp);
                
                if (!isset($aggregated[$hour])) {
                    $aggregated[$hour] = [
                        'timestamp' => strtotime($hour),
                        'hour' => $hour,
                        'count' => 0,
                        'deviceId' => $deviceId
                    ];
                }
                
                $aggregated[$hour]['count']++;
            }
            
            return array_values($aggregated);
            
        } catch (\Exception $e) {
            \Yii::error("Failed to get aggregated data for device $deviceId: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Get measurements within a time range
     */
    public function getMeasurementsInRange($deviceId, $startTime, $endTime)
    {
        try {
            if (!$deviceId || !$startTime || !$endTime) {
                throw new \InvalidArgumentException("Device ID, start time, and end time are required");
            }
            
            return $this->getMeasurements([
                'deviceId' => $deviceId,
                'startTime' => $startTime,
                'endTime' => $endTime,
                'limit' => 1000 // Reasonable default limit
            ]);
            
        } catch (\Exception $e) {
            \Yii::error("Failed to get measurements in range for device $deviceId: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Delete old measurements
     */
    public function deleteOldMeasurements($days = 30)
    {
        try {
            $cutoffTime = time() - ($days * 24 * 60 * 60);
            
            $result = $this->measurementCollection->deleteMany([
                'timestamp' => ['$lt' => $cutoffTime]
            ]);
            
            $deletedCount = $result->getDeletedCount();
            \Yii::info("Deleted $deletedCount old measurements (older than $days days)");
            
            return $deletedCount;
            
        } catch (\Exception $e) {
            \Yii::error("Failed to delete old measurements: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Get database information
     */
    public function getDatabaseInfo()
    {
        try {
            $collections = $this->getCollections();
            $stats = [];
            
            foreach ($collections as $collectionName) {
                try {
                    $collection = $this->database->selectCollection($collectionName);
                    $count = $collection->countDocuments();
                    $stats[$collectionName] = [
                        'name' => $collectionName,
                        'count' => $count
                    ];
                } catch (\Exception $e) {
                    $stats[$collectionName] = [
                        'name' => $collectionName,
                        'count' => 0,
                        'error' => $e->getMessage()
                    ];
                }
            }
            
            return [
                'database' => $this->databaseName,
                'collections' => $stats,
                'totalCollections' => count($collections)
            ];
            
        } catch (\Exception $e) {
            \Yii::error("Failed to get database info: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Migrate existing documents (placeholder implementation)
     */
    public function migrateExistingDocuments($limit = 1000)
    {
        try {
            // This is a placeholder implementation
            // In a real scenario, this would migrate old document structures to new ones
            
            $measurements = $this->measurementCollection->find([], ['limit' => $limit]);
            $migratedCount = 0;
            
            foreach ($measurements as $measurement) {
                // Check if migration is needed (example: add missing fields)
                $updateData = [];
                
                if (!isset($measurement['deviceId']) && isset($measurement['device_id'])) {
                    $updateData['deviceId'] = $measurement['device_id'];
                }
                
                if (!empty($updateData)) {
                    $this->measurementCollection->updateOne(
                        ['_id' => $measurement['_id']],
                        ['$set' => $updateData]
                    );
                    $migratedCount++;
                }
            }
            
            return [
                'success' => true,
                'message' => "Migration completed",
                'migratedCount' => $migratedCount,
                'limit' => $limit
            ];
            
        } catch (\Exception $e) {
            \Yii::error("Failed to migrate documents: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    // ==============================================
    // END BACKWARD COMPATIBILITY METHODS
    // ==============================================
}
?>
