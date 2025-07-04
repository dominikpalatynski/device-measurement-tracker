<?php
namespace app\services;
 
interface DeviceRepositoryInterface
{
    public function findByDeviceId($id);
} 