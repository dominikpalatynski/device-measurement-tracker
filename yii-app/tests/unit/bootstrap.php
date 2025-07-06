<?php
// Bootstrap for Yii2 PHPUnit tests

defined('YII_DEBUG') or define('YII_DEBUG', true);
defined('YII_ENV') or define('YII_ENV', 'test');

// Composer autoloader
require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../../vendor/yiisoft/yii2/Yii.php';

$config = require __DIR__ . '/../../config/test.php';

// Initialize application
$app = new \yii\web\Application($config);

// Set up translations
Yii::$app->language = 'en-US';
Yii::$app->sourceLanguage = 'en-US';

// Configure message source
Yii::$app->i18n->translations['app*'] = [
    'class' => 'yii\i18n\PhpMessageSource',
    'sourceLanguage' => 'en-US',
    'basePath' => '@app/messages',
];

// Configure request component for testing
Yii::$app->set('request', new \yii\web\Request());
Yii::$app->request->enableCsrfValidation = false;
Yii::$app->request->cookieValidationKey = 'test';

// Configure user component for testing
Yii::$app->set('user', new \yii\web\User([
    'identityClass' => 'app\models\User',
    'enableAutoLogin' => false,
    'enableSession' => false,
])); 