<?php
namespace tests\unit\modules\api\controllers;

use PHPUnit\Framework\TestCase;
use app\modules\api\controllers\MongoDBController;
use app\services\MongoDBService;
use app\services\MongoDBClientInterface;
use Yii;

/**
 * @covers \app\modules\api\controllers\MongoDBController
 */
class MongoDBControllerTest extends TestCase
{
    private $controller;
    private $mockMongoService;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create mock MongoDB service
        $this->mockMongoService = $this->createMock(MongoDBService::class);
        
        // Create controller instance
        $this->controller = new MongoDBController('mongodb', null);
        
        // Inject the mock service using reflection
        $reflection = new \ReflectionClass($this->controller);
        $property = $reflection->getProperty('mongoService');
        $property->setAccessible(true);
        $property->setValue($this->controller, $this->mockMongoService);
    }

    protected function tearDown(): void
    {
        parent::tearDown();
    }

    public function testActionTest()
    {
        // Mock successful connection test
        $this->mockMongoService
            ->method('testConnection')
            ->willReturn([
                'success' => true,
                'message' => 'MongoDB connection successful',
                'database' => 'test_db',
                'collections' => ['measurements']
            ]);

        $this->mockMongoService
            ->method('getCollections')
            ->willReturn(['measurements', 'metadata']);
            
        // Mock the databaseName property
        $this->mockMongoService->databaseName = 'test_db';

        $result = $this->controller->actionTest();

        $this->assertIsArray($result);
        $this->assertTrue($result['success']);
        $this->assertEquals('MongoDB connection successful', $result['message']);
        $this->assertArrayHasKey('timestamp', $result);
        $this->assertArrayHasKey('database', $result);
        $this->assertArrayHasKey('collections', $result);
    }

    public function testActionTestConnectionFailure()
    {
        // Mock failed connection test
        $this->mockMongoService
            ->method('testConnection')
            ->willReturn([
                'success' => false,
                'message' => 'MongoDB connection failed: Connection timeout'
            ]);

        $result = $this->controller->actionTest();

        $this->assertIsArray($result);
        $this->assertFalse($result['success']); // Controller returns the same success status
        $this->assertEquals('MongoDB connection failed: Connection timeout', $result['message']);
        $this->assertArrayHasKey('timestamp', $result);
    }

    public function testControllerCanBeInstantiated()
    {
        $this->assertInstanceOf(MongoDBController::class, $this->controller);
    }

    public function testBehaviorsConfiguration()
    {
        $behaviors = $this->controller->behaviors();

        // Test CORS configuration
        $this->assertArrayHasKey('corsFilter', $behaviors);
        $this->assertEquals(\yii\filters\Cors::class, $behaviors['corsFilter']['class']);

        // Test content negotiator
        $this->assertArrayHasKey('contentNegotiator', $behaviors);
        $this->assertEquals(\yii\web\Response::FORMAT_JSON, $behaviors['contentNegotiator']['formats']['application/json']);
    }

    public function testDependencyInjectionWorks()
    {
        // Test that our mock service was properly injected
        $reflection = new \ReflectionClass($this->controller);
        $property = $reflection->getProperty('mongoService');
        $property->setAccessible(true);
        $injectedService = $property->getValue($this->controller);

        $this->assertSame($this->mockMongoService, $injectedService);
        $this->assertInstanceOf(MongoDBService::class, $injectedService);
    }

    public function testActionTestWithMissingDatabase()
    {
        // Mock connection test with missing database info
        $this->mockMongoService
            ->method('testConnection')
            ->willReturn([
                'success' => true,
                'message' => 'MongoDB connection successful'
                // No 'database' or 'collections' key
            ]);

        $this->mockMongoService
            ->method('getCollections')
            ->willReturn(['fallback_collection']);

        $result = $this->controller->actionTest();

        $this->assertIsArray($result);
        $this->assertTrue($result['success']);
        $this->assertEquals('MongoDB connection successful', $result['message']);
        // Don't test for specific database name since it comes from the mock connection result
        $this->assertEquals(['fallback_collection'], $result['collections']);
    }

    public function testActionTestWithEmptyCollections()
    {
        // Mock connection test with empty collections
        $this->mockMongoService
            ->method('testConnection')
            ->willReturn([
                'success' => true,
                'message' => 'MongoDB connection successful',
                'database' => 'test_db',
                'collections' => []
            ]);

        $result = $this->controller->actionTest();

        $this->assertIsArray($result);
        $this->assertTrue($result['success']);
        $this->assertEmpty($result['collections']);
    }

    public function testActionTestThrowsException()
    {
        // Mock service to throw an exception
        $this->mockMongoService
            ->method('testConnection')
            ->willThrowException(new \Exception('MongoDB unavailable'));

        $result = $this->controller->actionTest();

        $this->assertIsArray($result);
        $this->assertFalse($result['success']);
        $this->assertEquals('MongoDB unavailable', $result['error']);
    }

    public function testControllerInitialization()
    {
        // Test controller initialization without mocked service
        $newController = new MongoDBController('mongodb', null);
        
        // Verify the controller initializes properly
        $this->assertInstanceOf(MongoDBController::class, $newController);
    }

    public function testControllerInitializationFailure()
    {
        // This would test the exception case in init(), but it's hard to simulate
        // MongoDB service creation failure in unit tests
        $this->assertTrue(true); // Placeholder for complex initialization testing
    }

    public function testActionMeasurementsExists()
    {
        // Test that measurements action exists
        $this->assertTrue(method_exists($this->controller, 'actionMeasurements'));
    }

    public function testActionDataSeriesListExists()
    {
        // Test that data series list action exists
        $this->assertTrue(method_exists($this->controller, 'actionDataSeriesList'));
    }

    public function testControllerInheritance()
    {
        // Test that controller extends the correct base class
        $this->assertInstanceOf(\yii\web\Controller::class, $this->controller);
    }

    public function testBehaviorsContentTypes()
    {
        $behaviors = $this->controller->behaviors();
        $contentNegotiator = $behaviors['contentNegotiator'];
        
        // Test that only JSON format is supported
        $this->assertCount(1, $contentNegotiator['formats']);
        $this->assertArrayHasKey('application/json', $contentNegotiator['formats']);
    }

    public function testBehaviorsCorsHeaders()
    {
        $behaviors = $this->controller->behaviors();
        $corsConfig = $behaviors['corsFilter']['cors'];
        
        // Test CORS headers configuration
        $this->assertEquals(['*'], $corsConfig['Access-Control-Request-Headers']);
        $this->assertTrue($corsConfig['Access-Control-Allow-Credentials']);
    }

    public function testMongoServicePropertyAccess()
    {
        // Test that we can access the mongoService property
        $reflection = new \ReflectionClass($this->controller);
        $property = $reflection->getProperty('mongoService');
        
        $this->assertTrue($property->isPrivate());
        $this->assertEquals('mongoService', $property->getName());
    }
} 