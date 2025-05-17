<?php
namespace app\modules\api\controllers;

use Yii;
use yii\rest\Controller;
use yii\web\Response;
use app\services\DeviceMeasurementService;

class DeviceMeasurementController extends Controller
{
    /**
     * @inheritdoc
     */
    public function behaviors()
    {
        $behaviors = parent::behaviors();
        $behaviors['contentNegotiator']['formats']['application/json'] = Response::FORMAT_JSON;
        return $behaviors;
    }

    /**
     * Pobiera wszystkie pomiary dla urządzenia
     * 
     * @param string $deviceUuid UUID urządzenia
     * @param int $limit Limit pomiarów
     * @return array
     */
    public function actionIndex($deviceUuid, $limit = 10)
    {
        try {
            $handler = new DeviceMeasurementService($deviceUuid);
            $measurements = $handler->getAllMeasurements($limit);
            
            return [
                'success' => true,
                'data' => $measurements
            ];
        } catch (\Exception $e) {
            Yii::$app->response->statusCode = 404;
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Pobiera najnowszy pomiar dla urządzenia
     * 
     * @param string $deviceUuid UUID urządzenia
     * @return array
     */
    public function actionLatest($deviceUuid)
    {
        try {
            $handler = new DeviceMeasurementService($deviceUuid);
            $measurement = $handler->getLatestMeasurement();

            if (!$measurement) {
                Yii::$app->response->statusCode = 404;
                return [
                    'success' => false,
                    'error' => "Brak pomiarów dla urządzenia {$deviceUuid}"
                ];
            }

            return [
                'success' => true,
                'data' => $measurement
            ];
        } catch (\Exception $e) {
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
     */
    public function actionStats($deviceUuid)
    {
        try {
            $handler = new DeviceMeasurementService($deviceUuid);
            $stats = $handler->getMeasurementStats();

            return [
                'success' => true,
                'data' => $stats
            ];
        } catch (\Exception $e) {
            Yii::$app->response->statusCode = 404;
            return [
                'success' => false,
                'error' => $e->getMessage()
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
     */
    public function actionRange($deviceUuid, $startTimestamp, $endTimestamp)
    {
        try {
            $handler = new DeviceMeasurementService($deviceUuid);
            $measurements = $handler->getMeasurementsInTimeRange($startTimestamp, $endTimestamp);

            return [
                'success' => true,
                'data' => $measurements
            ];
        } catch (\Exception $e) {
            Yii::$app->response->statusCode = 404;
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }
} 