<?php
namespace app\services;
 
interface FaultRepositoryInterface
{
    public function findActiveByDeviceId($deviceId);
} 