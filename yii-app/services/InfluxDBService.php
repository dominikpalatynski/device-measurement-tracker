<?php

/**
 * InfluxDB Client Configuration for High-Frequency Electrical Measurements
 * 
 * This file provides a complete InfluxDB client setup optimized for:
 * - High-frequency data (80ms intervals)
 * - Large compressed payloads
 * - Reliable data integrity
 * - Performance monitoring
 */

// Check if composer autoload exists
if (!file_exists(__DIR__ . '/../vendor/autoload.php')) {
    throw new RuntimeException('Composer autoload not found. Please run: composer install');
}

require_once __DIR__ . '/../vendor/autoload.php';

// Check if InfluxDB client is available
if (!class_exists('InfluxDB2\Client')) {
    throw new RuntimeException('InfluxDB PHP client not installed. Please run: composer require influxdata/influxdb-client-php');
}

use InfluxDB2\Client;
use InfluxDB2\Model\WritePrecision;
use InfluxDB2\WriteType;
use InfluxDB2\Point;

class ElectricalMeasurementInfluxClient 
{
    private $client;
    private $writeApi;
    private $queryApi;
    private $config;
    private $buckets;
    private $writeStats;
    
    public function __construct() 
    {
        $this->loadConfiguration();
        $this->initializeClient();
        $this->initializeWriteStats();
        $this->setupBuckets();
    }
    
    /**
     * Load configuration from environment variables and defaults
     */
    private function loadConfiguration() 
    {
        $this->config = $this->getDefaultConfiguration();
        
        // Validate required configuration
        $this->validateConfiguration();
        
        // Setup bucket configuration
        $this->buckets = [
            'raw' => $this->config['buckets']['raw_waveforms'],
            'archive' => $this->config['buckets']['archive'],
            'metadata' => $this->config['buckets']['metadata']
        ];
    }
    
    /**
     * Default configuration optimized for electrical measurements
     */
    private function getDefaultConfiguration() 
    {
        return [
            'influxdb' => [
                'url' => getenv('INFLUXDB_URL') ?: 'http://localhost:8086',
                'token' => getenv('INFLUXDB_TOKEN') ?: 'mytoken',
                'org' => getenv('INFLUXDB_ORG') ?: 'myorg',
                'timeout' => 30,
                'verify_ssl' => false,
                'debug' => false,
                'log_file' => 'php://stdout'
            ],
            'buckets' => [
                'raw_waveforms' => 'bucket',
                'archive' => 'electrical_archive', 
                'metadata' => 'electrical_metadata'
            ],
            'write_options' => [
                'write_type' => WriteType::SYNCHRONOUS, // Immediate writes for testing
                'batch_size' => 1,             // Write immediately
                'flush_interval' => 1000,      // 1 second (minimal delay)
                'retry_interval' => 1000,      // 1 second initial retry
                'jitter_interval' => 100,      // 100ms jitter
                'max_retries' => 10,           // High retry count for data integrity
                'max_retry_delay' => 30000,    // 30 second max delay
                'max_retry_time' => 180000,    // 3 minute total retry time
                'exponential_base' => 2        // Standard exponential backoff
            ],
            'compression' => [
                'enabled' => true,
                'level' => 9,                  // Maximum compression
                'content_encoding' => 'gzip'
            ],
            'performance' => [
                'enable_monitoring' => true,
                'stats_interval' => 60,        // Log stats every 60 seconds
                'memory_limit_mb' => 512,      // Memory limit for batching
                'max_points_per_batch' => 5000 // Safety limit
            ],
            'retention' => [
                'raw_data_hours' => 24,        // 24 hours for raw waveforms
                'archive_days' => 365,         // 1 year for archived data
                'metadata_days' => 30          // 30 days for metadata
            ]
        ];
    }
    
    /**
     * Validate required configuration parameters
     */
    private function validateConfiguration() 
    {
        $required = ['influxdb.url', 'influxdb.token', 'influxdb.org'];
        
        foreach ($required as $key) {
            $keys = explode('.', $key);
            $value = $this->config;
            
            foreach ($keys as $k) {
                if (!isset($value[$k])) {
                    throw new InvalidArgumentException("Missing required configuration: {$key}");
                }
                $value = $value[$k];
            }
            
            if (empty($value)) {
                throw new InvalidArgumentException("Empty required configuration: {$key}");
            }
        }
    }
    
    /**
     * Initialize InfluxDB client with optimized settings
     */
    private function initializeClient() 
    {
        $clientOptions = [
            'url' => $this->config['influxdb']['url'],
            'token' => $this->config['influxdb']['token'],
            'org' => $this->config['influxdb']['org'],
            'bucket' => $this->buckets['raw'], // Default bucket
            'precision' => WritePrecision::NS,
            'timeout' => $this->config['influxdb']['timeout'],
            'verifySSL' => $this->config['influxdb']['verify_ssl'],
            'debug' => $this->config['influxdb']['debug'],
            'logFile' => $this->config['influxdb']['log_file']
        ];
        
        // Add compression if enabled
        if ($this->config['compression']['enabled']) {
            $clientOptions['allow_redirects'] = true;
        }
        
        $this->client = new Client($clientOptions);
        
        // Initialize Write API with custom options
        $this->writeApi = $this->client->createWriteApi($this->config['write_options']);
        
        // Initialize Query API
        $this->queryApi = $this->client->createQueryApi();
        
        $this->logInfo("InfluxDB client initialized successfully");
    }
    
    /**
     * Initialize write statistics tracking
     */
    private function initializeWriteStats() 
    {
        $this->writeStats = [
            'total_writes' => 0,
            'successful_writes' => 0,
            'failed_writes' => 0,
            'total_points' => 0,
            'total_bytes_written' => 0,
            'average_compression_ratio' => 0,
            'last_write_time' => null,
            'session_start' => microtime(true)
        ];
    }
    
    /**
     * Setup and verify bucket configuration
     */
    private function setupBuckets() 
    {
        try {
            // Test connectivity by checking health
            $health = $this->client->health();
            
            if ($health->getStatus() !== 'pass') {
                throw new RuntimeException("InfluxDB health check failed: " . $health->getMessage());
            }
            
            $this->logInfo("InfluxDB connection verified - Status: " . $health->getStatus());
            
            // Log bucket configuration
            foreach ($this->buckets as $type => $name) {
                $this->logInfo("Configured {$type} bucket: {$name}");
            }
            
        } catch (Exception $e) {
            $this->logError("Failed to setup buckets: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Write electrical measurement data with automatic compression and error handling
     */
    public function writeMeasurement($measurementData, $customBucket = null) 
    {
        $startTime = microtime(true);
        $bucket = $customBucket ?: $this->buckets['raw'];
        
        try {
            // Validate input data
            $this->validateMeasurementData($measurementData);
            
            // Create compressed point
            $pointData = $this->createCompressedPoint($measurementData);
            
            // Write to InfluxDB
            $this->writeApi->write($pointData['point'], WritePrecision::NS, $bucket);
            
            // Update statistics
            $this->updateWriteStats(true, $measurementData, microtime(true) - $startTime);
            
            $this->logDebug("Successfully wrote measurement for dataSeriesId: " . $measurementData['dataSeriesId']);
            
            return [
                'success' => true,
                'timestamp' => $pointData['timestamp'],
                'bucket' => $bucket,
                'write_time_ms' => round((microtime(true) - $startTime) * 1000, 2)
            ];
            
        } catch (Exception $e) {
            $this->updateWriteStats(false, $measurementData, microtime(true) - $startTime);
            $this->logError("Failed to write measurement: " . $e->getMessage());
            
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'bucket' => $bucket,
                'write_time_ms' => round((microtime(true) - $startTime) * 1000, 2)
            ];
        }
    }
    
    /**
     * Create compressed InfluxDB point from measurement data
     */
    private function createCompressedPoint($measurementData) 
    {
        $timestamp = time() * 1000000000; // Convert to nanoseconds
        $payload = $measurementData['data_payload'];
        
        // Compress the waveform data
        $jsonData = json_encode($payload, JSON_NUMERIC_CHECK);
        $compressed = gzencode($jsonData, $this->config['compression']['level']);
        $compressedBase64 = base64_encode($compressed);
        
        // Calculate compression statistics
        $originalSize = strlen($jsonData);
        $compressedSize = strlen($compressed);
        $compressionRatio = round($originalSize / $compressedSize, 2);
        
        // Create the point
        $point = Point::measurement('electrical_waveform')
            ->addTag('dataSeriesId', $measurementData['dataSeriesId'])
            ->addTag('conditionId', $measurementData['conditionId'])
            ->addTag('faultId', $measurementData['faultId'])
            ->addTag('measurement_type', 'compressed_waveform')
            ->addTag('channels', implode(',', array_keys($payload)))
            ->addField('compressed_data', $compressedBase64)
            ->addField('sample_count_per_channel', count($payload[array_key_first($payload)]))
            ->addField('channel_count', count($payload))
            ->addField('total_samples', array_sum(array_map('count', $payload)))
            ->addField('compression_ratio', $compressionRatio)
            ->addField('original_size_bytes', $originalSize)
            ->addField('compressed_size_bytes', $compressedSize)
            ->addField('sample_rate_hz', 1000)
            ->addField('duration_ms', count($payload[array_key_first($payload)]) * 1) // 1ms per sample
            ->time($timestamp);
            
        return ['point' => $point, 'timestamp' => $timestamp];
    }
    
    /**
     * Validate measurement data structure
     */
    private function validateMeasurementData($data) 
    {
        $required = ['dataSeriesId', 'conditionId', 'faultId', 'data_payload'];
        
        foreach ($required as $field) {
            if (!isset($data[$field])) {
                throw new InvalidArgumentException("Missing required field: {$field}");
            }
        }
        
        if (!is_array($data['data_payload']) || empty($data['data_payload'])) {
            throw new InvalidArgumentException("data_payload must be a non-empty array");
        }
        
        // Validate channel data
        $expectedChannels = ['w', 'udc', 'uc', 'ub', 'ua', 'ib', 'ic', 'idc'];
        foreach ($expectedChannels as $channel) {
            if (!isset($data['data_payload'][$channel])) {
                throw new InvalidArgumentException("Missing channel data: {$channel}");
            }
            
            if (!is_array($data['data_payload'][$channel]) || empty($data['data_payload'][$channel])) {
                throw new InvalidArgumentException("Channel {$channel} must contain sample data");
            }
        }
    }
    
    /**
     * Execute Flux query with error handling
     */
    public function query($fluxQuery, $customOrg = null) 
    {
        $org = $customOrg ?: $this->config['influxdb']['org'];
        $startTime = microtime(true);
        
        try {
            $results = $this->queryApi->query($fluxQuery, $org);
            $queryTime = round((microtime(true) - $startTime) * 1000, 2);
            
            $this->logDebug("Query executed successfully in {$queryTime}ms");
            
            return [
                'success' => true,
                'results' => $results,
                'query_time_ms' => $queryTime,
                'record_count' => $this->countQueryResults($results)
            ];
            
        } catch (Exception $e) {
            $queryTime = round((microtime(true) - $startTime) * 1000, 2);
            $this->logError("Query failed: " . $e->getMessage());
            
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'query_time_ms' => $queryTime
            ];
        }
    }
    
    /**
     * Count total records in query results
     */
    private function countQueryResults($results) 
    {
        $count = 0;
        foreach ($results as $table) {
            $count += count($table->records);
        }
        return $count;
    }
    
    /**
     * Update write statistics
     */
    private function updateWriteStats($success, $measurementData, $writeTime) 
    {
        $this->writeStats['total_writes']++;
        $this->writeStats['last_write_time'] = microtime(true);
        
        if ($success) {
            $this->writeStats['successful_writes']++;
            
            // Count total samples
            if (isset($measurementData['data_payload'])) {
                $totalSamples = array_sum(array_map('count', $measurementData['data_payload']));
                $this->writeStats['total_points'] += $totalSamples;
            }
        } else {
            $this->writeStats['failed_writes']++;
        }
        
        // Log statistics periodically
        if ($this->config['performance']['enable_monitoring'] && 
            $this->writeStats['total_writes'] % 100 === 0) {
            $this->logPerformanceStats();
        }
    }
    
    /**
     * Get current write statistics
     */
    public function getWriteStatistics() 
    {
        $runtime = microtime(true) - $this->writeStats['session_start'];
        $successRate = $this->writeStats['total_writes'] > 0 ? 
            round(($this->writeStats['successful_writes'] / $this->writeStats['total_writes']) * 100, 2) : 0;
            
        return array_merge($this->writeStats, [
            'session_runtime_seconds' => round($runtime, 2),
            'success_rate_percent' => $successRate,
            'writes_per_second' => $runtime > 0 ? round($this->writeStats['total_writes'] / $runtime, 2) : 0,
            'points_per_second' => $runtime > 0 ? round($this->writeStats['total_points'] / $runtime, 2) : 0
        ]);
    }
    
    /**
     * Log performance statistics
     */
    private function logPerformanceStats() 
    {
        $stats = $this->getWriteStatistics();
        $this->logInfo(sprintf(
            "Performance Stats - Writes: %d (%.1f%% success), Points: %d, Rate: %.1f writes/sec, %.0f points/sec",
            $stats['total_writes'],
            $stats['success_rate_percent'],
            $stats['total_points'],
            $stats['writes_per_second'],
            $stats['points_per_second']
        ));
    }
    
    /**
     * Test InfluxDB connectivity and performance
     */
    public function testConnection() 
    {
        $results = [
            'connectivity' => false,
            'write_test' => false,
            'query_test' => false,
            'performance' => [],
            'errors' => []
        ];
        
        try {
            // Test basic connectivity
            $health = $this->client->health();
            $results['connectivity'] = ($health->getStatus() === 'pass');
            
            if (!$results['connectivity']) {
                $results['errors'][] = "Health check failed: " . $health->getMessage();
                return $results;
            }
            
            // Test write performance
            $testData = [
                'dataSeriesId' => 'TEST_' . time(),
                'conditionId' => 'test',
                'faultId' => 'test',
                'data_payload' => [
                    'w' => array_fill(0, 80, 1.0),
                    'udc' => array_fill(0, 80, 240.0),
                    'uc' => array_fill(0, 80, 240.0),
                    'ub' => array_fill(0, 80, 240.0),
                    'ua' => array_fill(0, 80, 240.0),
                    'ib' => array_fill(0, 80, 10.0),
                    'ic' => array_fill(0, 80, 10.0),
                    'idc' => array_fill(0, 80, 5.0)
                ]
            ];
            
            $writeResult = $this->writeMeasurement($testData);
            $results['write_test'] = $writeResult['success'];
            $results['performance']['write_time_ms'] = $writeResult['write_time_ms'];
            
            if (!$results['write_test']) {
                $results['errors'][] = "Write test failed: " . $writeResult['error'];
            }
            
            // Test query performance
            $queryResult = $this->query("
                from(bucket: \"{$this->buckets['raw']}\")
                |> range(start: -5m)
                |> filter(fn: (r) => r._measurement == \"electrical_waveform\")
                |> limit(n: 1)
            ");
            
            $results['query_test'] = $queryResult['success'];
            $results['performance']['query_time_ms'] = $queryResult['query_time_ms'];
            
            if (!$results['query_test']) {
                $results['errors'][] = "Query test failed: " . $queryResult['error'];
            }
            
        } catch (Exception $e) {
            $results['errors'][] = "Connection test failed: " . $e->getMessage();
        }
        
        return $results;
    }
    
    /**
     * Flush write buffers and close connections
     */
    public function close() 
    {
        try {
            if ($this->writeApi) {
                $this->writeApi->close();
                $this->logInfo("Write API closed successfully");
            }
            
            if ($this->client) {
                $this->client->close();
                $this->logInfo("InfluxDB client closed successfully");
            }
            
            // Log final statistics
            $finalStats = $this->getWriteStatistics();
            $this->logInfo("Session completed - Total writes: {$finalStats['total_writes']}, Success rate: {$finalStats['success_rate_percent']}%");
            
        } catch (Exception $e) {
            $this->logError("Error during close: " . $e->getMessage());
        }
    }
    
    /**
     * Logging methods
     */
    private function logInfo($message) 
    {
        $this->log('INFO', $message);
    }
    
    private function logError($message) 
    {
        $this->log('ERROR', $message);
    }
    
    private function logDebug($message) 
    {
        if ($this->config['influxdb']['debug']) {
            $this->log('DEBUG', $message);
        }
    }
    
    private function log($level, $message) 
    {
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[{$timestamp}] [{$level}] InfluxDB Client: {$message}\n";
        
        if ($this->config['influxdb']['log_file'] === 'php://stdout') {
            echo $logMessage;
        } else {
            file_put_contents($this->config['influxdb']['log_file'], $logMessage, FILE_APPEND | LOCK_EX);
        }
    }
    
    /**
     * Get client configuration
     */
    public function getConfiguration() 
    {
        return $this->config;
    }
    
    /**
     * Get configured buckets
     */
    public function getBuckets() 
    {
        return $this->buckets;
    }
    
    public function __destruct() 
    {
        $this->close();
    }
}

?> 