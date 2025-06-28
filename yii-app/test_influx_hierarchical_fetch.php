<?php
/**
 * Test Script for InfluxDB Hierarchical Data Fetching
 * 
 * This script demonstrates how to use all levels of data fetching:
 * 1. DataSeries Level
 * 2. Condition Level  
 * 3. All Conditions Level
 * 4. Fault Level
 * 5. Device Level (Full Hierarchy)
 */

require_once __DIR__ . '/services/InfluxDBService.php';

class InfluxDBHierarchicalTest 
{
    private $influxClient;
    
    public function __construct() 
    {
        try {
            $this->influxClient = new ElectricalMeasurementInfluxClient();
            echo "✅ InfluxDB client initialized successfully\n\n";
        } catch (Exception $e) {
            echo "❌ Failed to initialize InfluxDB client: " . $e->getMessage() . "\n";
            exit(1);
        }
    }
    
    /**
     * Test connectivity first
     */
    public function testConnectivity() 
    {
        echo "🔗 Testing InfluxDB connectivity...\n";
        
        $testResult = $this->influxClient->testConnection();
        
        if ($testResult['connectivity']) {
            echo "✅ Connection successful\n";
            if ($testResult['write_test']) {
                echo "✅ Write test passed\n";
            }
            if ($testResult['query_test']) {
                echo "✅ Query test passed\n";
            }
        } else {
            echo "❌ Connection failed: " . implode(', ', $testResult['errors']) . "\n";
            return false;
        }
        
        echo "\n";
        return true;
    }
    
    /**
     * Level 1: Test DataSeries fetching
     */
    public function testDataSeriesLevel($dataSeriesId = '1') 
    {
        echo "📊 LEVEL 1: Testing DataSeries Level Fetching\n";
        echo "DataSeries ID: {$dataSeriesId}\n";
        echo str_repeat("=", 50) . "\n";
        
        $result = $this->influxClient->fetchDataSeriesMeasurements($dataSeriesId, '-1h');
        
        if ($result['success']) {
            echo "✅ Successfully fetched DataSeries data\n";
            echo "📈 Total Measurements: {$result['totalMeasurements']}\n";
            echo "⏰ Time Range: {$result['timeRange']}\n";
            
            if (isset($result['data']['statistics'])) {
                echo "📊 Channel Statistics:\n";
                foreach ($result['data']['statistics'] as $channel => $stats) {
                    echo "   {$channel}: {$stats['count']} samples, avg: " . round($stats['avg'], 2) . "\n";
                }
            }
        } else {
            echo "❌ Failed to fetch DataSeries data: {$result['error']}\n";
        }
        
        echo "🔗 JSON Structure:\n";
        echo json_encode($result, JSON_PRETTY_PRINT | JSON_NUMERIC_CHECK) . "\n";
        echo "\n" . str_repeat("-", 70) . "\n\n";
        
        return $result;
    }
    
    /**
     * Level 2: Test Condition fetching
     */
    public function testConditionLevel($conditionId = 'condition_123') 
    {
        echo "🎯 LEVEL 2: Testing Condition Level Fetching\n";
        echo "Condition ID: {$conditionId}\n";
        echo str_repeat("=", 50) . "\n";
        
        $result = $this->influxClient->fetchConditionData($conditionId, '-2h');
        
        if ($result['success']) {
            echo "✅ Successfully fetched Condition data\n";
            echo "📈 DataSeries Count: {$result['dataSeriesCount']}\n";
            echo "⏰ Time Range: {$result['timeRange']}\n";
            
            if (isset($result['data']['dataSeries'])) {
                echo "📊 DataSeries in this Condition:\n";
                foreach ($result['data']['dataSeries'] as $ds) {
                    echo "   - {$ds['dataSeriesId']}: {$ds['totalSamples']} samples\n";
                }
            }
        } else {
            echo "❌ Failed to fetch Condition data: {$result['error']}\n";
        }
        
        echo "🔗 JSON Structure (truncated):\n";
        $truncatedResult = $result;
        if (isset($truncatedResult['data']['dataSeries'])) {
            foreach ($truncatedResult['data']['dataSeries'] as &$ds) {
                if (isset($ds['measurements'])) {
                    $ds['measurements'] = array_slice($ds['measurements'], 0, 2); // Show only first 2
                    $ds['measurements'][] = '... (truncated)';
                }
            }
        }
        echo json_encode($truncatedResult, JSON_PRETTY_PRINT | JSON_NUMERIC_CHECK) . "\n";
        echo "\n" . str_repeat("-", 70) . "\n\n";
        
        return $result;
    }
    
    /**
     * Level 3: Test All Conditions fetching
     */
    public function testAllConditionsLevel($deviceId = 'YTdzQYiThAuY') 
    {
        echo "🌐 LEVEL 3: Testing All Conditions Level Fetching\n";
        echo "Device ID: {$deviceId}\n";
        echo str_repeat("=", 50) . "\n";
        
        $result = $this->influxClient->fetchAllConditionsData($deviceId, '-6h');
        
        if ($result['success']) {
            echo "✅ Successfully fetched All Conditions data\n";
            echo "📈 Conditions Count: {$result['conditionsCount']}\n";
            echo "⏰ Time Range: {$result['timeRange']}\n";
            
            if (isset($result['conditions'])) {
                echo "📊 Conditions found:\n";
                foreach ($result['conditions'] as $condition) {
                    echo "   - {$condition['conditionId']}: {$condition['dataSeriesCount']} DataSeries\n";
                }
            }
        } else {
            echo "❌ Failed to fetch All Conditions data: {$result['error']}\n";
        }
        
        echo "🔗 JSON Structure (truncated):\n";
        $truncatedResult = $result;
        if (isset($truncatedResult['conditions'])) {
            $truncatedResult['conditions'] = array_slice($truncatedResult['conditions'], 0, 2);
            foreach ($truncatedResult['conditions'] as &$condition) {
                if (isset($condition['dataSeries'])) {
                    $condition['dataSeries'] = array_slice($condition['dataSeries'], 0, 1);
                    $condition['dataSeries'][0]['measurements'] = '... (truncated)';
                }
            }
        }
        echo json_encode($truncatedResult, JSON_PRETTY_PRINT | JSON_NUMERIC_CHECK) . "\n";
        echo "\n" . str_repeat("-", 70) . "\n\n";
        
        return $result;
    }
    
    /**
     * Level 4: Test Fault fetching
     */
    public function testFaultLevel($faultId = 'FAULT_20250628_103534_7cc6a6') 
    {
        echo "⚠️ LEVEL 4: Testing Fault Level Fetching\n";
        echo "Fault ID: {$faultId}\n";
        echo str_repeat("=", 50) . "\n";
        
        $result = $this->influxClient->fetchFaultData($faultId, '-12h');
        
        if ($result['success']) {
            echo "✅ Successfully fetched Fault data\n";
            echo "📈 Conditions Count: {$result['conditionsCount']}\n";
            echo "⏰ Time Range: {$result['timeRange']}\n";
            
            if (isset($result['data']['conditions'])) {
                echo "📊 Conditions in this Fault:\n";
                foreach ($result['data']['conditions'] as $condition) {
                    echo "   - {$condition['conditionId']}: " . count($condition['dataSeries']) . " DataSeries\n";
                }
            }
        } else {
            echo "❌ Failed to fetch Fault data: {$result['error']}\n";
        }
        
        echo "🔗 JSON Structure (truncated):\n";
        $truncatedResult = $result;
        if (isset($truncatedResult['data']['conditions'])) {
            $truncatedResult['data']['conditions'] = array_slice($truncatedResult['data']['conditions'], 0, 1);
            foreach ($truncatedResult['data']['conditions'] as &$condition) {
                if (isset($condition['dataSeries'])) {
                    $condition['dataSeries'] = array_slice($condition['dataSeries'], 0, 1);
                    $condition['dataSeries'][0]['combinedData'] = '... (truncated)';
                }
            }
        }
        echo json_encode($truncatedResult, JSON_PRETTY_PRINT | JSON_NUMERIC_CHECK) . "\n";
        echo "\n" . str_repeat("-", 70) . "\n\n";
        
        return $result;
    }
    
    /**
     * Level 5: Test Device (Full Hierarchy) fetching
     */
    public function testDeviceLevel($deviceId = 'YTdzQYiThAuY') 
    {
        echo "🏢 LEVEL 5: Testing Device Level (Full Hierarchy) Fetching\n";
        echo "Device ID: {$deviceId}\n";
        echo str_repeat("=", 50) . "\n";
        
        $result = $this->influxClient->fetchDeviceData($deviceId, '-24h');
        
        if ($result['success']) {
            echo "✅ Successfully fetched Device data (Full Hierarchy)\n";
            echo "📈 Faults Count: {$result['faultsCount']}\n";
            echo "⏰ Time Range: {$result['timeRange']}\n";
            
            if (isset($result['data']['faults'])) {
                echo "📊 Full Hierarchy:\n";
                foreach ($result['data']['faults'] as $fault) {
                    echo "   📁 Fault: {$fault['faultId']} ({$fault['conditionsCount']} conditions)\n";
                    foreach ($fault['conditions'] as $condition) {
                        echo "      📁 Condition: {$condition['conditionId']} ({$condition['dataSeriesCount']} series)\n";
                        foreach ($condition['dataSeries'] as $ds) {
                            $totalSamples = 0;
                            foreach ($ds['combinedData'] as $channelData) {
                                $totalSamples += count($channelData);
                            }
                            echo "         📊 DataSeries: {$ds['dataSeriesId']} ({$totalSamples} total samples)\n";
                        }
                    }
                }
            }
        } else {
            echo "❌ Failed to fetch Device data: {$result['error']}\n";
        }
        
        echo "🔗 JSON Structure (heavily truncated):\n";
        $truncatedResult = $result;
        if (isset($truncatedResult['data']['faults'])) {
            $truncatedResult['data']['faults'] = array_slice($truncatedResult['data']['faults'], 0, 1);
            foreach ($truncatedResult['data']['faults'] as &$fault) {
                $fault['conditions'] = array_slice($fault['conditions'], 0, 1);
                foreach ($fault['conditions'] as &$condition) {
                    $condition['dataSeries'] = array_slice($condition['dataSeries'], 0, 1);
                    foreach ($condition['dataSeries'] as &$ds) {
                        foreach ($ds['combinedData'] as $channel => &$data) {
                            $ds['combinedData'][$channel] = array_slice($data, 0, 3);
                            $ds['combinedData'][$channel][] = '... (truncated)';
                        }
                    }
                }
            }
        }
        echo json_encode($truncatedResult, JSON_PRETTY_PRINT | JSON_NUMERIC_CHECK) . "\n";
        echo "\n" . str_repeat("-", 70) . "\n\n";
        
        return $result;
    }
    
    /**
     * Run all tests
     */
    public function runAllTests() 
    {
        echo "🚀 Starting InfluxDB Hierarchical Data Fetching Tests\n";
        echo "Time: " . date('Y-m-d H:i:s') . "\n";
        echo str_repeat("=", 70) . "\n\n";
        
        // Test connectivity first
        if (!$this->testConnectivity()) {
            echo "❌ Cannot proceed with tests due to connectivity issues\n";
            return;
        }
        
        // Test each level
        $this->testDataSeriesLevel('1');
        $this->testConditionLevel('condition_123'); 
        $this->testAllConditionsLevel('YTdzQYiThAuY');
        $this->testFaultLevel('FAULT_20250628_103534_7cc6a6');
        $this->testDeviceLevel('YTdzQYiThAuY');
        
        echo "🎉 All tests completed!\n";
        echo "Time: " . date('Y-m-d H:i:s') . "\n";
    }
    
    /**
     * Test with custom parameters
     */
    public function testWithCustomParams($dataSeriesId, $conditionId, $faultId, $deviceId) 
    {
        echo "🎯 Testing with custom parameters:\n";
        echo "DataSeries: {$dataSeriesId}, Condition: {$conditionId}, Fault: {$faultId}, Device: {$deviceId}\n\n";
        
        $this->testDataSeriesLevel($dataSeriesId);
        $this->testConditionLevel($conditionId);
        $this->testFaultLevel($faultId);
        $this->testDeviceLevel($deviceId);
    }
}

// ========================================
// MAIN EXECUTION
// ========================================

if (php_sapi_name() === 'cli') {
    $tester = new InfluxDBHierarchicalTest();
    
    // Check command line arguments
    if ($argc > 1) {
        $command = $argv[1];
        
        switch ($command) {
            case 'connectivity':
                $tester->testConnectivity();
                break;
                
            case 'dataseries':
                $dataSeriesId = $argv[2] ?? '1';
                $tester->testDataSeriesLevel($dataSeriesId);
                break;
                
            case 'condition':
                $conditionId = $argv[2] ?? 'condition_123';
                $tester->testConditionLevel($conditionId);
                break;
                
            case 'allconditions':
                $deviceId = $argv[2] ?? 'YTdzQYiThAuY';
                $tester->testAllConditionsLevel($deviceId);
                break;
                
            case 'fault':
                $faultId = $argv[2] ?? 'FAULT_20250628_103534_7cc6a6';
                $tester->testFaultLevel($faultId);
                break;
                
            case 'device':
                $deviceId = $argv[2] ?? 'YTdzQYiThAuY';
                $tester->testDeviceLevel($deviceId);
                break;
                
            case 'custom':
                if ($argc >= 6) {
                    $tester->testWithCustomParams($argv[2], $argv[3], $argv[4], $argv[5]);
                } else {
                    echo "Usage: php test_influx_hierarchical_fetch.php custom <dataSeriesId> <conditionId> <faultId> <deviceId>\n";
                }
                break;
                
            case 'all':
            default:
                $tester->runAllTests();
                break;
        }
    } else {
        $tester->runAllTests();
    }
} else {
    echo "This script must be run from command line\n";
}

?> 