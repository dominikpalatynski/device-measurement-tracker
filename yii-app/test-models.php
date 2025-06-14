<?php
/**
 * Script to test the updated models with the new database schema
 */

// Include Yii framework
require_once(__DIR__ . '/vendor/autoload.php');

// Get the Yii app configuration
$config = require(__DIR__ . '/config/console.php');

// Create and run the application
$application = new yii\console\Application($config);

try {
    echo "Testing updated models with new database schema...\n\n";
    
    // Test Devices model
    echo "=== Testing Devices Model ===\n";
    $devices = \app\models\Devices::find()->limit(3)->all();
    echo "Found " . count($devices) . " devices:\n";
    
    foreach ($devices as $device) {
        echo "- Device ID: " . $device->device_id . "\n";
        echo "  Name: " . $device->device_name . "\n";
        echo "  Type: " . $device->device_type . "\n";
        echo "  Status: " . $device->status . "\n";
        echo "  Registration: " . $device->registration_date . "\n";
        echo "  Is Active: " . ($device->isActive() ? 'Yes' : 'No') . "\n";
        echo "\n";
    }
    
    // Test Experiments model
    echo "=== Testing Experiments Model ===\n";
    $experiments = \app\models\Experiments::find()->limit(3)->all();
    echo "Found " . count($experiments) . " experiments:\n";
    
    foreach ($experiments as $experiment) {
        echo "- Experiment ID: " . $experiment->experiment_id . "\n";
        echo "  Name: " . $experiment->name . "\n";
        echo "  Device ID: " . $experiment->device_id . "\n";
        echo "  Status: " . $experiment->status . "\n";
        echo "  Mode: " . $experiment->mode . "\n";
        
        // Test relationship
        $device = $experiment->device;
        if ($device) {
            echo "  Associated Device: " . $device->device_name . "\n";
        }
        echo "\n";
    }
    
    // Test Phenomena model
    echo "=== Testing Phenomena Model ===\n";
    $phenomena = \app\models\Phenomena::find()->limit(3)->all();
    echo "Found " . count($phenomena) . " phenomena:\n";
    
    foreach ($phenomena as $phenomenon) {
        echo "- Phenomenon ID: " . $phenomenon->phenomenon_id . "\n";
        echo "  Name: " . $phenomenon->name . "\n";
        echo "  Experiment ID: " . $phenomenon->experiment_id . "\n";
        echo "  Status: " . $phenomenon->status . "\n";
        
        // Test relationship
        $experiment = $phenomenon->experiment;
        if ($experiment) {
            echo "  Associated Experiment: " . $experiment->name . "\n";
        }
        echo "\n";
    }
    
    echo "=== Model Testing Complete ===\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}