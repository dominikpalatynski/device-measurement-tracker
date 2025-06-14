<?php
/**
 * Script to verify example devices were inserted correctly
 */

// Include Yii framework
require_once(__DIR__ . '/vendor/autoload.php');

// Get the Yii app configuration
$config = require(__DIR__ . '/config/console.php');

// Create and run the application
$application = new yii\console\Application($config);

try {
    // Get database connection
    $db = Yii::$app->db;
    
    echo "Checking devices table...\n";
    
    // Query all devices
    $devices = $db->createCommand("SELECT * FROM devices ORDER BY registration_date DESC")->queryAll();
    
    echo "Found " . count($devices) . " devices in the database:\n\n";
    
    foreach ($devices as $device) {
        echo "Device ID: " . $device['device_id'] . "\n";
        echo "Name: " . $device['device_name'] . "\n";
        echo "Type: " . $device['device_type'] . "\n";
        echo "Status: " . $device['status'] . "\n";
        echo "Registration Date: " . $device['registration_date'] . "\n";
        echo "Last Updated: " . $device['last_updated'] . "\n";
        echo "----------------------------------------\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
