<?php
namespace app\modules\api\controllers;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use app\services\DeviceMeasurementService;
use app\models\Phenomena;
use app\models\Experiments;

class DeviceMeasurementController extends Controller
{    /**
     * @inheritdoc
     */    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['contentNegotiator']['formats']['application/json'] = Response::FORMAT_JSON;
        
        // Add CORS filter with improved configuration
        $behaviors['corsFilter'] = [
            'class' => \yii\filters\Cors::class,
            'cors' => [
                'Origin' => ['http://localhost:3000', 'http://localhost:3001', 'http://172.22.176.1:3000', 'http://172.22.176.1:3001'], // Specific allowed origins
                'Access-Control-Request-Method' => ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'HEAD', 'OPTIONS'],
                'Access-Control-Request-Headers' => ['*'],
                'Access-Control-Allow-Credentials' => true,
                'Access-Control-Max-Age' => 3600, // Cache preflight for 1 hour
                'Access-Control-Expose-Headers' => ['X-Pagination-Current-Page', 'X-Pagination-Page-Count', 'X-Pagination-Per-Page', 'X-Pagination-Total-Count'],
            ],
        ];
        
        return $behaviors;
    }    /**
     * Pobiera wszystkie pomiary dla urządzenia z tabeli measurement_data
     * 
     * @param string $deviceUuid UUID urządzenia
     * @param int $limit Limit pomiarów
     * @return array
     */    public function actionIndex($deviceUuid, $limit = 50)
    {
        Yii::info("Received request for measurements list for device: {$deviceUuid}, limit: {$limit}", 'api.device-measurement');
        
        try {
            // Force proper JSON response type
            Yii::$app->response->format = Response::FORMAT_JSON;
            
            Yii::beginProfile('all-measurements', 'api.performance');
            
            // Fetch data directly from measurement_data table
            $measurements = \app\models\MeasurementData::find()
                ->where(['device_id' => $deviceUuid])
                ->orderBy(['timestamp' => SORT_DESC])
                ->limit((int)$limit)
                ->all();
            
            // Format the data for response
            $data = array_map(function($measurement) {
                return [
                    'data_id' => (int)$measurement->data_id,
                    'device_id' => $measurement->device_id,
                    'phenomenon_id' => $measurement->phenomenon_id,
                    'data_payload' => $measurement->data_payload,
                    'timestamp' => $measurement->timestamp,
                ];
            }, $measurements);
            
            Yii::endProfile('all-measurements', 'api.performance');
            
            Yii::info("Successfully retrieved " . count($data) . " measurements for device: {$deviceUuid}", 'api.device-measurement');
            
            return [
                'success' => true,
                'data' => $data,
                'count' => count($data)
            ];
        } catch (\Throwable $e) {
            Yii::error("Error retrieving measurements for device {$deviceUuid}: " . $e->getMessage() . "\n" . $e->getTraceAsString(), 'api.device-measurement');
            Yii::$app->response->statusCode = 500;
            return [
                'success' => false,
                'error' => "Error retrieving measurements for device {$deviceUuid}"
            ];
        }
    }/**
     * Pobiera najnowszy pomiar dla urządzenia
     * 
     * @param string $deviceUuid UUID urządzenia
     * @return array
     */
    public function actionLatest($deviceUuid)
    {
        Yii::info("Received request for latest measurement for device: {$deviceUuid}", 'api.device-measurement');
        
        try {
            // Force proper JSON response type
            Yii::$app->response->format = Response::FORMAT_JSON;
            
            Yii::beginProfile('latest-measurement', 'api.performance');
            $handler = new DeviceMeasurementService($deviceUuid);
            $measurement = $handler->getLatestMeasurement();
            Yii::endProfile('latest-measurement', 'api.performance');

            if (!$measurement) {
                Yii::warning("No measurements found for device: {$deviceUuid}", 'api.device-measurement');
                Yii::$app->response->statusCode = 404;
                return [
                    'success' => false,
                    'error' => "Brak pomiarów dla urządzenia {$deviceUuid}"
                ];
            }

            Yii::info("Successfully retrieved latest measurement for device: {$deviceUuid}", 'api.device-measurement');
            return [
                'success' => true,
                'data' => $measurement
            ];
        } catch (\Throwable $e) {
            // Catch any possible exceptions, including non-Exception types
            Yii::error("Error retrieving latest measurement for device {$deviceUuid}: " . $e->getMessage() . "\n" . $e->getTraceAsString(), 'api.device-measurement');
            Yii::$app->response->statusCode = 404;
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Pobiera statystyki pomiarów dla urządzenia
     * 
     * @param string $deviceUuid UUID urządzenia
     * @return array
     */    public function actionStats($deviceUuid)
    {
        try {
            // Force proper JSON response type
            Yii::$app->response->format = Response::FORMAT_JSON;
            
            $handler = new DeviceMeasurementService($deviceUuid);
            $stats = $handler->getMeasurementStats();

            return [
                'success' => true,
                'data' => $stats
            ];
        } catch (\Throwable $e) {
            Yii::error("Error retrieving stats for device {$deviceUuid}: " . $e->getMessage() . "\n" . $e->getTraceAsString(), 'api.device-measurement');
            Yii::$app->response->statusCode = 404;
            return [
                'success' => false,
                'error' => "Error retrieving stats for device {$deviceUuid}"
            ];
        }
    }

    /**
     * Pobiera pomiary z określonego zakresu czasowego
     * 
     * @param string $deviceUuid UUID urządzenia
     * @param int $startTimestamp Początkowy timestamp
     * @param int $endTimestamp Końcowy timestamp
     * @return array
     */    public function actionRange($deviceUuid, $startTimestamp, $endTimestamp)
    {
        try {
            // Force proper JSON response type
            Yii::$app->response->format = Response::FORMAT_JSON;
            
            $handler = new DeviceMeasurementService($deviceUuid);
            $measurements = $handler->getMeasurementsInTimeRange($startTimestamp, $endTimestamp);

            return [
                'success' => true,
                'data' => $measurements
            ];
        } catch (\Throwable $e) {
            Yii::error("Error retrieving measurements in range for device {$deviceUuid}: " . $e->getMessage() . "\n" . $e->getTraceAsString(), 'api.device-measurement');
            Yii::$app->response->statusCode = 404;
            return [
                'success' => false,
                'error' => "Error retrieving measurements in time range for device {$deviceUuid}"
            ];
        }
    }

    /**
     * Simple test endpoint to check if API is accessible
     * @return array
     */
    public function actionTest()
    {
        Yii::info("Test endpoint accessed", 'api.device-measurement');
        
        return [
            'success' => true,
            'message' => 'API is working correctly',
            'timestamp' => date('Y-m-d H:i:s')
        ];
    }

    /**
     * Simple echo endpoint to test API response
     * 
     * @param string $message Optional message to echo back
     * @return array
     */
    public function actionEcho($message = 'Hello API')
    {
        Yii::info("Echo endpoint called with message: {$message}", 'api.device-measurement');
        
        return [
            'success' => true,
            'message' => $message,
            'time' => date('Y-m-d H:i:s'),
            'server' => $_SERVER['SERVER_NAME'] ?? 'unknown'
        ];
    }

    /**
     * Receives batch measurement data from external script and saves to MeasurementData
     * Endpoint: POST /api/device-measurement/phenomen-batch
     *
     * Expected JSON payload:
     * {
     *   "phenomenomId": 12345,
     *   "timestamp": "2024-05-30T12:34:56.789Z",
     *   "data": { ... },
     *   "sampling_frequency": 100,
     *   "deviceId": "DEVICE001"
     * }
     *
     * @return array
     */
    public function actionPhenomenBatch()
    {
        Yii::$app->response->format = Response::FORMAT_JSON;
        $request = Yii::$app->request;
        $body = $request->getRawBody();
        $data = json_decode($body, true);

        if (!$data) {
            Yii::$app->response->statusCode = 400;
            return [
                'success' => false,
                'error' => 'Invalid JSON payload.'
            ];
        }

        // Validate required fields
        $deviceId = $data['deviceId'] ?? null;
        $phenomenonId = $data['phenomenomId'] ?? null;
        $timestamp = $data['timestamp'] ?? null;
        $payload = $data['data'] ?? null;
        
        if ( !$payload) {
            Yii::$app->response->statusCode = 422;
            return [
                'success' => false,
                'error' => 'Missing required fields: data.'
            ];
        }
        if ( !$deviceId) {
            Yii::$app->response->statusCode = 422;
            return [
                'success' => false,
                'error' => 'Missing required fields: deviceId'
            ];
        }
        if ( !$timestamp) {
            Yii::$app->response->statusCode = 422;
            return [
                'success' => false,
                'error' => 'Missing required fields: timestamp'
            ];
        }

        $phenomenon = Phenomena::findOne(['phenomenon_id' => $phenomenonId, 'status' => Phenomena::STATUS_ACTIVE]);
        if (!$phenomenon) {
            Yii::$app->response->statusCode = 422;
            return [
                'success' => false,
                'error' => 'Phenomenon not found'
            ];
        }

        if (!$phenomenon) {
            Yii::$app->response->statusCode = 422;
            return [
                'success' => false,
                'error' => 'Phenomenon not found'
            ];
        }

        $experiment = Experiments::findOne(['experiment_id' => $phenomenon->experiment_id]);
        if (!$experiment) {
            Yii::$app->response->statusCode = 422;
            return [
                'success' => false,
                'error' => 'Experiment not found'
            ];
        }

        if ($experiment->type === Experiments::STREAM) {
            Yii::$app->response->statusCode = 422;
            return [
                'success' => false,
                'error' => 'Stream experiment can not receive data from batch experiment'
            ];
        }

        if ($experiment->status !== Experiments::STATUS_RUNNING) {
            Yii::$app->response->statusCode = 422;
            return [
                'success' => false,
                'error' => 'Experiment is not running'
            ];
        }        try {
            $measurement = new \app\models\MeasurementData();
            $measurement->device_id = $deviceId;
            $measurement->phenomenon_id = $phenomenonId;
            $measurement->timestamp = $timestamp;
            $measurement->data_payload = $payload;
            $measurement->upload_type = 'batch'; // Set upload type for batch data

            if ($measurement->save()) {
                return [
                    'success' => true,
                    'data_id' => $measurement->data_id
                ];
            } else {
                Yii::$app->response->statusCode = 500;
                return [
                    'success' => false,
                    'error' => $measurement->getErrors()
                ];
            }
        } catch (\Throwable $e) {
            Yii::error("Error saving batch measurement: " . $e->getMessage(), 'api.device-measurement');
            Yii::$app->response->statusCode = 500;
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Pobiera nieprzypiaane pomiary dla urządzenia (phenomenon_id = null)
     * 
     * @param string $deviceUuid UUID urządzenia
     * @param int $limit Limit pomiarów
     * @return array
     */    public function actionUnassigned($deviceUuid, $limit = 100, $startDate = null, $endDate = null)
    {
        Yii::info("Received request for unassigned measurements for device: {$deviceUuid}, limit: {$limit}, startDate: {$startDate}, endDate: {$endDate}", 'api.device-measurement');
        
        try {
            // Force proper JSON response type
            Yii::$app->response->format = Response::FORMAT_JSON;
            
            Yii::beginProfile('unassigned-measurements', 'api.performance');
            
            // Fetch unassigned data from measurement_data table where phenomenon_id is null
            $query = \app\models\MeasurementData::find()
                ->where(['device_id' => $deviceUuid, 'phenomenon_id' => null]);
            
            // Add date range filtering if provided
            if ($startDate) {
                $query->andWhere(['>=', 'timestamp', $startDate]);
            }
            if ($endDate) {
                $query->andWhere(['<=', 'timestamp', $endDate]);
            }
            
            $measurements = $query
                ->orderBy(['timestamp' => SORT_DESC])
                ->limit((int)$limit)
                ->all();
            
            // Format the data for response
            $data = array_map(function($measurement) {
                return [
                    'data_id' => (int)$measurement->data_id,
                    'device_id' => $measurement->device_id,
                    'phenomenon_id' => $measurement->phenomenon_id,
                    'data_payload' => $measurement->data_payload,
                    'upload_type' => $measurement->upload_type ?? 'batch',
                    'timestamp' => $measurement->timestamp,
                ];
            }, $measurements);
            
            Yii::endProfile('unassigned-measurements', 'api.performance');
            
            Yii::info("Successfully retrieved " . count($data) . " unassigned measurements for device: {$deviceUuid}", 'api.device-measurement');
            
            return [
                'success' => true,
                'data' => $data,
                'count' => count($data)
            ];
        } catch (\Throwable $e) {
            Yii::error("Error retrieving unassigned measurements for device {$deviceUuid}: " . $e->getMessage() . "\n" . $e->getTraceAsString(), 'api.device-measurement');
            Yii::$app->response->statusCode = 500;
            return [
                'success' => false,
                'error' => "Error retrieving unassigned measurements for device {$deviceUuid}"
            ];
        }
    }
}