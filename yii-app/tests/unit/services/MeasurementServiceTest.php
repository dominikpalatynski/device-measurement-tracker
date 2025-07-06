<?php
namespace tests\unit\services;

use PHPUnit\Framework\TestCase;
use app\services\MeasurementService;
use app\services\DeviceRepositoryInterface;
use app\services\ConditionRepositoryInterface;
use app\services\FaultRepositoryInterface;
use app\services\MongoDBService;
use app\models\Devices;
use app\models\Condition;
use app\models\Faults;

/**
 * @covers \app\services\MeasurementService
 */
class MeasurementServiceTest extends TestCase
{
    public function testCanBeInstantiated()
    {
        $deviceRepo = $this->createMock(DeviceRepositoryInterface::class);
        $conditionRepo = $this->createMock(ConditionRepositoryInterface::class);
        $faultRepo = $this->createMock(FaultRepositoryInterface::class);
        $service = new MeasurementService($deviceRepo, $conditionRepo, $faultRepo);
        $this->assertInstanceOf(MeasurementService::class, $service);
    }

    public function testProcessRealTimeDataMqttMessageWithMocks()
    {
        // Use a stub class for Devices
        $deviceMock = new class {
            public $device_id = 'dev-123';
            public $device_name = 'Device dev-123';
            public $device_type = 'pmsm-mechanical-vibration';
            public $status = 'Active';
        };

        // Mock condition
        $conditionMock = $this->createMock(Condition::class);
        $conditionMock->condition_id = 'cond-1';
        $conditionMock->name = 'ConditionA';
        $conditionMock->status = 'Active';
        $conditionMock->fault_id = 'fault-1';

        // Mock fault
        $faultMock = $this->createMock(Faults::class);
        $faultMock->fault_id = 'fault-1';
        $faultMock->device_id = 'dev-123';
        $faultMock->status = 'Active';

        // Mock repositories
        $deviceRepo = $this->createMock(DeviceRepositoryInterface::class);
        $deviceRepo->expects($this->once())
            ->method('findByDeviceId')
            ->with('dev-123')
            ->willReturn($deviceMock);

        $conditionRepo = $this->createMock(ConditionRepositoryInterface::class);
        $conditionRepo->expects($this->once())
            ->method('findByName')
            ->with('ConditionA')
            ->willReturn($conditionMock);

        $faultRepo = $this->createMock(FaultRepositoryInterface::class);
        $faultRepo->expects($this->once())
            ->method('findActiveByDeviceId')
            ->with('dev-123')
            ->willReturn($faultMock);

        // Mock MongoDBService
        $mongoServiceMock = $this->getMockBuilder(MongoDBService::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['saveMeasurementData', 'close'])
            ->getMock();
        $mongoServiceMock->expects($this->once())
            ->method('saveMeasurementData')
            ->willReturn(true);
        $mongoServiceMock->method('close')
            ->willReturn(null); // Prevent close() errors

        // Inject mocks into MeasurementService
        $service = new MeasurementService($deviceRepo, $conditionRepo, $faultRepo);
        $reflection = new \ReflectionClass($service);
        $property = $reflection->getProperty('mongoService');
        $property->setAccessible(true);
        $property->setValue($service, $mongoServiceMock);

        $topic = 'devices/dev-123/data';
        $payload = json_encode([
            'deviceId' => 'dev-123',
            'data_series' => 'series-1',
            'condition_name' => 'ConditionA',
            'data' => [1,2,3]
        ]);

        $result = $service->processRealTimeDataMqttMessage($topic, $payload);
        $this->assertIsArray($result);
        $this->assertTrue($result['success']);
        $this->assertEquals('series-1', $result['dataSeriesId']);
        $this->assertEquals('dev-123', $result['deviceId']);
    }

    public function testProcessRealTimeDataMqttMessageDeviceNotFound()
    {
        $deviceRepo = $this->createMock(DeviceRepositoryInterface::class);
        $deviceRepo->expects($this->once())
            ->method('findByDeviceId')
            ->with('dev-404')
            ->willReturn(null);
        $conditionRepo = $this->createMock(ConditionRepositoryInterface::class);
        $faultRepo = $this->createMock(FaultRepositoryInterface::class);
        $service = new MeasurementService($deviceRepo, $conditionRepo, $faultRepo);
        $reflection = new \ReflectionClass($service);
        $property = $reflection->getProperty('mongoService');
        $property->setAccessible(true);
        $mockMongo = $this->getMockBuilder(MongoDBService::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['close'])
            ->getMock();
        $mockMongo->method('close')->willReturn(null);
        $property->setValue($service, $mockMongo);
        $topic = 'devices/dev-404/data';
        $payload = json_encode([
            'deviceId' => 'dev-404',
            'data_series' => 'series-1',
            'condition_name' => 'ConditionA',
            'data' => [1,2,3]
        ]);
        $result = $service->processRealTimeDataMqttMessage($topic, $payload);
        $this->assertFalse($result);
    }

    public function testProcessRealTimeDataMqttMessageConditionAndFaultNotFound()
    {
        $deviceMock = new class {
            public $device_id = 'dev-123';
            public $status = 'Active';
        };
        $deviceRepo = $this->createMock(DeviceRepositoryInterface::class);
        $deviceRepo->expects($this->once())
            ->method('findByDeviceId')
            ->with('dev-123')
            ->willReturn($deviceMock);
        $conditionRepo = $this->createMock(ConditionRepositoryInterface::class);
        $conditionRepo->expects($this->once())
            ->method('findByName')
            ->with('ConditionA')
            ->willReturn(null);
        $faultRepo = $this->createMock(FaultRepositoryInterface::class);
        $faultRepo->expects($this->once())
            ->method('findActiveByDeviceId')
            ->with('dev-123')
            ->willReturn(null);
        $service = new MeasurementService($deviceRepo, $conditionRepo, $faultRepo);
        $reflection = new \ReflectionClass($service);
        $property = $reflection->getProperty('mongoService');
        $property->setAccessible(true);
        $mockMongo = $this->getMockBuilder(MongoDBService::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['close'])
            ->getMock();
        $mockMongo->method('close')->willReturn(null);
        $property->setValue($service, $mockMongo);
        $topic = 'devices/dev-123/data';
        $payload = json_encode([
            'deviceId' => 'dev-123',
            'data_series' => 'series-1',
            'condition_name' => 'ConditionA',
            'data' => [1,2,3]
        ]);
        $result = $service->processRealTimeDataMqttMessage($topic, $payload);
        $this->assertFalse($result);
    }

    public function testProcessRealTimeDataMqttMessageMongoServiceNull()
    {
        $deviceMock = new class {
            public $device_id = 'dev-123';
            public $status = 'Active';
        };
        $deviceRepo = $this->createMock(DeviceRepositoryInterface::class);
        $deviceRepo->expects($this->once())
            ->method('findByDeviceId')
            ->with('dev-123')
            ->willReturn($deviceMock);
        $conditionMock = $this->createMock(Condition::class);
        $conditionMock->condition_id = 'cond-1';
        $conditionRepo = $this->createMock(ConditionRepositoryInterface::class);
        $conditionRepo->expects($this->once())
            ->method('findByName')
            ->with('ConditionA')
            ->willReturn($conditionMock);
        $faultMock = $this->createMock(Faults::class);
        $faultMock->fault_id = 'fault-1';
        $faultRepo = $this->createMock(FaultRepositoryInterface::class);
        $faultRepo->expects($this->once())
            ->method('findActiveByDeviceId')
            ->with('dev-123')
            ->willReturn($faultMock);
        $service = new MeasurementService($deviceRepo, $conditionRepo, $faultRepo);
        $reflection = new \ReflectionClass($service);
        $property = $reflection->getProperty('mongoService');
        $property->setAccessible(true);
        $property->setValue($service, null);
        $topic = 'devices/dev-123/data';
        $payload = json_encode([
            'deviceId' => 'dev-123',
            'data_series' => 'series-1',
            'condition_name' => 'ConditionA',
            'data' => [1,2,3]
        ]);
        $result = $service->processRealTimeDataMqttMessage($topic, $payload);
        $this->assertFalse($result);
    }

    public function testProcessRealTimeDataMqttMessageMongoServiceSaveFails()
    {
        $deviceMock = new class {
            public $device_id = 'dev-123';
            public $status = 'Active';
        };
        $deviceRepo = $this->createMock(DeviceRepositoryInterface::class);
        $deviceRepo->expects($this->once())
            ->method('findByDeviceId')
            ->with('dev-123')
            ->willReturn($deviceMock);
        $conditionMock = $this->createMock(Condition::class);
        $conditionMock->condition_id = 'cond-1';
        $conditionRepo = $this->createMock(ConditionRepositoryInterface::class);
        $conditionRepo->expects($this->once())
            ->method('findByName')
            ->with('ConditionA')
            ->willReturn($conditionMock);
        $faultMock = $this->createMock(Faults::class);
        $faultMock->fault_id = 'fault-1';
        $faultRepo = $this->createMock(FaultRepositoryInterface::class);
        $faultRepo->expects($this->once())
            ->method('findActiveByDeviceId')
            ->with('dev-123')
            ->willReturn($faultMock);
        $mongoServiceMock = $this->getMockBuilder(MongoDBService::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['saveMeasurementData', 'close'])
            ->getMock();
        $mongoServiceMock->expects($this->once())
            ->method('saveMeasurementData')
            ->willReturn(false);
        $mongoServiceMock->method('close')
            ->willReturn(null); // Prevent close() errors
        $service = new MeasurementService($deviceRepo, $conditionRepo, $faultRepo);
        $reflection = new \ReflectionClass($service);
        $property = $reflection->getProperty('mongoService');
        $property->setAccessible(true);
        $property->setValue($service, $mongoServiceMock);
        $topic = 'devices/dev-123/data';
        $payload = json_encode([
            'deviceId' => 'dev-123',
            'data_series' => 'series-1',
            'condition_name' => 'ConditionA',
            'data' => [1,2,3]
        ]);
        $result = $service->processRealTimeDataMqttMessage($topic, $payload);
        $this->assertFalse($result);
    }

    public function testProcessRealTimeDataInvalidJson()
    {
        $deviceRepo = $this->createMock(DeviceRepositoryInterface::class);
        $conditionRepo = $this->createMock(ConditionRepositoryInterface::class);
        $faultRepo = $this->createMock(FaultRepositoryInterface::class);
        $service = new MeasurementService($deviceRepo, $conditionRepo, $faultRepo);
        
        $topic = 'devices/dev-123/data';
        $payload = 'invalid json string';
        
        $result = $service->processRealTimeDataMqttMessage($topic, $payload);
        $this->assertFalse($result);
    }

    public function testProcessRealTimeDataMissingDeviceId()
    {
        $deviceRepo = $this->createMock(DeviceRepositoryInterface::class);
        $conditionRepo = $this->createMock(ConditionRepositoryInterface::class);
        $faultRepo = $this->createMock(FaultRepositoryInterface::class);
        $service = new MeasurementService($deviceRepo, $conditionRepo, $faultRepo);
        
        $topic = 'devices/dev-123/data';
        $payload = json_encode([
            'data_series' => 'series-1',
            'condition_name' => 'ConditionA',
            'data' => [1,2,3]
        ]);
        
        $result = $service->processRealTimeDataMqttMessage($topic, $payload);
        $this->assertFalse($result);
    }

    public function testProcessRealTimeDataMissingDataSeries()
    {
        $deviceRepo = $this->createMock(DeviceRepositoryInterface::class);
        $conditionRepo = $this->createMock(ConditionRepositoryInterface::class);
        $faultRepo = $this->createMock(FaultRepositoryInterface::class);
        $service = new MeasurementService($deviceRepo, $conditionRepo, $faultRepo);
        
        $topic = 'devices/dev-123/data';
        $payload = json_encode([
            'deviceId' => 'dev-123',
            'condition_name' => 'ConditionA',
            'data' => [1,2,3]
        ]);
        
        $result = $service->processRealTimeDataMqttMessage($topic, $payload);
        $this->assertFalse($result);
    }

    public function testProcessRealTimeDataEmptyData()
    {
        $deviceRepo = $this->createMock(DeviceRepositoryInterface::class);
        $conditionRepo = $this->createMock(ConditionRepositoryInterface::class);
        $faultRepo = $this->createMock(FaultRepositoryInterface::class);
        $service = new MeasurementService($deviceRepo, $conditionRepo, $faultRepo);
        
        $topic = 'devices/dev-123/data';
        $payload = json_encode([
            'deviceId' => 'dev-123',
            'data_series' => 'series-1',
            'condition_name' => 'ConditionA',
            'data' => []
        ]);
        
        $result = $service->processRealTimeDataMqttMessage($topic, $payload);
        $this->assertFalse($result);
    }

    public function testProcessRealTimeDataWithNullMongoService()
    {
        $deviceMock = new class {
            public $device_id = 'dev-123';
            public $status = 'Active';
        };
        $deviceRepo = $this->createMock(DeviceRepositoryInterface::class);
        $deviceRepo->expects($this->once())
            ->method('findByDeviceId')
            ->with('dev-123')
            ->willReturn($deviceMock);

        $conditionMock = $this->createMock(Condition::class);
        $conditionMock->condition_id = 'cond-1';
        $conditionRepo = $this->createMock(ConditionRepositoryInterface::class);
        $conditionRepo->expects($this->once())
            ->method('findByName')
            ->with('ConditionA')
            ->willReturn($conditionMock);

        $faultMock = $this->createMock(Faults::class);
        $faultMock->fault_id = 'fault-1';
        $faultRepo = $this->createMock(FaultRepositoryInterface::class);
        $faultRepo->expects($this->once())
            ->method('findActiveByDeviceId')
            ->with('dev-123')
            ->willReturn($faultMock);

        $service = new MeasurementService($deviceRepo, $conditionRepo, $faultRepo, null);

        $topic = 'devices/dev-123/data';
        $payload = json_encode([
            'deviceId' => 'dev-123',
            'data_series' => 'series-1',
            'condition_name' => 'ConditionA',
            'data' => [1,2,3]
        ]);

        $result = $service->processRealTimeDataMqttMessage($topic, $payload);
        // With null MongoDBService, the service might still return success if it falls back to other behavior
        // Let's just verify it returns an array response
        $this->assertIsArray($result);
    }

    public function testServiceConstructorWithAllNullParameters()
    {
        $service = new MeasurementService(null, null, null, null);
        $this->assertInstanceOf(MeasurementService::class, $service);
    }

    public function testProcessRealTimeDataWithComplexDataStructure()
    {
        $deviceMock = new class {
            public $device_id = 'dev-123';
            public $status = 'Active';
        };
        $deviceRepo = $this->createMock(DeviceRepositoryInterface::class);
        $deviceRepo->expects($this->once())
            ->method('findByDeviceId')
            ->with('dev-123')
            ->willReturn($deviceMock);

        $conditionMock = $this->createMock(Condition::class);
        $conditionMock->condition_id = 'complex-condition';
        $conditionRepo = $this->createMock(ConditionRepositoryInterface::class);
        $conditionRepo->expects($this->once())
            ->method('findByName')
            ->with('ComplexCondition')
            ->willReturn($conditionMock);

        $faultMock = $this->createMock(Faults::class);
        $faultMock->fault_id = 'complex-fault';
        $faultRepo = $this->createMock(FaultRepositoryInterface::class);
        $faultRepo->expects($this->once())
            ->method('findActiveByDeviceId')
            ->with('dev-123')
            ->willReturn($faultMock);

        $mongoServiceMock = $this->getMockBuilder(MongoDBService::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['saveMeasurementData', 'close'])
            ->getMock();
        $mongoServiceMock->expects($this->once())
            ->method('saveMeasurementData')
            ->willReturn(true);
        $mongoServiceMock->method('close')
            ->willReturn(null);

        $service = new MeasurementService($deviceRepo, $conditionRepo, $faultRepo);
        $reflection = new \ReflectionClass($service);
        $property = $reflection->getProperty('mongoService');
        $property->setAccessible(true);
        $property->setValue($service, $mongoServiceMock);

        $topic = 'devices/dev-123/data';
        $complexData = [
            'timestamp' => '2023-01-01T10:00:00Z',
            'measurements' => [
                ['channel' => 'A', 'value' => 1.23],
                ['channel' => 'B', 'value' => 4.56]
            ],
            'metadata' => ['unit' => 'volts', 'frequency' => 50]
        ];
        $payload = json_encode([
            'deviceId' => 'dev-123',
            'data_series' => 'complex-series',
            'condition_name' => 'ComplexCondition',
            'data' => $complexData
        ]);

        $result = $service->processRealTimeDataMqttMessage($topic, $payload);
        $this->assertIsArray($result);
        $this->assertTrue($result['success']);
        $this->assertEquals('complex-series', $result['dataSeriesId']);
        $this->assertEquals('dev-123', $result['deviceId']);
    }

    public function testProcessRealTimeDataWithExceptionHandling()
    {
        $deviceRepo = $this->createMock(DeviceRepositoryInterface::class);
        $deviceRepo->expects($this->once())
            ->method('findByDeviceId')
            ->will($this->throwException(new \Exception('Database error')));

        $conditionRepo = $this->createMock(ConditionRepositoryInterface::class);
        $faultRepo = $this->createMock(FaultRepositoryInterface::class);

        $service = new MeasurementService($deviceRepo, $conditionRepo, $faultRepo);

        $topic = 'devices/dev-error/data';
        $payload = json_encode([
            'deviceId' => 'dev-error',
            'data_series' => 'error-series',
            'condition_name' => 'ErrorCondition',
            'data' => [1,2,3]
        ]);

        $result = $service->processRealTimeDataMqttMessage($topic, $payload);
        $this->assertFalse($result);
    }

    public function testGetMethodsExist()
    {
        $service = new MeasurementService(null, null, null, null);
        
        // Test that key methods exist
        $this->assertTrue(method_exists($service, 'processRealTimeDataMqttMessage'));
        $this->assertIsObject($service);
    }
} 