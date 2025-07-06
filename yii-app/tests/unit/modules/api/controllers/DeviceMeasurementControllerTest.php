<?php
namespace tests\unit\modules\api\controllers;

require_once __DIR__ . '/stubs/DevicesStub.php';

use PHPUnit\Framework\TestCase;
use app\modules\api\controllers\DeviceMeasurementController;
use Yii;
use yii\web\Response;
use yii\web\UnauthorizedHttpException;
use yii\web\BadRequestHttpException;
use tests\unit\modules\api\controllers\stubs\DevicesStub;

// Test double for Devices
if (!class_exists('app\\models\\Devices', false)) {
    class_alias('tests\\unit\\modules\\api\\controllers\\stubs\\DevicesStub', 'app\\models\\Devices');
}

/**
 * @covers \app\modules\api\controllers\DeviceMeasurementController
 */
class DeviceMeasurementControllerTest extends TestCase
{
    private $controller;

    protected function setUp(): void
    {
        parent::setUp();
        $this->controller = new DeviceMeasurementController('device-measurement', null);
        // Mock MongoDBService to avoid real DB calls
        $mockMongo = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['saveMeasurementData'])
            ->getMock();
        $mockMongo->method('saveMeasurementData')->willReturn(true);
        // Use reflection to set private property mongoService
        $ref = new \ReflectionClass($this->controller);
        $prop = $ref->getProperty('mongoService');
        $prop->setAccessible(true);
        $prop->setValue($this->controller, $mockMongo);
    }

    public function testActionGenerateBatchTokenMissingDeviceId()
    {
        DevicesStub::setFindByDeviceIdResult(null);
        Yii::$app->request->setQueryParams([]);
        $result = $this->controller->actionGenerateBatchToken();
        $this->assertFalse($result['success']);
        $this->assertEquals('Missing deviceId parameter', $result['error']);
    }

    public function testActionGenerateBatchTokenDeviceNotFound()
    {
        DevicesStub::setFindByDeviceIdResult(null);
        Yii::$app->request->setQueryParams(['deviceId' => 'DEV404']);
        $result = $this->controller->actionGenerateBatchToken();
        $this->assertFalse($result['success']);
        $this->assertEquals('Device not found: DEV404', $result['error']);
    }

    public function testActionGenerateBatchTokenDeviceNotActive()
    {
        $device = new DevicesStub();
        $device->device_id = 'DEV001';
        $device->status = 'inactive';
        DevicesStub::setFindByDeviceIdResult($device);
        Yii::$app->request->setQueryParams(['deviceId' => 'DEV001']);
        $result = $this->controller->actionGenerateBatchToken();
        $this->assertFalse($result['success']);
        $this->assertEquals('Device DEV001 is not active', $result['error']);
    }

    public function testActionGenerateBatchTokenSuccess()
    {
        $device = new DevicesStub();
        $device->device_id = 'DEV001';
        $device->status = 'active';
        DevicesStub::setFindByDeviceIdResult($device);
        Yii::$app->request->setQueryParams(['deviceId' => 'DEV001']);
        $result = $this->controller->actionGenerateBatchToken();
        $this->assertTrue($result['success']);
        $this->assertArrayHasKey('token', $result);
    }

    public function testActionPhenomenBatchInvalidJson()
    {
        Yii::$app->request->setRawBody('not a json');
        $result = $this->controller->actionPhenomenBatch();
        $this->assertFalse($result['success']);
        $this->assertEquals('Invalid JSON payload.', $result['error']);
    }

    public function testValidateBatchTokenMissingHeader()
    {
        $this->expectException(\yii\web\UnauthorizedHttpException::class);
        Yii::$app->request->getHeaders()->remove('Authorization');
        $data = ['deviceId' => 'DEV001'];
        $ref = new \ReflectionClass($this->controller);
        $method = $ref->getMethod('validateBatchToken');
        $method->setAccessible(true);
        $method->invoke($this->controller, $data);
    }

    public function testValidateBatchTokenInvalidToken()
    {
        Yii::$app->request->getHeaders()->set('Authorization', 'Bearer invalidtoken');
        $data = ['deviceId' => 'DEV001'];
        $this->expectException(\yii\web\UnauthorizedHttpException::class);
        $ref = new \ReflectionClass($this->controller);
        $method = $ref->getMethod('validateBatchToken');
        $method->setAccessible(true);
        $method->invoke($this->controller, $data);
    }

    public function testProcessBatchDataDeviceNotFound()
    {
        DevicesStub::setFindByDeviceIdResult(null);
        $data = ['deviceId' => 'DEV404', 'data_series' => [1,2,3]];
        $ref = new \ReflectionClass($this->controller);
        $method = $ref->getMethod('processBatchData');
        $method->setAccessible(true);
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Device not found: DEV404');
        $method->invoke($this->controller, $data);
    }

    public function testProcessBatchDataMissingDataSeries()
    {
        $device = new DevicesStub();
        $device->device_id = 'DEV001';
        DevicesStub::setFindByDeviceIdResult($device);
        $data = ['deviceId' => 'DEV001'];
        $ref = new \ReflectionClass($this->controller);
        $method = $ref->getMethod('processBatchData');
        $method->setAccessible(true);
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Missing data_series in request');
        $method->invoke($this->controller, $data);
    }

    public function testProcessBatchDataMongoUnavailable()
    {
        $device = new DevicesStub();
        $device->device_id = 'DEV001';
        DevicesStub::setFindByDeviceIdResult($device);
        $data = [
            'deviceId' => 'DEV001', 
            'data_series' => 'test_series',
            'data' => [1,2,3]
        ];
        
        // Mock MongoDBService to simulate failure
        $mockMongo = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['saveMeasurementData'])
            ->getMock();
        $mockMongo->method('saveMeasurementData')->willReturn(false);
        
        // Use reflection to set private property mongoService
        $ref = new \ReflectionClass($this->controller);
        $prop = $ref->getProperty('mongoService');
        $prop->setAccessible(true);
        $prop->setValue($this->controller, $mockMongo);
        
        $method = $ref->getMethod('processBatchData');
        $method->setAccessible(true);
        $this->expectException(\Exception::class);
        $this->expectExceptionMessage('Failed to save measurement to MongoDB');
        $method->invoke($this->controller, $data);
    }

    // You can add more tests for valid/invalid JWT, expired token, inactive device, etc. as needed.
} 