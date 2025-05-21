<?php
$params = require __DIR__ . '/params.php';
$db = require __DIR__ . '/db.php';

$config = [
    'id' => 'iot-monitoring',
    'name' => 'IoT Monitoring',
    'basePath' => dirname(__DIR__),
    'bootstrap' => ['log'],
    'aliases' => [
        '@bower' => '@vendor/bower-asset',
        '@npm'   => '@vendor/npm-asset',
    ],
    'components' => [
        'request' => [
            'cookieValidationKey' => 'your-secret-key',
            'parsers' => [
                'application/json' => 'yii\web\JsonParser',
            ]
        ],        'response' => [
            'class' => 'yii\web\Response',
            'on beforeSend' => function ($event) {
                $response = $event->sender;
                if (Yii::$app->request->isOptions) {
                    $response->statusCode = 200;
                    $response->headers->set('Access-Control-Allow-Origin', 'http://localhost:3000');
                    $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS');
                    $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept');
                    $response->headers->set('Access-Control-Allow-Credentials', 'true');
                    $response->headers->set('Access-Control-Max-Age', '3600');
                    $response->data = 'OK';
                    $response->send();
                    Yii::$app->end();
                } else {
                    // Set CORS headers for non-OPTIONS requests as well
                    $origin = Yii::$app->request->headers->get('Origin');
                    $allowedOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://172.22.176.1:3000', 'http://172.22.176.1:3001'];
                    
                    if (in_array($origin, $allowedOrigins)) {
                        $response->headers->set('Access-Control-Allow-Origin', $origin);
                        $response->headers->set('Access-Control-Allow-Credentials', 'true');
                    }
                }
            },
        ],
        'cache' => [
            'class' => 'yii\caching\FileCache',
        ],
        'errorHandler' => [
            'errorAction' => 'site/error',
        ],
        'mailer' => [
            'class' => \yii\symfonymailer\Mailer::class,
        ],
        'log' => [
            'traceLevel' => YII_DEBUG ? 3 : 0,
            'targets' => [
                [
                    'class' => 'yii\log\FileTarget',
                    'levels' => ['error', 'warning'],
                ],
                [
                    'class' => 'yii\log\FileTarget',
                    'levels' => ['info'],
                    'categories' => ['mqtt'],
                    'logFile' => '@runtime/logs/mqtt.log',
                ],
            ],
        ],
        'db' => $db,
        'user' => [
            'identityClass' => 'app\models\User',
            'enableAutoLogin' => true,
        ],        'urlManager' => [
            'enablePrettyUrl' => true,
            'showScriptName' => false,
            'rules' => [
                // Simple direct mapping for the measurement endpoints
                'api/measurement/latest' => 'api/device-measurement/latest',
                'api/measurement/index' => 'api/device-measurement/index',
                'api/measurement/stats' => 'api/device-measurement/stats',
                'api/measurement/range' => 'api/device-measurement/range',
                
                // Generic rule for other actions
                'api/measurement/<action>' => 'api/device-measurement/<action>',
                
                // Other existing rules
                'api/measurements/device/<id:\w+>' => 'api/measurement/device',
                'api/dashboard-data' => 'api/measurement/dashboard-data',
                'dashboard/device/<id:\w+>' => 'dashboard/device-details',
                // Test endpoint
                'api/measurement/test' => 'api/device-measurement/test',
                // Echo endpoint for simple testing
                'api/measurement/echo' => 'api/device-measurement/echo',
            ],
        ],
        'mqtt' => [
            'class' => 'app\components\MqttComponent',
            'host' => 'localhost',  // Connects to the Docker container
            'port' => 1883,
            'username' => '',       // No authentication for development
            'password' => '',
        ],
    ],
    'modules' => [
        'api' => [
            'class' => 'app\modules\api\Module',
        ],
    ],
    'container' => [
        'definitions' => [
            'app\services\MeasurementService' => [],
        ],
    ],
    'params' => $params,
];

if (YII_ENV_DEV) {
    // development configuration
    $config['bootstrap'][] = 'debug';
    $config['modules']['debug'] = [
        'class' => 'yii\debug\Module',
    ];

    $config['bootstrap'][] = 'gii';
    $config['modules']['gii'] = [
        'class' => 'yii\gii\Module',
    ];
}

return $config;