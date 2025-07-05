<?php
namespace app\components;

use Yii;
use yii\helpers\FileHelper;

/**
 * PerformanceLogger utility class for measuring and logging performance metrics
 * 
 * Usage:
 * PerformanceLogger::startLog('database_query', 'database', ['table' => 'users', 'operation' => 'select']);
 * // ... your code ...
 * PerformanceLogger::stopLog('database_query');
 */
class PerformanceLogger
{
    // Performance categories
    const CATEGORY_API = 'api';
    const CATEGORY_DATABASE = 'database';
    const CATEGORY_CACHE = 'cache';
    const CATEGORY_FILE_IO = 'file_io';
    const CATEGORY_NETWORK = 'network';
    const CATEGORY_VALIDATION = 'validation';
    const CATEGORY_AUTHENTICATION = 'authentication';
    const CATEGORY_BUSINESS_LOGIC = 'business_logic';
    const CATEGORY_SERIALIZATION = 'serialization';
    
    private static $startTimes = [];
    private static $logMetadata = [];

    /**
     * Start timing for a specific label
     * @param string $label The identifier for this timing measurement
     * @param string $category The category of this measurement (api, database, cache, etc.)
     * @param array $additionalInfo Additional information about this measurement
     */
    public static function startLog(string $label, string $category = self::CATEGORY_API, array $additionalInfo = [])
    {
        self::$startTimes[$label] = microtime(true);
        self::$logMetadata[$label] = [
            'category' => $category,
            'additional_info' => $additionalInfo,
            'start_memory' => memory_get_usage(true),
            'start_peak_memory' => memory_get_peak_usage(true)
        ];
    }

    /**
     * Stop timing and log the duration to CSV file
     * @param string $label The identifier for this timing measurement
     * @param array $additionalStopInfo Additional information to add when stopping
     */
    public static function stopLog(string $label, array $additionalStopInfo = [])
    {
        if (!isset(self::$startTimes[$label])) {
            return;
        }

        $endTime = microtime(true);
        $duration = $endTime - self::$startTimes[$label];
        
        // Get metadata
        $metadata = self::$logMetadata[$label] ?? [
            'category' => self::CATEGORY_API,
            'additional_info' => [],
            'start_memory' => 0,
            'start_peak_memory' => 0
        ];
        
        // Calculate memory usage
        $endMemory = memory_get_usage(true);
        $endPeakMemory = memory_get_peak_usage(true);
        $memoryDelta = $endMemory - $metadata['start_memory'];
        $peakMemoryDelta = $endPeakMemory - $metadata['start_peak_memory'];
        
        // Merge additional info
        $allAdditionalInfo = array_merge($metadata['additional_info'], $additionalStopInfo);
        
        // Clean up
        unset(self::$startTimes[$label]);
        unset(self::$logMetadata[$label]);

        $timestamp = date('Y-m-d H:i:s');
        $row = [
            $timestamp,
            $label,
            $metadata['category'],
            number_format($duration, 6),
            $memoryDelta,
            $peakMemoryDelta,
            json_encode($allAdditionalInfo, JSON_UNESCAPED_UNICODE)
        ];

        $filePath = Yii::getAlias('@runtime') . '/performance_log.csv';
        FileHelper::createDirectory(dirname($filePath));

        $fileExists = file_exists($filePath);
        $fp = fopen($filePath, 'a');

        // Add header if file is new
        if (!$fileExists) {
            fputcsv($fp, [
                'timestamp', 
                'label', 
                'category', 
                'duration_seconds', 
                'memory_delta_bytes', 
                'peak_memory_delta_bytes', 
                'additional_info'
            ]);
        }

        fputcsv($fp, $row);
        fclose($fp);
    }

    /**
     * Get all currently active timers (for debugging)
     * @return array
     */
    public static function getActiveTimers(): array
    {
        return array_keys(self::$startTimes);
    }

    /**
     * Clear all active timers
     */
    public static function clearTimers()
    {
        self::$startTimes = [];
        self::$logMetadata = [];
    }
    
    /**
     * Log a single event without start/stop timing
     * @param string $label The identifier for this event
     * @param string $category The category of this event
     * @param float $duration The duration in seconds (if known)
     * @param array $additionalInfo Additional information about this event
     */
    public static function logEvent(string $label, string $category = self::CATEGORY_API, float $duration = 0.0, array $additionalInfo = [])
    {
        $timestamp = date('Y-m-d H:i:s');
        $row = [
            $timestamp,
            $label,
            $category,
            number_format($duration, 6),
            0, // memory_delta_bytes
            0, // peak_memory_delta_bytes
            json_encode($additionalInfo, JSON_UNESCAPED_UNICODE)
        ];

        $filePath = Yii::getAlias('@runtime') . '/performance_log.csv';
        FileHelper::createDirectory(dirname($filePath));

        $fileExists = file_exists($filePath);
        $fp = fopen($filePath, 'a');

        // Add header if file is new
        if (!$fileExists) {
            fputcsv($fp, [
                'timestamp', 
                'label', 
                'category', 
                'duration_seconds', 
                'memory_delta_bytes', 
                'peak_memory_delta_bytes', 
                'additional_info'
            ]);
        }

        fputcsv($fp, $row);
        fclose($fp);
    }
    
    /**
     * Get available performance categories
     * @return array
     */
    public static function getAvailableCategories(): array
    {
        return [
            self::CATEGORY_API,
            self::CATEGORY_DATABASE,
            self::CATEGORY_CACHE,
            self::CATEGORY_FILE_IO,
            self::CATEGORY_NETWORK,
            self::CATEGORY_VALIDATION,
            self::CATEGORY_AUTHENTICATION,
            self::CATEGORY_BUSINESS_LOGIC,
            self::CATEGORY_SERIALIZATION,
        ];
    }
}
