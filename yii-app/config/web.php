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
                $request = Yii::$app->request;
                
                // Define allowed origins
                $allowedOrigins = [
                    'http://localhost:3000', 
                    'http://localhost:3001', 
                    'http://172.22.176.1:3000', 
                    'http://172.22.176.1:3001'
                ];
                
                $origin = $request->headers->get('Origin');
                
                // Set CORS headers for all API requests
                if ($request->getPathInfo() && strpos($request->getPathInfo(), 'api/') === 0) {
                    if (in_array($origin, $allowedOrigins)) {
                        $response->headers->set('Access-Control-Allow-Origin', $origin);
                    } else {
                        $response->headers->set('Access-Control-Allow-Origin', 'http://localhost:3000');
                    }
                    
                    $response->headers->set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, HEAD, OPTIONS');
                    $response->headers->set('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With, Accept, Origin');
                    $response->headers->set('Access-Control-Allow-Credentials', 'true');
                    $response->headers->set('Access-Control-Max-Age', '3600');
                    
                    // Handle OPTIONS preflight requests
                    if ($request->isOptions) {
                        $response->statusCode = 200;
                        $response->content = '';
                        return;
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
            'rules' => [                // Device endpoints (using DeviceRegisterController since DevicesController is empty)
                'api/device/list' => 'api/device-register/list',
                'api/device/view' => 'api/device-register/view',
                'api/device/register' => 'api/device-register/register',
                'api/device/update' => 'api/device-register/update',
                'api/device/delete' => 'api/device-register/delete',
                'api/device/activate' => 'api/device-register/activate',
                'api/device/deactivate' => 'api/device-register/deactivate',
                'api/device/test' => 'api/device-register/test',
                  // Alternative device registration endpoints (keeping backward compatibility)
                'api/devices/register' => 'api/device-register/register',
                'api/devices/test' => 'api/device-register/test',
                'api/devices/list' => 'api/device-register/list',
                'api/devices/<id:\d+>' => 'api/device-register/view',
                'api/devices/<id:\d+>/update' => 'api/device-register/update',
                'api/devices/<id:\d+>/delete' => 'api/device-register/delete',                'api/devices/<id:\d+>/activate' => 'api/device-register/activate',
                'api/devices/<id:\d+>/deactivate' => 'api/device-register/deactivate',

                // Live experiment endpoints for devices
                'api/devices/<deviceId:\w+>/live-experiment' => 'api/devices/live-experiment',
                'api/devices/<deviceId:\w+>/start-phenomenon' => 'api/devices/start-phenomenon',
                'api/devices/<deviceId:\w+>/stop-phenomenon' => 'api/devices/stop-phenomenon',// Experiment endpoints
                'api/experiment/list' => 'api/experiment/list',
                'api/experiment/view' => 'api/experiment/view',
                'api/experiment/create' => 'api/experiment/create',
                'api/experiment/update' => 'api/experiment/update',
                'api/experiment/delete' => 'api/experiment/delete',
                'api/experiment/test' => 'api/experiment/test',
                
                // Additional experiment endpoints (keeping backward compatibility)
                'api/experiments/list' => 'api/experiments/list',
                'api/experiments/view' => 'api/experiments/view',
                'api/experiments/create' => 'api/experiments/create',
                'api/experiments/update' => 'api/experiments/update',
                'api/experiments/delete' => 'api/experiments/delete',
                'api/experiments/test' => 'api/experiments/test',
                
                // Phenomenon endpoints
                'api/phenomenon/list' => 'api/phenomena/list',
                'api/phenomenon/view' => 'api/phenomena/view',
                'api/phenomenon/create' => 'api/phenomena/create',
                'api/phenomenon/update' => 'api/phenomena/update',
                'api/phenomenon/delete' => 'api/phenomena/delete',
                'api/phenomenon/test' => 'api/phenomena/test',
                'api/phenomenon/start' => 'api/phenomena/start',
                'api/phenomenon/stop' => 'api/phenomena/stop',
                'api/phenomenon/finish' => 'api/phenomena/finish',
                
                // Measurement endpoints
                'api/measurement/latest' => 'api/device-measurement/latest',
                'api/measurement/index' => 'api/device-measurement/index',
                'api/measurement/stats' => 'api/device-measurement/stats',
                'api/measurement/range' => 'api/device-measurement/range',
                'api/measurement/test' => 'api/device-measurement/test',
                'api/measurement/echo' => 'api/device-measurement/echo',
                
                // Generic rule for other actions
                'api/measurement/<action>' => 'api/device-measurement/<action>',
                
                // Other existing rules
                'api/measurements/device/<id:\w+>' => 'api/measurement/device',
                'api/dashboard-data' => 'api/measurement/dashboard-data',
                'dashboard/device/<id:\w+>' => 'dashboard/device-details',
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