<?php
$db = require __DIR__ . '/test_db.php';

/**
 * Application configuration shared by all test types
 */
return [
    'id' => 'test-app',
    'basePath' => dirname(__DIR__),
    'language' => 'en-US',
    'sourceLanguage' => 'en-US',
    'components' => [
        'db' => $db,
        'request' => [
            'class' => 'yii\web\Request',
            'enableCookieValidation' => false,
            'scriptFile' => __DIR__ . '/../web/index.php',
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
        'i18n' => [
            'translations' => [
                'app*' => [
                    'class' => 'yii\i18n\PhpMessageSource',
                    'sourceLanguage' => 'en-US',
                    'basePath' => '@app/messages',
                ],
            ],
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
