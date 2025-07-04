<?php
// Bootstrap for Yii2 PHPUnit tests

defined('YII_DEBUG') or define('YII_DEBUG', true);
defined('YII_ENV') or define('YII_ENV', 'test');

// Composer autoloader
require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../../vendor/yiisoft/yii2/Yii.php';

// Test configuration
$config = [
    'id' => 'test-app',
    'basePath' => dirname(__DIR__, 2),
    'components' => [
        'request' => [
            'class' => 'yii\web\Request',
            'enableCookieValidation' => false,
            'scriptFile' => __DIR__ . '/../../index.php',
            'scriptUrl' => '/index.php',
        ],
        'response' => [
            'class' => 'yii\web\Response',
        ],
        'user' => [
            'class' => 'yii\web\User',
            'identityClass' => 'app\models\User',
            'enableAutoLogin' => false,
            'enableSession' => false,
        ],
        'db' => [
            'class' => 'yii\db\Connection',
            'dsn' => 'sqlite::memory:', // Use in-memory SQLite for tests
            'charset' => 'utf8',
        ],
        'log' => [
            'class' => 'yii\log\Dispatcher',
            'targets' => [], // Disable logging in tests
        ],
        'mqtt' => [
            'class' => 'app\components\MqttComponent',
            // Mock configuration for tests
        ],
    ],
    'modules' => [
        'api' => [
            'class' => 'app\modules\api\Module',
        ],
    ],
];

// Initialize the application for tests
new \yii\web\Application($config); 