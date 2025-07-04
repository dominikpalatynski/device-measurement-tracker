<?php
namespace app\services;

use app\models\Devices;

class ActiveRecordDeviceRepository implements DeviceRepositoryInterface
{
    public function findByDeviceId($id)
    {
        return Devices::findByDeviceId($id);
    }
} 