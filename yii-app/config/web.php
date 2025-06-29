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

                // Live fault endpoints for devices
                'api/devices/<deviceId:\w+>/live-fault' => 'api/devices/live-fault',
                'api/devices/<deviceId:\w+>/start-condition' => 'api/devices/start-condition',
                'api/devices/<deviceId:\w+>/stop-condition' => 'api/devices/stop-condition',                // Fault endpoints
                'api/fault/list' => 'api/faults/list',
                'api/fault/view' => 'api/faults/view',
                'api/fault/create' => 'api/faults/create',
                'api/fault/update' => 'api/faults/update',
                'api/fault/delete' => 'api/faults/delete',
                'api/fault/test' => 'api/faults/test',
                
                // Additional fault endpoints (keeping backward compatibility)
                'api/faults/list' => 'api/faults/list',
                'api/faults/view' => 'api/faults/view',
                'api/faults/create' => 'api/faults/create',
                'api/faults/update' => 'api/faults/update',
                'api/faults/delete' => 'api/faults/delete',
                'api/faults/test' => 'api/faults/test',
                
                // Condition endpoints
                'api/condition/list' => 'api/conditions/list',
                'api/condition/view' => 'api/conditions/view',
                'api/condition/create' => 'api/conditions/create',
                'api/condition/update' => 'api/conditions/update',
                'api/condition/delete' => 'api/conditions/delete',
                'api/condition/test' => 'api/conditions/test',
                'api/condition/start' => 'api/conditions/start',
                'api/condition/stop' => 'api/conditions/stop',
                'api/condition/finish' => 'api/conditions/finish',
                
                // Backward compatibility: experiment endpoints map to faults
                'api/experiment/list' => 'api/faults/list',
                'api/experiment/view' => 'api/faults/view',
                'api/experiment/create' => 'api/faults/create',
                'api/experiment/update' => 'api/faults/update',
                'api/experiment/delete' => 'api/faults/delete',
                'api/experiment/test' => 'api/faults/test',
                'api/experiments/list' => 'api/faults/list',
                'api/experiments/view' => 'api/faults/view',
                'api/experiments/create' => 'api/faults/create',
                'api/experiments/update' => 'api/faults/update',
                'api/experiments/delete' => 'api/faults/delete',
                'api/experiments/test' => 'api/faults/test',
                
                // Backward compatibility: phenomena endpoints map to conditions
                'api/phenomenon/list' => 'api/conditions/list',
                'api/phenomenon/view' => 'api/conditions/view',
                'api/phenomenon/create' => 'api/conditions/create',
                'api/phenomenon/update' => 'api/conditions/update',
                'api/phenomenon/delete' => 'api/conditions/delete',
                'api/phenomenon/test' => 'api/conditions/test',
                'api/phenomena/list' => 'api/conditions/list',
                'api/phenomena/view' => 'api/conditions/view',
                'api/phenomena/create' => 'api/conditions/create',
                'api/phenomena/update' => 'api/conditions/update',
                'api/phenomena/delete' => 'api/conditions/delete',
                'api/phenomena/test' => 'api/conditions/test',
                
                // Measurement endpoints
                'api/measurement/latest' => 'api/device-measurement/latest',
                'api/measurement/index' => 'api/device-measurement/index',
                'api/measurement/stats' => 'api/device-measurement/stats',
                'api/measurement/range' => 'api/device-measurement/range',
                'api/measurement/test' => 'api/device-measurement/test',
                'api/measurement/echo' => 'api/device-measurement/echo',
                  // Generic rule for other actions
                'api/measurement/<action>' => 'api/device-measurement/<action>',
                  // Measurement Data endpoints (from measurement_data table)
                // More specific routes must come first
                'api/measurement-data/condition/live' => 'api/measurement-data/condition-live',
                'api/measurement-data/condition/latest' => 'api/measurement-data/condition-latest',
                'api/measurement-data/condition/<conditionId>' => 'api/measurement-data/condition',
                'api/measurement-data/device/<deviceId>' => 'api/measurement-data/device',
                'api/measurement-data/latest-all' => 'api/measurement-data/latest-all',
                'api/measurement-data/<action>' => 'api/measurement-data/<action>',
                
                // MongoDB Data endpoints
                'api/mongo-data/ping' => 'api/mongo-data/ping',
                'api/mongo-data/fetch' => 'api/mongo-data/fetch',
                'api/mongo-data/hierarchy' => 'api/mongo-data/hierarchy',
                'api/mongo-data/stats' => 'api/mongo-data/stats',
                
                // MongoDB API endpoints for testing
                'api/mongodb/test' => 'api/mongo-d-b/test',
                'api/mongodb/measurement' => 'api/mongo-d-b/measurement',
                'api/mongodb/measurements' => 'api/mongo-d-b/measurements',
                'api/mongodb/stats' => 'api/mongo-d-b/stats',
                'api/mongodb/latest' => 'api/mongo-d-b/latest',
                'api/mongodb/aggregated' => 'api/mongo-d-b/aggregated',
                'api/mongodb/cleanup' => 'api/mongo-d-b/cleanup',
                'api/mongodb/range' => 'api/mongo-d-b/range',
                'api/mongodb/db-info' => 'api/mongo-d-b/db-info',
                // Enhanced hierarchy endpoints
                'api/mongodb/data-series' => 'api/mongo-d-b/data-series',
                'api/mongodb/condition' => 'api/mongo-d-b/condition',
                'api/mongodb/fault' => 'api/mongo-d-b/fault',
                'api/mongodb/device' => 'api/mongo-d-b/device',
                'api/mongodb/all-conditions' => 'api/mongo-d-b/all-conditions',
                'api/mongodb/devices' => 'api/mongo-d-b/devices',
                'api/mongodb/create-device' => 'api/mongo-d-b/create-device',
                'api/mongodb/create-fault' => 'api/mongo-d-b/create-fault',
                'api/mongodb/create-condition' => 'api/mongo-d-b/create-condition',
                'api/mongodb/create-data-series' => 'api/mongo-d-b/create-data-series',
                // Current data structure endpoints
                'api/mongodb/condition-name' => 'api/mongo-d-b/condition-name',
                'api/mongodb/data-series-value' => 'api/mongo-d-b/data-series-value',
                'api/mongodb/hierarchy' => 'api/mongo-d-b/hierarchy',
                
                // Enhanced MongoDB API endpoints (InfluxDB feature-parity)
                'api/mongodb/data-series' => 'api/mongo-d-b/data-series',
                'api/mongodb/condition' => 'api/mongo-d-b/condition',
                'api/mongodb/fault' => 'api/mongo-d-b/fault',
                'api/mongodb/device' => 'api/mongo-d-b/device',
                'api/mongodb/all-conditions' => 'api/mongo-d-b/all-conditions',
                'api/mongodb/devices' => 'api/mongo-d-b/devices',
                'api/mongodb/create-device' => 'api/mongo-d-b/create-device',
                'api/mongodb/create-fault' => 'api/mongo-d-b/create-fault',
                'api/mongodb/create-condition' => 'api/mongo-d-b/create-condition',
                'api/mongodb/create-data-series' => 'api/mongo-d-b/create-data-series',
                'api/mongodb/db-info' => 'api/mongo-d-b/db-info',
                
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