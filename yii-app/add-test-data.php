<?php
// Create a test device and measurements
// Save this as add-test-data.php in your yii-app folder

require(__DIR__ . '/vendor/autoload.php');
require(__DIR__ . '/vendor/yiisoft/yii2/Yii.php');

// Load application configuration
$config = require(__DIR__ . '/config/console.php');
new yii\console\Application($config);

// Test device data
$deviceUuid = 'test-device-001';
$deviceName = 'Test Device 1';
$deviceLocation = 'Test Location';

try {
    echo "Adding test device and measurements to the database...\n";
      // First check if device already exists
    $device = \app\models\Device::findOne(['device_uuid' => $deviceUuid]);
    
    if (!$device) {
        echo "Creating new device: $deviceName ($deviceUuid)\n";
        $device = new \app\models\Device();
        $device->device_uuid = $deviceUuid;
        $device->name = $deviceName;
        $device->type = 'sensor';
        $device->status = 1; // Active
        $device->created_at = time();
        $device->updated_at = time();
        $device->last_seen_at = time();
        
        if (!$device->save()) {
            throw new \Exception("Failed to save device: " . json_encode($device->errors));
        }
        
        echo "Device created successfully with ID: " . $device->id . "\n";
    } else {
        echo "Device already exists with ID: " . $device->id . "\n";
    }
    
    // Add some test measurements
    $measurementCount = \app\models\Measurement::find()->where(['device_id' => $device->id])->count();
    
    if ($measurementCount > 0) {
        echo "Device already has $measurementCount measurements. Skipping measurement creation.\n";
    } else {
        echo "Adding 5 test measurements for device ID: " . $device->id . "\n";
        
        // Create 5 measurements with different timestamps
        for ($i = 0; $i < 5; $i++) {
            $timestamp = time() - (3600 * $i); // 1 hour apart
            
            $measurement = new \app\models\Measurement();
            $measurement->device_id = $device->id;
            $measurement->temperature = 20 + rand(0, 100) / 10; // Between 20 and 30
            $measurement->humidity = 40 + rand(0, 200) / 10; // Between 40 and 60
            $measurement->pressure = 1000 + rand(0, 200) / 10; // Between 1000 and 1020
            $measurement->battery_level = 80 + rand(0, 200) / 10; // Between 80 and 100
            $measurement->measured_at = $timestamp;
            $measurement->created_at = time();
            
            if (!$measurement->save()) {
                throw new \Exception("Failed to save measurement: " . json_encode($measurement->errors));
            }
            
            echo "Measurement created with ID: " . $measurement->id . 
                ", Temp: " . $measurement->temperature . 
                ", Humidity: " . $measurement->humidity . 
                ", Time: " . date('Y-m-d H:i:s', $measurement->measured_at) . "\n";
        }
        
        echo "All test measurements created successfully!\n";
    }
    
    echo "Test data setup completed successfully!\n";
} catch (\Exception $e) {
    echo "Error adding test data: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
