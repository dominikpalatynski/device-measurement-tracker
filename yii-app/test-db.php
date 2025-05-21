<?php
// Script to test database connection and basic queries
// Save this as test-db.php in your yii-app folder

require(__DIR__ . '/vendor/autoload.php');
require(__DIR__ . '/vendor/yiisoft/yii2/Yii.php');

// Load application configuration
$config = require(__DIR__ . '/config/console.php');
new yii\console\Application($config);

try {
    echo "Testing database connection...\n";
    $connection = Yii::$app->db;
    echo "Database driver: " . $connection->driverName . "\n";
    echo "Database name: " . $connection->dsn . "\n";
    
    $connection->open();
    echo "Database connection successful!\n";

    // Try running a simple query
    echo "Testing simple query...\n";
    $result = $connection->createCommand('SELECT 1 as test')->queryOne();
    echo "Simple query result: " . $result['test'] . "\n";

    // Try querying device table
    echo "Testing device table query...\n";
    $deviceCount = $connection->createCommand('SELECT COUNT(*) as count FROM device')->queryOne();
    echo "Number of devices in the database: " . $deviceCount['count'] . "\n";

    // Try querying measurement table with a limit
    echo "Testing measurement table query...\n";
    $measurementCount = $connection->createCommand('SELECT COUNT(*) as count FROM measurement')->queryOne();
    echo "Number of measurements in the database: " . $measurementCount['count'] . "\n";

    // Test a more complex query similar to the one used in getLatestMeasurement
    if ($deviceCount['count'] > 0) {
        echo "Testing a more complex query for the first device...\n";
        $deviceId = $connection->createCommand('SELECT id FROM device LIMIT 1')->queryOne()['id'];
        
        $query = "SELECT * FROM measurement WHERE device_id = :device_id ORDER BY measured_at DESC LIMIT 1";
        $latestMeasurement = $connection->createCommand($query, [':device_id' => $deviceId])->queryOne();
        
        if ($latestMeasurement) {
            echo "Latest measurement found for device ID $deviceId, measured at: " . 
                date('Y-m-d H:i:s', $latestMeasurement['measured_at']) . "\n";
        } else {
            echo "No measurements found for device ID $deviceId\n";
        }
    }

    echo "All database tests completed successfully!\n";
} catch (\Exception $e) {
    echo "Database test failed: " . $e->getMessage() . "\n";
    echo "Stack trace: " . $e->getTraceAsString() . "\n";
}
