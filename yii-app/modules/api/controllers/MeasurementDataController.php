<?php
namespace app\modules\api\controllers;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use app\models\MeasurementData;

class MeasurementDataController extends Controller
{
    /**
     * @inheritdoc
     */
    public function behaviors()
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
    }

    /**
     * Get measurement data for a specific phenomenon
     * 
     * @param string $phenomenonId Phenomenon ID
     * @return array
     */
    public function actionPhenomenon($phenomenonId)
    {
        try {
            // Force proper JSON response type
            Yii::$app->response->format = Response::FORMAT_JSON;
            
            Yii::info("Fetching measurement data for phenomenon: {$phenomenonId}", 'api.measurement-data');
            
            $measurements = MeasurementData::find()
                ->where(['phenomenon_id' => $phenomenonId])
                ->orderBy(['timestamp' => SORT_DESC])
                ->all();
            
            $data = array_map(function($measurement) {
                return [
                    'data_id' => (int)$measurement->data_id,
                    'device_id' => $measurement->device_id,
                    'phenomenon_id' => $measurement->phenomenon_id,
                    'data_payload' => $measurement->data_payload,
                    'timestamp' => $measurement->timestamp,
                ];
            }, $measurements);
            
            Yii::info("Successfully retrieved " . count($data) . " measurement data records for phenomenon: {$phenomenonId}", 'api.measurement-data');
            
            return [
                'success' => true,
                'data' => $data
            ];
            
        } catch (\Throwable $e) {
            Yii::error("Error retrieving measurement data for phenomenon {$phenomenonId}: " . $e->getMessage() . "\n" . $e->getTraceAsString(), 'api.measurement-data');
            Yii::$app->response->statusCode = 500;
            return [
                'success' => false,
                'error' => "Error retrieving measurement data for phenomenon {$phenomenonId}"
            ];
        }
    }

    /**
     * Get measurement data for a specific device
     * 
     * @param string $deviceId Device ID
     * @param int $limit Limit number of records
     * @return array
     */
    public function actionDevice($deviceId, $limit = 100)
    {
        try {
            // Force proper JSON response type
            Yii::$app->response->format = Response::FORMAT_JSON;
            
            Yii::info("Fetching measurement data for device: {$deviceId}, limit: {$limit}", 'api.measurement-data');
            
            $measurements = MeasurementData::find()
                ->where(['device_id' => $deviceId])
                ->orderBy(['timestamp' => SORT_DESC])
                ->limit($limit)
                ->all();
            
            $data = array_map(function($measurement) {
                return [
                    'data_id' => (int)$measurement->data_id,
                    'device_id' => $measurement->device_id,
                    'phenomenon_id' => $measurement->phenomenon_id,
                    'data_payload' => $measurement->data_payload,
                    'timestamp' => $measurement->timestamp,
                ];
            }, $measurements);
            
            Yii::info("Successfully retrieved " . count($data) . " measurement data records for device: {$deviceId}", 'api.measurement-data');
            
            return [
                'success' => true,
                'data' => $data
            ];
            
        } catch (\Throwable $e) {
            Yii::error("Error retrieving measurement data for device {$deviceId}: " . $e->getMessage() . "\n" . $e->getTraceAsString(), 'api.measurement-data');
            Yii::$app->response->statusCode = 500;
            return [
                'success' => false,
                'error' => "Error retrieving measurement data for device {$deviceId}"
            ];
        }
    }

    /**
     * Get all measurement data with optional filters
     * 
     * @param int $limit Limit number of records
     * @return array
     */
    public function actionIndex($limit = 100)
    {
        try {
            // Force proper JSON response type
            Yii::$app->response->format = Response::FORMAT_JSON;
            
            Yii::info("Fetching all measurement data, limit: {$limit}", 'api.measurement-data');
            
            $measurements = MeasurementData::find()
                ->orderBy(['timestamp' => SORT_DESC])
                ->limit($limit)
                ->all();
            
            $data = array_map(function($measurement) {
                return [
                    'data_id' => (int)$measurement->data_id,
                    'device_id' => $measurement->device_id,
                    'phenomenon_id' => $measurement->phenomenon_id,
                    'data_payload' => $measurement->data_payload,
                    'timestamp' => $measurement->timestamp,
                ];
            }, $measurements);
            
            Yii::info("Successfully retrieved " . count($data) . " measurement data records", 'api.measurement-data');
            
            return [
                'success' => true,
                'data' => $data
            ];
            
        } catch (\Throwable $e) {
            Yii::error("Error retrieving measurement data: " . $e->getMessage() . "\n" . $e->getTraceAsString(), 'api.measurement-data');
            Yii::$app->response->statusCode = 500;
            return [
                'success' => false,
                'error' => "Error retrieving measurement data"
            ];
        }
    }

    /**
     * Simple echo endpoint to test API response
     * 
     * @param string $message Optional message to echo back
     * @return array
     */
    public function actionEcho($message = 'MeasurementData API is working')
    {
        Yii::info("MeasurementData echo endpoint called with message: {$message}", 'api.measurement-data');
        
        return [
            'success' => true,
            'message' => $message,
            'time' => date('Y-m-d H:i:s'),
            'controller' => 'MeasurementDataController'
        ];
    }
}
