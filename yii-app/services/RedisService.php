<?php
namespace app\services;
/**
 * Redis Service for High-Performance Caching and Real-time Data
 * 
 * This service provides Redis functionality optimized for:
 * - Real-time measurement data caching
 * - Session management
 * - Live experiment tracking
 * - Device status monitoring
 * - Performance analytics
 */

// Check if composer autoload exists
if (!file_exists(__DIR__ . '/../vendor/autoload.php')) {
    throw new \RuntimeException('Composer autoload not found. Please run: composer install');
}

require_once __DIR__ . '/../vendor/autoload.php';

// Check if Redis client is available
if (!class_exists('Predis\Client')) {
    throw new RuntimeException('Predis Redis client not installed. Please run: composer require predis/predis');
}

use Predis\Client;
use Predis\Connection\ConnectionException;
use Exception;
use RuntimeException;
use InvalidArgumentException;


class RedisService 
{
    private $client;
    private $config;
    private $connectionStats;
    private $isConnected = false;
    
    // Cache key prefixes for different data types
    const CACHE_PREFIX_DEVICE = 'device:';
    const CACHE_PREFIX_EXPERIMENT = 'experiment:';
    const CACHE_PREFIX_FAULT = 'fault:';
    const CACHE_PREFIX_CONDITION = 'condition:';
    const CACHE_PREFIX_LIVE_DATA = 'live:';
    const CACHE_PREFIX_SESSION = 'session:';
    const CACHE_PREFIX_STATS = 'stats:';
    
    // Default TTL values (in seconds)
    const TTL_DEVICE_INFO = 3600;        // 1 hour
    const TTL_EXPERIMENT_DATA = 1800;    // 30 minutes
    const TTL_LIVE_DATA = 60;            // 1 minute
    const TTL_SESSION = 86400;           // 24 hours
    const TTL_STATS = 300;               // 5 minutes
    
    public function __construct() 
    {
        $this->loadConfiguration();
        $this->initializeClient();
        $this->initializeConnectionStats();
    }
    
    /**
     * Load Redis configuration from environment and defaults
     */
    private function loadConfiguration() 
    {
        $this->config = [
            'redis' => [
                'scheme' => getenv('REDIS_SCHEME') ?: 'tcp',
                'host' => getenv('REDIS_HOST') ?: '127.0.0.1',
                'port' => getenv('REDIS_PORT') ?: 6379,
                'password' => getenv('REDIS_PASSWORD') ?: null,
                'database' => getenv('REDIS_DATABASE') ?: 0,
                'timeout' => 5.0,
                'read_write_timeout' => 0,
                'persistent' => true
            ],
            'options' => [
                'prefix' => 'electrical_measurement:',
                'serialization' => 'json',
                'compression' => false
            ],
            'performance' => [
                'enable_monitoring' => true,
                'stats_interval' => 60,
                'max_memory_usage_mb' => 1024,
                'max_connections' => 100
            ],
            'failover' => [
                'retry_attempts' => 3,
                'retry_delay_ms' => 100,
                'circuit_breaker' => true
            ]
        ];
        
        $this->validateConfiguration();
    }
    
    /**
     * Validate Redis configuration
     */
    private function validateConfiguration() 
    {
        $required = ['redis.host', 'redis.port'];
        
        foreach ($required as $key) {
            $keys = explode('.', $key);
            $value = $this->config;
            
            foreach ($keys as $k) {
                if (!isset($value[$k])) {
                    throw new InvalidArgumentException("Missing required Redis configuration: {$key}");
                }
                $value = $value[$k];
            }
        }
    }
    
    /**
     * Initialize Redis client with connection pooling and error handling
     */
    private function initializeClient() 
    {
        try {
            $connectionParams = [
                'scheme' => $this->config['redis']['scheme'],
                'host' => $this->config['redis']['host'],
                'port' => $this->config['redis']['port'],
                'database' => $this->config['redis']['database'],
                'timeout' => $this->config['redis']['timeout'],
                'read_write_timeout' => $this->config['redis']['read_write_timeout'],
                'persistent' => $this->config['redis']['persistent']
            ];
            
            if ($this->config['redis']['password']) {
                $connectionParams['password'] = $this->config['redis']['password'];
            }
            
            $options = [
                'prefix' => $this->config['options']['prefix']
            ];
            
            $this->client = new Client($connectionParams, $options);
            
            // Test connection
            $this->testConnection();
            $this->isConnected = true;
            
            $this->logInfo("Redis client initialized successfully");
            
        } catch (Exception $e) {
            $this->logError("Failed to initialize Redis client: " . $e->getMessage());
            throw $e;
        }
    }
    
    /**
     * Initialize connection statistics tracking
     */
    private function initializeConnectionStats() 
    {
        $this->connectionStats = [
            'total_operations' => 0,
            'successful_operations' => 0,
            'failed_operations' => 0,
            'cache_hits' => 0,
            'cache_misses' => 0,
            'session_start' => microtime(true),
            'last_operation_time' => null,
            'average_response_time_ms' => 0
        ];
    }
    
    /**
     * Test Redis connection and performance
     */
    public function testConnection() 
    {
        $startTime = microtime(true);
        
        try {
            $pingResult = $this->client->ping();
            $responseTime = (microtime(true) - $startTime) * 1000;
            
            if ($pingResult->getPayload() === 'PONG') {
                $this->logInfo("Redis connection test successful - Response time: {$responseTime}ms");
                return [
                    'success' => true,
                    'response_time_ms' => round($responseTime, 2),
                    'server_info' => $this->getServerInfo()
                ];
            } else {
                throw new RuntimeException("Unexpected ping response");
            }
            
        } catch (Exception $e) {
            $this->logError("Redis connection test failed: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage(),
                'response_time_ms' => round((microtime(true) - $startTime) * 1000, 2)
            ];
        }
    }
    
    /**
     * Get Redis server information
     */
    public function getServerInfo() 
    {
        try {
            $info = $this->client->info();
            return [
                'version' => $info['redis_version'] ?? 'unknown',
                'uptime_seconds' => $info['uptime_in_seconds'] ?? 0,
                'used_memory_human' => $info['used_memory_human'] ?? 'unknown',
                'connected_clients' => $info['connected_clients'] ?? 0,
                'total_commands_processed' => $info['total_commands_processed'] ?? 0
            ];
        } catch (Exception $e) {
            $this->logError("Failed to get server info: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * ====================================
     * DEVICE DATA CACHING METHODS
     * ====================================
     */
    
    /**
     * Cache device information
     */
    public function cacheDeviceInfo($deviceId, $deviceData, $ttl = self::TTL_DEVICE_INFO) 
    {
        return $this->set(self::CACHE_PREFIX_DEVICE . $deviceId, $deviceData, $ttl);
    }
    
    /**
     * Get cached device information
     */
    public function getDeviceInfo($deviceId) 
    {
        return $this->get(self::CACHE_PREFIX_DEVICE . $deviceId);
    }
    
    /**
     * Cache live measurement data
     */
    public function cacheLiveMeasurement($deviceId, $measurementData, $ttl = self::TTL_LIVE_DATA) 
    {
        $key = self::CACHE_PREFIX_LIVE_DATA . $deviceId . ':current';
        return $this->set($key, $measurementData, $ttl);
    }
    
    /**
     * Get live measurement data
     */
    public function getLiveMeasurement($deviceId) 
    {
        $key = self::CACHE_PREFIX_LIVE_DATA . $deviceId . ':current';
        return $this->get($key);
    }
    
    /**
     * Store real-time waveform data in Redis Streams
     */
    public function addToMeasurementStream($deviceId, $waveformData) 
    {
        try {
            $streamKey = self::CACHE_PREFIX_LIVE_DATA . 'stream:' . $deviceId;
            $data = [
                'timestamp' => microtime(true),
                'data' => json_encode($waveformData),
                'device_id' => $deviceId
            ];
            
            $messageId = $this->client->xadd($streamKey, $data);
            
            // Limit stream size to last 1000 entries
            $this->client->xtrim($streamKey, 'MAXLEN', '~', 1000);
            
            $this->updateOperationStats(true);
            return $messageId;
            
        } catch (Exception $e) {
            $this->updateOperationStats(false);
            $this->logError("Failed to add to measurement stream: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Get recent measurements from stream
     */
    public function getRecentMeasurements($deviceId, $count = 10) 
    {
        try {
            $streamKey = self::CACHE_PREFIX_LIVE_DATA . 'stream:' . $deviceId;
            $messages = $this->client->xrevrange($streamKey, '+', '-', 'COUNT', $count);
            
            $measurements = [];
            foreach ($messages as $messageId => $data) {
                $measurements[] = [
                    'id' => $messageId,
                    'timestamp' => $data['timestamp'],
                    'data' => json_decode($data['data'], true),
                    'device_id' => $data['device_id']
                ];
            }
            
            $this->updateOperationStats(true);
            return $measurements;
            
        } catch (Exception $e) {
            $this->updateOperationStats(false);
            $this->logError("Failed to get recent measurements: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * ====================================
     * EXPERIMENT AND FAULT TRACKING
     * ====================================
     */
    
    /**
     * Cache experiment/fault data
     */
    public function cacheFaultData($faultId, $faultData, $ttl = self::TTL_EXPERIMENT_DATA) 
    {
        return $this->set(self::CACHE_PREFIX_FAULT . $faultId, $faultData, $ttl);
    }
    
    /**
     * Get cached fault data
     */
    public function getFaultData($faultId) 
    {
        return $this->get(self::CACHE_PREFIX_FAULT . $faultId);
    }
    
    /**
     * Track active experiments/faults
     */
    public function trackActiveFault($deviceId, $faultId, $status = 'active') 
    {
        try {
            $key = self::CACHE_PREFIX_DEVICE . $deviceId . ':active_faults';
            $this->client->hset($key, $faultId, json_encode([
                'status' => $status,
                'started_at' => time(),
                'last_update' => time()
            ]));
            
            $this->client->expire($key, self::TTL_SESSION);
            $this->updateOperationStats(true);
            return true;
            
        } catch (Exception $e) {
            $this->updateOperationStats(false);
            $this->logError("Failed to track active fault: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Get active faults for a device
     */
    public function getActiveFaults($deviceId) 
    {
        try {
            $key = self::CACHE_PREFIX_DEVICE . $deviceId . ':active_faults';
            $faults = $this->client->hgetall($key);
            
            $activeFaults = [];
            foreach ($faults as $faultId => $data) {
                $activeFaults[$faultId] = json_decode($data, true);
            }
            
            $this->updateOperationStats(true);
            return $activeFaults;
            
        } catch (Exception $e) {
            $this->updateOperationStats(false);
            $this->logError("Failed to get active faults: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * ====================================
     * PERFORMANCE STATISTICS
     * ====================================
     */
    
    /**
     * Update performance statistics
     */
    public function updatePerformanceStats($deviceId, $stats) 
    {
        try {
            $key = self::CACHE_PREFIX_STATS . 'device:' . $deviceId;
            $timestamp = time();
            
            $data = array_merge($stats, ['timestamp' => $timestamp]);
            $this->client->zadd($key, $timestamp, json_encode($data));
            
            // Keep only last 24 hours of stats
            $cutoff = $timestamp - 86400;
            $this->client->zremrangebyscore($key, '-inf', $cutoff);
            
            $this->updateOperationStats(true);
            return true;
            
        } catch (Exception $e) {
            $this->updateOperationStats(false);
            $this->logError("Failed to update performance stats: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Get performance statistics for a time range
     */
    public function getPerformanceStats($deviceId, $hours = 1) 
    {
        try {
            $key = self::CACHE_PREFIX_STATS . 'device:' . $deviceId;
            $cutoff = time() - ($hours * 3600);
            
            $statsData = $this->client->zrangebyscore($key, $cutoff, '+inf');
            
            $stats = [];
            foreach ($statsData as $data) {
                $stats[] = json_decode($data, true);
            }
            
            $this->updateOperationStats(true);
            return $stats;
            
        } catch (Exception $e) {
            $this->updateOperationStats(false);
            $this->logError("Failed to get performance stats: " . $e->getMessage());
            return [];
        }
    }
    
    /**
     * ====================================
     * MQTT QUEUE OPERATIONS
     * ====================================
     */
    
    /**
     * Push MQTT message to queue
     */
    public function pushMqttMessage($topic, $payload) 
    {
        try {
            $data = [
                'topic' => $topic,
                'payload' => $payload,
                'received_at' => time()
            ];
            
            $result = $this->client->rpush('mqtt_queue', json_encode($data));
            $this->updateOperationStats(true);
            
            return $result;
            
        } catch (Exception $e) {
            $this->updateOperationStats(false);
            $this->logError("Failed to push MQTT message: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Pop MQTT message from queue
     */
    public function popMqttMessage() 
    {
        try {
            $message = $this->client->lpop('mqtt_queue');
            $this->updateOperationStats(true);
            
            return $message ? json_decode($message, true) : null;
            
        } catch (Exception $e) {
            $this->updateOperationStats(false);
            $this->logError("Failed to pop MQTT message: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Blocking pop MQTT message from queue (waits until message available)
     */
    public function blockingPopMqttMessage($timeout = 0) 
    {
        try {
            // BLPOP blocks until message is available or timeout reached
            $result = $this->client->blpop(['mqtt_queue'], $timeout);
            $this->updateOperationStats(true);
            
            // BLPOP returns [key, value] array or null if timeout
            if ($result && count($result) === 2) {
                return json_decode($result[1], true);
            }
            
            return null;
            
        } catch (Exception $e) {
            $this->updateOperationStats(false);
            $this->logError("Failed to blocking pop MQTT message: " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Get MQTT queue length
     */
    public function getMqttQueueLength() 
    {
        try {
            $length = $this->client->llen('mqtt_queue');
            $this->updateOperationStats(true);
            
            return $length;
            
        } catch (Exception $e) {
            $this->updateOperationStats(false);
            $this->logError("Failed to get MQTT queue length: " . $e->getMessage());
            return 0;
        }
    }
    
    /**
     * ====================================
     * CORE REDIS OPERATIONS
     * ====================================
     */
    
    /**
     * Set key-value with TTL
     */
    public function set($key, $value, $ttl = null) 
    {
        $startTime = microtime(true);
        
        try {
            $serializedValue = $this->serializeValue($value);
            
            if ($ttl) {
                $result = $this->client->setex($key, $ttl, $serializedValue);
            } else {
                $result = $this->client->set($key, $serializedValue);
            }
            
            $this->updateOperationStats(true, microtime(true) - $startTime);
            return $result->getPayload() === 'OK';
            
        } catch (Exception $e) {
            $this->updateOperationStats(false, microtime(true) - $startTime);
            $this->logError("Failed to set key '{$key}': " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Get value by key
     */
    public function get($key) 
    {
        $startTime = microtime(true);
        
        try {
            $value = $this->client->get($key);
            $responseTime = microtime(true) - $startTime;
            
            if ($value === null) {
                $this->connectionStats['cache_misses']++;
                $this->updateOperationStats(true, $responseTime);
                return null;
            }
            
            $this->connectionStats['cache_hits']++;
            $this->updateOperationStats(true, $responseTime);
            
            return $this->deserializeValue($value);
            
        } catch (Exception $e) {
            $this->updateOperationStats(false, microtime(true) - $startTime);
            $this->logError("Failed to get key '{$key}': " . $e->getMessage());
            return null;
        }
    }
    
    /**
     * Delete key(s)
     */
    public function delete($keys) 
    {
        try {
            if (!is_array($keys)) {
                $keys = [$keys];
            }
            
            $result = $this->client->del($keys);
            $this->updateOperationStats(true);
            
            return $result;
            
        } catch (Exception $e) {
            $this->updateOperationStats(false);
            $this->logError("Failed to delete keys: " . $e->getMessage());
            return 0;
        }
    }
    
    /**
     * Check if key exists
     */
    public function exists($key) 
    {
        try {
            $result = $this->client->exists($key);
            $this->updateOperationStats(true);
            return $result > 0;
            
        } catch (Exception $e) {
            $this->updateOperationStats(false);
            $this->logError("Failed to check key existence '{$key}': " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Set TTL for existing key
     */
    public function expire($key, $ttl) 
    {
        try {
            $result = $this->client->expire($key, $ttl);
            $this->updateOperationStats(true);
            return $result === 1;
            
        } catch (Exception $e) {
            $this->updateOperationStats(false);
            $this->logError("Failed to set TTL for key '{$key}': " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * ====================================
     * UTILITY METHODS
     * ====================================
     */
    
    /**
     * Serialize value for Redis storage
     */
    private function serializeValue($value) 
    {
        if ($this->config['options']['serialization'] === 'json') {
            return json_encode($value);
        }
        
        return serialize($value);
    }
    
    /**
     * Deserialize value from Redis
     */
    private function deserializeValue($value) 
    {
        if ($this->config['options']['serialization'] === 'json') {
            $decoded = json_decode($value, true);
            return json_last_error() === JSON_ERROR_NONE ? $decoded : $value;
        }
        
        return unserialize($value);
    }
    
    /**
     * Update operation statistics
     */
    private function updateOperationStats($success, $responseTime = null) 
    {
        $this->connectionStats['total_operations']++;
        $this->connectionStats['last_operation_time'] = microtime(true);
        
        if ($success) {
            $this->connectionStats['successful_operations']++;
        } else {
            $this->connectionStats['failed_operations']++;
        }
        
        if ($responseTime !== null) {
            $currentAvg = $this->connectionStats['average_response_time_ms'];
            $newAvg = ($currentAvg + ($responseTime * 1000)) / 2;
            $this->connectionStats['average_response_time_ms'] = $newAvg;
        }
    }
    
    /**
     * Get connection statistics
     */
    public function getConnectionStatistics() 
    {
        $runtime = microtime(true) - $this->connectionStats['session_start'];
        $successRate = $this->connectionStats['total_operations'] > 0 ? 
            round(($this->connectionStats['successful_operations'] / $this->connectionStats['total_operations']) * 100, 2) : 0;
        $hitRate = ($this->connectionStats['cache_hits'] + $this->connectionStats['cache_misses']) > 0 ?
            round(($this->connectionStats['cache_hits'] / ($this->connectionStats['cache_hits'] + $this->connectionStats['cache_misses'])) * 100, 2) : 0;
            
        return array_merge($this->connectionStats, [
            'session_runtime_seconds' => round($runtime, 2),
            'success_rate_percent' => $successRate,
            'cache_hit_rate_percent' => $hitRate,
            'operations_per_second' => $runtime > 0 ? round($this->connectionStats['total_operations'] / $runtime, 2) : 0,
            'is_connected' => $this->isConnected
        ]);
    }
    
    /**
     * Clear all cache with pattern
     */
    public function clearCache($pattern = '*') 
    {
        try {
            $keys = $this->client->keys($pattern);
            if (!empty($keys)) {
                $deleted = $this->client->del($keys);
                $this->logInfo("Cleared {$deleted} cache entries matching pattern: {$pattern}");
                return $deleted;
            }
            return 0;
            
        } catch (Exception $e) {
            $this->logError("Failed to clear cache: " . $e->getMessage());
            return false;
        }
    }
    
    /**
     * Get Redis client instance (for advanced operations)
     */
    public function getClient() 
    {
        return $this->client;
    }
    
    /**
     * Close Redis connection
     */
    public function close() 
    {
        try {
            if ($this->client) {
                $this->client->disconnect();
                $this->isConnected = false;
                $this->logInfo("Redis connection closed successfully");
            }
            
            // Log final statistics
            $finalStats = $this->getConnectionStatistics();
            $this->logInfo("Redis session completed - Total operations: {$finalStats['total_operations']}, Success rate: {$finalStats['success_rate_percent']}%, Hit rate: {$finalStats['cache_hit_rate_percent']}%");
            
        } catch (Exception $e) {
            $this->logError("Error during Redis close: " . $e->getMessage());
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
    
    private function log($level, $message) 
    {
        $timestamp = date('Y-m-d H:i:s');
        $logMessage = "[{$timestamp}] [{$level}] Redis Service: {$message}\n";
        echo $logMessage;
    }
    
    public function __destruct() 
    {
        $this->close();
    }
}

?> 