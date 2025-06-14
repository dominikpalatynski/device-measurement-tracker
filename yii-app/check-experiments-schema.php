<?php

defined('YII_DEBUG') or define('YII_DEBUG', true);
defined('YII_ENV') or define('YII_ENV', 'dev');

require __DIR__ . '/vendor/autoload.php';
require __DIR__ . '/config/console.php';

$application = new \yii\console\Application($config);

try {
    // Get the schema for experiments table
    $schema = \Yii::$app->db->getTableSchema('experiments');
    
    if ($schema) {
        echo "Experiments table columns:\n";
        foreach ($schema->columns as $column) {
            echo "- {$column->name} ({$column->type})\n";
        }
    } else {
        echo "Experiments table not found\n";
    }
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
