<?php
namespace app\modules\api\controllers;

use Yii;
use yii\rest\ActiveController;
use yii\data\ActiveDataProvider;
use app\models\Device;
use yii\web\NotFoundHttpException;

class DeviceController extends ActiveController
{
    public $modelClass = 'app\models\Device';
    
    public function actions()
    {
        $actions = parent::actions();
        
        // Customize the index action
        $actions['index']['prepareDataProvider'] = function ($action) {
            return new ActiveDataProvider([
                'query' => Device::find()->orderBy(['created_at' => SORT_DESC]),
                'pagination' => [
                    'pageSize' => 20,
                ],
            ]);
        };
        
        return $actions;
    }
    
    /**
     * Get device status information
     */
    public function actionStatus($id)
    {
        $device = Device::findOne(['device_uuid' => $id]);
        
        if (!$device) {
            throw new NotFoundHttpException("Device not found");
        }
        
        return [
            'id' => $device->device_uuid,
            'name' => $device->name,
            'type' => $device->type,
            'status' => $device->status,
            'isOnline' => $device->last_seen_at && (time() - $device->last_seen_at < 300),
            'lastSeen' => $device->last_seen_at ? date('Y-m-d H:i:s', $device->last_seen_at) : null,
        ];
    }
}