<?php
namespace tests\unit\models;

use PHPUnit\Framework\TestCase;
use app\models\Devices;

/**
 * @covers \app\models\Devices
 */
class DevicesTest extends TestCase
{
    public function testCanBeInstantiated()
    {
        $device = new Devices();
        $this->assertInstanceOf(Devices::class, $device);
    }
} 