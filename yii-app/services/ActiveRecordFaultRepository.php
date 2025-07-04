<?php
namespace app\services;

use app\models\Faults;

class ActiveRecordFaultRepository implements FaultRepositoryInterface
{
    public function findActiveByDeviceId($deviceId)
    {
        return Faults::find()->where(['device_id' => $deviceId, 'status' => Faults::STATUS_ACTIVE])->one();
    }
} 