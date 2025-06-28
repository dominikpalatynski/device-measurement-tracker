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
    }    /**
     * Get measurement data for a specific condition
     * 
     * @param string $conditionId Condition ID
     * @param string $startDate Start date filter (optional)
     * @param string $endDate End date filter (optional)
     * @return array
     */
    public function actionCondition($conditionId, $startDate = null, $endDate = null)
    {
        try {
            // Force proper JSON response type
            Yii::$app->response->format = Response::FORMAT_JSON;
            
            Yii::info("Fetching measurement data for condition: {$conditionId}, startDate: {$startDate}, endDate: {$endDate}", 'api.measurement-data');
            
            $query = MeasurementData::find()
                ->where(['condition_id' => $conditionId]);
            
            // Add date range filtering if provided
            if ($startDate) {
                $query->andWhere(['>=', 'timestamp', $startDate]);
            }
            if ($endDate) {
                $query->andWhere(['<=', 'timestamp', $endDate]);
            }
            
            $measurements = $query
                ->orderBy(['timestamp' => SORT_DESC])
                ->all();
            
            $data = array_map(function($measurement) {
                return $measurement->data_payload; // Assuming data_payload is already in the desired format
            }, $measurements);
            
            Yii::info("Successfully retrieved " . count($data) . " measurement data records for condition: {$conditionId}", 'api.measurement-data');
            
            return [
                'success' => true,
                'data' => $data
            ];
            
        } catch (\Throwable $e) {
            Yii::error("Error retrieving measurement data for condition {$conditionId}: " . $e->getMessage() . "\n" . $e->getTraceAsString(), 'api.measurement-data');
            Yii::$app->response->statusCode = 500;
            return [
                'success' => false,
                'error' => "Error retrieving measurement data for condition {$conditionId}"
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
                    'condition_id' => $measurement->condition_id,
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
                    'condition_id' => $measurement->condition_id,
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

    /**
     * Get live measurement data for a specific condition with real-time polling support
     * 
     * @param string $conditionId Condition ID
     * @param int $limit Maximum number of records to return (default: 50)
     * @param string|null $since Timestamp to get measurements since (optional)
     * @return array
     */
    public function actionConditionLive($conditionId, $limit = 50, $since = null)
    {
        try {
            // Force proper JSON response type
            Yii::$app->response->format = Response::FORMAT_JSON;
            
            Yii::info("Fetching live measurement data for condition: {$conditionId}, limit: {$limit}, since: {$since}", 'api.measurement-data');
            
            $query = MeasurementData::find()
                ->where(['condition_id' => $conditionId]);
            
            // If 'since' timestamp is provided, filter for newer records
            if ($since) {
                $query->andWhere(['>', 'timestamp', $since]);
            }
            
            $measurements = $query
                ->orderBy(['timestamp' => SORT_DESC])
                ->limit((int)$limit)
                ->all();
            // Convert to array with proper data types
            $data = array_map(function($measurement) {
                return [
                    'data_id' => (int)$measurement->data_id,
                    'device_id' => $measurement->device_id,
                    'condition_id' => $measurement->condition_id,
                    'data_payload' => $measurement->data_payload,
                    'timestamp' => $measurement->timestamp,
                ];
            }, $measurements);
            
            Yii::info("Successfully retrieved " . count($data) . " live measurement data records", 'api.measurement-data');
            
            return [
                'success' => true,
                'data' => $data,
                'count' => count($data),
                'since' => $since,
                'query_time' => date('Y-m-d H:i:s')
            ];
            
        } catch (\Throwable $e) {
            Yii::error("Error retrieving live measurement data: " . $e->getMessage() . "\n" . $e->getTraceAsString(), 'api.measurement-data');
            Yii::$app->response->statusCode = 500;
            return [
                'success' => false,
                'error' => "Error retrieving live measurement data"
            ];
        }
    }

    /**
     * Get the latest measurement data for a specific condition
     * 
     * @param string $conditionId Condition ID
     * @return array
     */
    public function actionConditionLatest($conditionId)
    {
        try {
            // Force proper JSON response type
            Yii::$app->response->format = Response::FORMAT_JSON;
            
            Yii::info("Fetching latest measurement data for condition: {$conditionId}", 'api.measurement-data');
            
            $measurement = MeasurementData::find()
                ->where(['condition_id' => $conditionId])
                ->orderBy(['timestamp' => SORT_DESC])
                ->one();
            
            if (!$measurement) {
                return [
                    'success' => true,
                    'data' => [],
                    'message' => 'No measurement data found for this condition'
                ];
            }
            
            $data = [
                'data_id' => (int)$measurement->data_id,
                'device_id' => $measurement->device_id,
                'condition_id' => $measurement->condition_id,
                'data_payload' => $measurement->data_payload,
                'timestamp' => $measurement->timestamp,
            ];
            
            Yii::info("Successfully retrieved latest measurement data record", 'api.measurement-data');
            
            return [
                'success' => true,
                'data' => [$data], // Return as array for consistency with other endpoints
                'count' => 1,
                'query_time' => date('Y-m-d H:i:s')
            ];
            
        } catch (\Throwable $e) {
            Yii::error("Error retrieving latest measurement data: " . $e->getMessage() . "\n" . $e->getTraceAsString(), 'api.measurement-data');
            Yii::$app->response->statusCode = 500;
            return [
                'success' => false,
                'error' => "Error retrieving latest measurement data"
            ];
        }
    }

    /**
     * Get the latest measurements from measurement_data table with auto-refresh support
     * 
     * @param int $limit Maximum number of records to return (default: 50)
     * @param string|null $deviceId Optional device filter
     * @param string|null $conditionId Optional condition filter
     * @return array
     */
    public function actionLatestAll($limit = 50, $deviceId = null, $conditionId = null)
    {
        try {
            // Force proper JSON response type
            Yii::$app->response->format = Response::FORMAT_JSON;
            
            Yii::info("Fetching latest {$limit} measurement data records", 'api.measurement-data');
            
            $query = MeasurementData::find();
            
            // Apply filters if provided
            if ($deviceId) {
                $query->andWhere(['device_id' => $deviceId]);
            }
            if ($conditionId) {
                $query->andWhere(['condition_id' => $conditionId]);
            }
            
            $measurements = $query
                ->orderBy(['timestamp' => SORT_DESC])
                ->limit((int)$limit)
                ->all();
            
            // Convert to array with proper data types
            $data = array_map(function($measurement) {
                return [
                    'data_id' => (int)$measurement->data_id,
                    'device_id' => $measurement->device_id,
                    'condition_id' => $measurement->condition_id,
                    'data_payload' => $measurement->data_payload,
                    'timestamp' => $measurement->timestamp,
                ];
            }, $measurements);
            
            Yii::info("Successfully retrieved " . count($data) . " latest measurement data records", 'api.measurement-data');
            
            return [
                'success' => true,
                'data' => $data,
                'count' => count($data),
                'query_time' => date('Y-m-d H:i:s'),
                'filters' => [
                    'device_id' => $deviceId,
                    'condition_id' => $conditionId,
                    'limit' => $limit
                ]
            ];
            
        } catch (\Throwable $e) {
            Yii::error("Error retrieving latest measurement data: " . $e->getMessage() . "\n" . $e->getTraceAsString(), 'api.measurement-data');
            Yii::$app->response->statusCode = 500;
            return [
                'success' => false,
                'error' => "Error retrieving latest measurement data"
            ];
        }
    }
}
