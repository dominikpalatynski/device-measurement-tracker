<?php
// Check device records in the database
// Save this as check-device.php in your yii-app folder

require(__DIR__ . '/vendor/autoload.php');
require(__DIR__ . '/vendor/yiisoft/yii2/Yii.php');

// Load application configuration
$config = require(__DIR__ . '/config/console.php');
new yii\console\Application($config);

$deviceUuid = 'test-device-001';

try {
    echo "Checking database for device: $deviceUuid\n";
    
    // Check if Device model exists
    if (!class_exists('app\models\Device')) {
        throw new Exception('Device model class not found');
    }

    // Raw query using DB component
    echo "Running raw SQL query...\n";
    $connection = Yii::$app->db;
    $sql = "SELECT * FROM device WHERE device_uuid = :uuid";
    $command = $connection->createCommand($sql, [':uuid' => $deviceUuid]);
    $device = $command->queryOne();

    if ($device) {
        echo "Device found in database via SQL query:\n";
        echo "ID: " . $device['id'] . "\n";
        echo "UUID: " . $device['device_uuid'] . "\n";
        echo "Name: " . $device['name'] . "\n";
        echo "Status: " . $device['status'] . "\n";
        echo "Created at: " . date('Y-m-d H:i:s', $device['created_at']) . "\n";
    } else {
        echo "Device NOT found via SQL query\n";
    }

    // Now try with AR model
    echo "\nTrying with ActiveRecord model...\n";
    $deviceModel = \app\models\Device::findOne(['device_uuid' => $deviceUuid]);
    
    if ($deviceModel) {
        echo "Device found with ActiveRecord:\n";
        echo "ID: " . $deviceModel->id . "\n";
        echo "UUID: " . $deviceModel->device_uuid . "\n";
        echo "Name: " . $deviceModel->name . "\n";
        echo "Status: " . $deviceModel->status . "\n";
        echo "Created at: " . date('Y-m-d H:i:s', $deviceModel->created_at) . "\n";
    } else {
        echo "Device NOT found with ActiveRecord\n";
    }

    // Count rows
    $count = \app\models\Device::find()->count();
    echo "\nTotal devices in database: $count\n";

    // List all devices
    echo "\nAll devices in database:\n";
    $allDevices = \app\models\Device::find()->all();
    foreach ($allDevices as $d) {
        echo "- {$d->id}: {$d->device_uuid} ({$d->name})\n";
    }

} catch (Exception $e) {
    echo "Error checking device: " . $e->getMessage() . "\n";
    echo $e->getTraceAsString() . "\n";
}
