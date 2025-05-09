<?php
namespace app\modules\api\controllers;

use Yii;
use yii\rest\ActiveController;
use yii\data\ActiveDataProvider;
use app\models\Measurement;
use app\models\Device;
use yii\web\NotFoundHttpException;
use app\services\MeasurementService;

class MeasurementController extends ActiveController
{
    public $modelClass = 'app\models\Measurement';
    
    /**
     * @var MeasurementService
     */
    private $measurementService;
    
    public function __construct($id, $module, MeasurementService $measurementService, $config = [])
    {
        $this->measurementService = $measurementService;
        parent::__construct($id, $module, $config);
    }
    
    public function actions()
    {
        $actions = parent::actions();
        
        // Customize the index action
        $actions['index']['prepareDataProvider'] = function ($action) {
            $params = Yii::$app->request->queryParams;
            
            return new ActiveDataProvider([
                'query' => Measurement::find()
                    ->orderBy(['measured_at' => SORT_DESC]),
                'pagination' => [
                    'pageSize' => 20,
                ],
            ]);
        };
        
        return $actions;
    }
    
    /**
     * Get latest measurements for specific device
     */
    public function actionDevice($id)
    {
        $device = Device::findOne(['device_uuid' => $id]);
        
        if (!$device) {
            throw new NotFoundHttpException("Device not found");
        }
        
        return new ActiveDataProvider([
            'query' => Measurement::find()
                ->where(['device_id' => $device->id])
                ->orderBy(['measured_at' => SORT_DESC]),
            'pagination' => [
                'pageSize' => 20,
            ],
        ]);
    }
    
    /**
     * Get latest measurements for all devices
     */
    public function actionLatest()
    {
        $devices = Device::find()->all();
        $result = [];
        
        foreach ($devices as $device) {
            $latestMeasurement = Measurement::find()
                ->where(['device_id' => $device->id])
                ->orderBy(['measured_at' => SORT_DESC])
                ->one();
                
            if ($latestMeasurement) {
                $result[] = [
                    'deviceId' => $device->device_uuid,
                    'deviceName' => $device->name,
                    'measurement' => $latestMeasurement->attributes,
                    'measuredAt' => date('Y-m-d H:i:s', $latestMeasurement->measured_at),
                ];
            }
        }
        
        return $result;
    }
    
    /**
     * Manually add a measurement (useful for testing)
     */
    public function actionAdd()
    {
        $data = Yii::$app->request->getBodyParams();
        
        if (!isset($data['deviceId'])) {
            return [
                'success' => false,
                'message' => 'Missing deviceId parameter'
            ];
        }
        
        $result = $this->measurementService->processMqttMessage(
            "devices/{$data['deviceId']}/measurements",
            json_encode($data)
        );
        
        if ($result) {
            return [
                'success' => true,
                'message' => 'Measurement added successfully',
                'measurement' => $result->attributes
            ];
        } else {
            return [
                'success' => false,
                'message' => 'Failed to add measurement'
            ];
        }
    }
}