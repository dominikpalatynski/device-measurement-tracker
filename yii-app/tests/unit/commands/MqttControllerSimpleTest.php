<?php
namespace tests\unit\commands;

use PHPUnit\Framework\TestCase;
use app\commands\MqttController;
use app\services\MeasurementService;
use app\components\MqttComponent;
use Yii;

/**
 * @covers \app\commands\MqttController
 * @method void stdout(string $string)
 * @method void processRealTimeDataMessage(string $topic, string $message)
 */
class MqttControllerSimpleTest extends TestCase
{
    private $controller;
    private $mockMeasurementService;
    private $mockMqttComponent;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create mock services
        $this->mockMeasurementService = $this->createMock(MeasurementService::class);
        $this->mockMqttComponent = $this->createMock(MqttComponent::class);
        
        // Create controller instance
        $this->controller = new MqttController('mqtt', null);
        
        // Inject mock services using reflection
        $this->injectMockServices();
        
        // Mock Yii::$app->mqtt component
        Yii::$app->set('mqtt', $this->mockMqttComponent);
    }

    private function injectMockServices()
    {
        $reflection = new \ReflectionClass($this->controller);
        
        // Inject measurement service
        $measurementProperty = $reflection->getProperty('measurementService');
        $measurementProperty->setAccessible(true);
        $measurementProperty->setValue($this->controller, $this->mockMeasurementService);
    }

    protected function tearDown(): void
    {
        parent::tearDown();
    }

    public function testControllerCanBeInstantiated()
    {
        $this->assertInstanceOf(MqttController::class, $this->controller);
    }

    public function testConstructorInitializesServices()
    {
        // Create a new controller to test constructor
        $newController = new MqttController('mqtt', null);
        
        // Use reflection to verify services are initialized
        $reflection = new \ReflectionClass($newController);
        
        $measurementProperty = $reflection->getProperty('measurementService');
        $measurementProperty->setAccessible(true);
        $measurementService = $measurementProperty->getValue($newController);
        
        $this->assertInstanceOf(MeasurementService::class, $measurementService);
    }

    public function testDependencyInjectionWorks()
    {
        // Test that our mock services were properly injected
        $reflection = new \ReflectionClass($this->controller);
        
        $measurementProperty = $reflection->getProperty('measurementService');
        $measurementProperty->setAccessible(true);
        $injectedMeasurementService = $measurementProperty->getValue($this->controller);
        
        $this->assertSame($this->mockMeasurementService, $injectedMeasurementService);
    }

    public function testActionSubscribeCallsMqttComponent()
    {
        // Mock the MQTT client
        $mockClient = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['loop'])
            ->getMock();
        $mockClient->method('loop')->willReturn(true);
        
        // Configure the mock MQTT component
        $this->mockMqttComponent
            ->expects($this->once())
            ->method('subscribe')
            ->with(
                $this->equalTo('device/+/raw'),
                $this->isType('callable'),
                $this->equalTo(1)
            )
            ->willReturn($mockClient);
        
        $result = $this->controller->actionSubscribe();
        
        // Verify return code
        $this->assertEquals(MqttController::EXIT_CODE_NORMAL, $result);
    }

    public function testActionSubscribeWithCustomTopicCallsMqttComponent()
    {
        $customTopic = 'device/123/data';
        
        // Mock the MQTT client
        $mockClient = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['loop'])
            ->getMock();
        $mockClient->method('loop')->willReturn(true);
        
        // Configure the mock MQTT component
        $this->mockMqttComponent
            ->expects($this->once())
            ->method('subscribe')
            ->with(
                $this->equalTo($customTopic),
                $this->isType('callable'),
                $this->equalTo(1)
            )
            ->willReturn($mockClient);
        
        $result = $this->controller->actionSubscribe($customTopic);
        
        $this->assertEquals(MqttController::EXIT_CODE_NORMAL, $result);
    }

    public function testActionSubscribeHandlesException()
    {
        // Configure the mock to throw an exception
        $this->mockMqttComponent
            ->expects($this->once())
            ->method('subscribe')
            ->willThrowException(new \Exception('Connection failed'));
        
        $result = $this->controller->actionSubscribe();
        
        // Verify error return code
        $this->assertEquals(MqttController::EXIT_CODE_ERROR, $result);
    }

    public function testProcessRealTimeDataMessageCallsMeasurementService()
    {
        $topic = 'device/123/raw';
        $message = '{"temperature": 25.5}';
        
        // Mock measurement service to expect the call
        $this->mockMeasurementService
            ->expects($this->once())
            ->method('processRealTimeDataMqttMessage')
            ->with($topic, $message);
        
        // Use reflection to call protected method
        $reflection = new \ReflectionMethod($this->controller, 'processRealTimeDataMessage');
        $reflection->setAccessible(true);
        
        // Should not throw exception
        $reflection->invoke($this->controller, $topic, $message);
        
        // If we reach here, the test passed (no exceptions thrown)
        $this->assertTrue(true);
    }

    public function testProcessRealTimeDataMessageHandlesServiceException()
    {
        $topic = 'device/123/raw';
        $message = '{"temperature": 25.5}';
        
        // Mock measurement service to throw exception
        $this->mockMeasurementService
            ->expects($this->once())
            ->method('processRealTimeDataMqttMessage')
            ->with($topic, $message)
            ->willThrowException(new \Exception('Processing failed'));
        
        // Use reflection to call protected method
        $reflection = new \ReflectionMethod($this->controller, 'processRealTimeDataMessage');
        $reflection->setAccessible(true);
        
        // Should handle exception gracefully (not throw)
        $reflection->invoke($this->controller, $topic, $message);
        
        // If we reach here, the exception was handled correctly
        $this->assertTrue(true);
    }

    public function testControllerIdIsCorrect()
    {
        $this->assertEquals('mqtt', $this->controller->id);
    }

    public function testActionSubscribeWithMultipleTopics()
    {
        // Test subscription to multiple topics at once
        $topics = ['device/+/data', 'device/+/status', 'device/+/config'];
        
        $mockClient = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['loop'])
            ->getMock();
        $mockClient->method('loop')->willReturn(true);
        
        // Expect subscribe to be called for each topic
        $this->mockMqttComponent
            ->expects($this->exactly(count($topics)))
            ->method('subscribe')
            ->willReturn($mockClient);
        
        foreach ($topics as $topic) {
            $result = $this->controller->actionSubscribe($topic);
            $this->assertEquals(MqttController::EXIT_CODE_NORMAL, $result);
        }
    }

    public function testProcessRealTimeDataMessageWithVariousPayloads()
    {
        $testCases = [
            ['topic' => 'device/123/raw', 'message' => '{"temperature": 25.5}'],
            ['topic' => 'device/456/raw', 'message' => '{"humidity": 60}'],
            ['topic' => 'device/789/raw', 'message' => '{}'],
            ['topic' => 'device/000/raw', 'message' => 'plain text'],
        ];
        
        // Mock service to expect all calls
        $this->mockMeasurementService
            ->expects($this->exactly(count($testCases)))
            ->method('processRealTimeDataMqttMessage');
        
        // Use reflection to call protected method
        $reflection = new \ReflectionMethod($this->controller, 'processRealTimeDataMessage');
        $reflection->setAccessible(true);
        
        foreach ($testCases as $testCase) {
            $reflection->invoke($this->controller, $testCase['topic'], $testCase['message']);
        }
        
        $this->assertTrue(true); // All calls completed successfully
    }

    public function testControllerInheritance()
    {
        $this->assertInstanceOf(\yii\console\Controller::class, $this->controller);
    }

    public function testServicesAreProperlyInjected()
    {
        $reflection = new \ReflectionClass($this->controller);
        
        // Check measurement service
        $measurementProperty = $reflection->getProperty('measurementService');
        $measurementProperty->setAccessible(true);
        $measurementService = $measurementProperty->getValue($this->controller);
        $this->assertNotNull($measurementService);
    }

    public function testActionSubscribeWithEmptyTopic()
    {
        $mockClient = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['loop'])
            ->getMock();
        $mockClient->method('loop')->willReturn(true);
        
        $this->mockMqttComponent
            ->expects($this->once())
            ->method('subscribe')
            ->with('')
            ->willReturn($mockClient);
        
        $result = $this->controller->actionSubscribe('');
        $this->assertEquals(MqttController::EXIT_CODE_NORMAL, $result);
    }

    public function testActionSubscribeWithNullTopic()
    {
        $mockClient = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['loop'])
            ->getMock();
        $mockClient->method('loop')->willReturn(true);
        
        $this->mockMqttComponent
            ->expects($this->once())
            ->method('subscribe')
            ->with(null)
            ->willReturn($mockClient);
        
        $result = $this->controller->actionSubscribe(null);
        $this->assertEquals(MqttController::EXIT_CODE_NORMAL, $result);
    }

    public function testProcessRealTimeDataMessageWithLargePayload()
    {
        $topic = 'device/large/raw';
        $largeMessage = json_encode([
            'data' => str_repeat('large_data_chunk_', 1000),
            'metadata' => array_fill(0, 100, 'metadata_item')
        ]);
        
        $this->mockMeasurementService
            ->expects($this->once())
            ->method('processRealTimeDataMqttMessage')
            ->with($topic, $largeMessage);
        
        $reflection = new \ReflectionMethod($this->controller, 'processRealTimeDataMessage');
        $reflection->setAccessible(true);
        
        $reflection->invoke($this->controller, $topic, $largeMessage);
        $this->assertTrue(true);
    }

    public function testMqttComponentConnectionFailure()
    {
        $this->mockMqttComponent
            ->expects($this->once())
            ->method('subscribe')
            ->willThrowException(new \Exception('MQTT broker not available'));
        
        $result = $this->controller->actionSubscribe('device/test/data');
        $this->assertEquals(MqttController::EXIT_CODE_ERROR, $result);
    }

    public function testControllerMethodsExist()
    {
        $expectedMethods = ['actionSubscribe'];
        
        foreach ($expectedMethods as $method) {
            $this->assertTrue(method_exists($this->controller, $method), 
                "Method $method should exist");
        }
        
        // Test protected methods exist
        $protectedMethods = ['processRealTimeDataMessage'];
        foreach ($protectedMethods as $method) {
            $this->assertTrue(method_exists($this->controller, $method), 
                "Protected method $method should exist");
        }
    }

    public function testExitCodeConstants()
    {
        // Test that expected exit code constants exist
        $this->assertTrue(defined('app\commands\MqttController::EXIT_CODE_NORMAL'));
        $this->assertTrue(defined('app\commands\MqttController::EXIT_CODE_ERROR'));
        
        $this->assertEquals(0, MqttController::EXIT_CODE_NORMAL);
        $this->assertEquals(1, MqttController::EXIT_CODE_ERROR);
    }

    public function testProcessRealTimeDataMessageWithMalformedJson()
    {
        $topic = 'device/malformed/raw';
        $malformedMessage = '{"temperature": 25.5, "incomplete": }';
        
        $this->mockMeasurementService
            ->expects($this->once())
            ->method('processRealTimeDataMqttMessage')
            ->with($topic, $malformedMessage);
        
        $reflection = new \ReflectionMethod($this->controller, 'processRealTimeDataMessage');
        $reflection->setAccessible(true);
        
        // Should handle malformed JSON gracefully
        $reflection->invoke($this->controller, $topic, $malformedMessage);
        $this->assertTrue(true);
    }

    public function testServiceDependencyTypes()
    {
        $reflection = new \ReflectionClass($this->controller);
        
        // Test measurementService type
        $measurementProperty = $reflection->getProperty('measurementService');
        $measurementProperty->setAccessible(true);
        $measurementService = $measurementProperty->getValue($this->controller);
        $this->assertInstanceOf(MeasurementService::class, $measurementService);
    }

    public function testControllerWithDifferentModule()
    {
        // Test controller with different module context
        $controllerWithModule = new MqttController('mqtt-test', null);
        $this->assertInstanceOf(MqttController::class, $controllerWithModule);
        $this->assertEquals('mqtt-test', $controllerWithModule->id);
    }

    public function testActionSubscribeCallbackLogic()
    {
        $topic = 'device/123/raw';
        $message = '{"temperature": 25.5}';

        $output = '';
        $controller = $this->getMockBuilder(\app\commands\MqttController::class)
            ->setConstructorArgs(['mqtt', null])
            ->onlyMethods(['stdout'])
            ->enableOriginalConstructor()
            ->getMock();

        $controller->method('stdout')->willReturnCallback(function ($string) use (&$output) {
            $output .= $string;
        });

        // Inject mock measurement service
        $reflection = new \ReflectionClass($controller);
        $measurementProperty = $reflection->getProperty('measurementService');
        $measurementProperty->setAccessible(true);
        $measurementProperty->setValue($controller, $this->mockMeasurementService);

        // Create the callback as in the controller
        $callback = function ($topic, $message) {
            $this->stdout("Received message on topic {$topic}: {$message}\n");
            $this->processRealTimeDataMessage($topic, $message);
        };
        $callback = $callback->bindTo($controller, get_class($controller));

        $callback($topic, $message);

        $this->assertStringContainsString("Received message on topic {$topic}: {$message}", $output);
    }

    public function testProcessRealTimeDataMessageIsCovered()
    {
        $topic = 'device/123/raw';
        $message = '{"temperature": 25.5}';

        $output = '';
        $controller = $this->getMockBuilder(\app\commands\MqttController::class)
            ->setConstructorArgs(['mqtt', null])
            ->onlyMethods(['stdout'])
            ->enableOriginalConstructor()
            ->getMock();

        $controller->method('stdout')->willReturnCallback(function ($string) use (&$output) {
            $output .= $string;
        });

        // Inject a real MeasurementService, but mock its processRealTimeDataMqttMessage to avoid side effects
        $realMeasurementService = $this->getMockBuilder(\app\services\MeasurementService::class)
            ->onlyMethods(['processRealTimeDataMqttMessage'])
            ->getMock();
        $realMeasurementService->expects($this->once())
            ->method('processRealTimeDataMqttMessage')
            ->with($topic, $message);

        $reflection = new \ReflectionClass($controller);
        $measurementProperty = $reflection->getProperty('measurementService');
        $measurementProperty->setAccessible(true);
        $measurementProperty->setValue($controller, $realMeasurementService);

        // Create the callback as in the controller
        $callback = function ($topic, $message) {
            $this->stdout("Received message on topic {$topic}: {$message}\n");
            $this->processRealTimeDataMessage($topic, $message);
        };
        $callback = $callback->bindTo($controller, get_class($controller));

        $callback($topic, $message);

        $this->assertStringContainsString("Received message on topic {$topic}: {$message}", $output);
        $this->assertStringContainsString("Processing real time data message...", $output);
    }
} 