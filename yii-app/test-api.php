<?php
// Script to test API endpoints directly
// Save this as test-api.php in your yii-app folder

require(__DIR__ . '/vendor/autoload.php');
require(__DIR__ . '/vendor/yiisoft/yii2/Yii.php');

// Load application configuration
$config = require(__DIR__ . '/config/web.php');
$config['components']['request']['enableCsrfValidation'] = false;
$config['components']['request']['scriptUrl'] = '/index.php';
$config['components']['request']['scriptFile'] = __DIR__ . '/web/index.php';
$config['components']['request']['hostInfo'] = 'http://localhost:8080';

// Create a test application instance
$app = new yii\web\Application($config);

// Function to test an API endpoint
function testEndpoint($route, $params = []) {
    echo "Testing endpoint: $route\n";
    echo "Parameters: " . json_encode($params) . "\n";
    
    try {
        // Start time measurement
        $startTime = microtime(true);
        
        // Execute request
        ob_start();
        $response = Yii::$app->runAction($route, $params);
        $output = ob_get_clean();
        
        // End time measurement
        $endTime = microtime(true);
        $executionTime = round(($endTime - $startTime) * 1000, 2);
        
        echo "Execution time: $executionTime ms\n";
        echo "Response: " . json_encode($response, JSON_PRETTY_PRINT) . "\n";
        echo "Raw output: $output\n";
        echo "=========================================\n";
        
        return $response;
    } catch (\Exception $e) {
        echo "Error: " . $e->getMessage() . "\n";
        echo "Stack trace: " . $e->getTraceAsString() . "\n";
        echo "=========================================\n";
        return null;
    }
}

// Get device UUID from the database or use a test one
$deviceUuid = 'test-device-001';

try {
    $device = \app\models\Device::findOne(['device_uuid' => $deviceUuid]);
    if ($device) {
        echo "Using existing device: $deviceUuid (ID: {$device->id})\n";
    } else {
        echo "Device $deviceUuid not found, will likely fail.\n";
    }
} catch (\Exception $e) {
    echo "Error finding device: " . $e->getMessage() . "\n";
}

echo "=========================================\n";

// Test latest measurement endpoint
testEndpoint('api/device-measurement/latest', ['deviceUuid' => $deviceUuid]);

// Test getting all measurements endpoint
testEndpoint('api/device-measurement/index', ['deviceUuid' => $deviceUuid, 'limit' => 5]);

// Test stats endpoint
testEndpoint('api/device-measurement/stats', ['deviceUuid' => $deviceUuid]);
