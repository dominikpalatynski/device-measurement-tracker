<?php
namespace app\modules\api\controllers;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use app\services\DeviceMeasurementService;

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
    }/**
     * Pobiera wszystkie pomiary dla urządzenia
     * 
     * @param string $deviceUuid UUID urządzenia
     * @param int $limit Limit pomiarów
     * @return array
     */    public function actionIndex($deviceUuid, $limit = 10)
    {
        Yii::info("Received request for measurements list for device: {$deviceUuid}, limit: {$limit}", 'api.device-measurement');
        
        try {
            // Force proper JSON response type
            Yii::$app->response->format = Response::FORMAT_JSON;
            
            Yii::beginProfile('all-measurements', 'api.performance');
            $handler = new DeviceMeasurementService($deviceUuid);
            $measurements = $handler->getAllMeasurements($limit);
            Yii::endProfile('all-measurements', 'api.performance');
            
            Yii::info("Successfully retrieved " . count($measurements) . " measurements for device: {$deviceUuid}", 'api.device-measurement');
            
            return [
                'success' => true,
                'data' => $measurements
            ];
        } catch (\Throwable $e) {
            Yii::error("Error retrieving measurements for device {$deviceUuid}: " . $e->getMessage() . "\n" . $e->getTraceAsString(), 'api.device-measurement');
            Yii::$app->response->statusCode = 404;
            return [
                'success' => false,
                'error' => $e->getMessage()
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
}