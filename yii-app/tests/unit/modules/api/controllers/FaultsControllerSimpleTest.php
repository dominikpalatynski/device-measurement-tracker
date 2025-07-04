<?php
namespace tests\unit\modules\api\controllers;

use PHPUnit\Framework\TestCase;
use app\modules\api\controllers\FaultsController;
use Yii;

/**
 * @covers \app\modules\api\controllers\FaultsController
 */
class FaultsControllerSimpleTest extends TestCase
{
    private $controller;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create controller instance with proper module context
        $module = Yii::$app->getModule('api');
        $this->controller = new FaultsController('faults', $module);
    }

    protected function tearDown(): void
    {
        parent::tearDown();
        
        // Clear any authentication state
        if (Yii::$app->has('user')) {
            Yii::$app->user->logout();
        }
    }

    public function testActionTest()
    {
        $result = $this->controller->actionTest();
        
        $this->assertIsArray($result);
        $this->assertTrue($result['success']);
        $this->assertEquals('FaultsController is working', $result['message']);
        $this->assertArrayHasKey('timestamp', $result);
    }

    public function testBehaviorsConfiguration()
    {
        $behaviors = $this->controller->behaviors();

        // Test that JWT auth is configured
        $this->assertArrayHasKey('jwtAuth', $behaviors);
        $this->assertEquals(\app\filters\JwtAuthFilter::class, $behaviors['jwtAuth']['class']);
        
        // Test that test endpoint is excluded from auth
        $this->assertContains('test', $behaviors['jwtAuth']['except']);

        // Test CORS configuration
        $this->assertArrayHasKey('corsFilter', $behaviors);
        $this->assertEquals(\yii\filters\Cors::class, $behaviors['corsFilter']['class']);
        
        // Test content negotiator
        $this->assertArrayHasKey('contentNegotiator', $behaviors);
        $this->assertEquals(\yii\web\Response::FORMAT_JSON, $behaviors['contentNegotiator']['formats']['application/json']);

        // Test HTTP verbs configuration
        $this->assertArrayHasKey('verbs', $behaviors);
        $this->assertEquals(\yii\filters\VerbFilter::class, $behaviors['verbs']['class']);
        $this->assertArrayHasKey('actions', $behaviors['verbs']);
        $this->assertEquals(['POST'], $behaviors['verbs']['actions']['create']);
        $this->assertEquals(['GET'], $behaviors['verbs']['actions']['list']);
        $this->assertEquals(['GET'], $behaviors['verbs']['actions']['view']);
    }

    public function testControllerCanBeInstantiated()
    {
        $this->assertInstanceOf(FaultsController::class, $this->controller);
    }

    public function testControllerHasCorrectId()
    {
        $this->assertEquals('faults', $this->controller->id);
    }

    public function testControllerHasModule()
    {
        $this->assertNotNull($this->controller->module);
        $this->assertEquals('api', $this->controller->module->id);
    }

    public function testHttpVerbsConfiguration()
    {
        $behaviors = $this->controller->behaviors();
        $verbsConfig = $behaviors['verbs']['actions'];
        
        // Test that create only allows POST
        $this->assertEquals(['POST'], $verbsConfig['create']);
        
        // Test that update allows PUT and PATCH
        $this->assertContains('PUT', $verbsConfig['update']);
        $this->assertContains('PATCH', $verbsConfig['update']);
        
        // Test that delete only allows DELETE
        $this->assertEquals(['DELETE'], $verbsConfig['delete']);
    }

    public function testControllerInheritance()
    {
        // Test that controller extends the correct base class
        $this->assertInstanceOf(\yii\rest\Controller::class, $this->controller);
    }

    public function testActionListExists()
    {
        // Test that list action exists
        $this->assertTrue(method_exists($this->controller, 'actionList'));
    }

    public function testActionViewExists()
    {
        // Test that view action exists
        $this->assertTrue(method_exists($this->controller, 'actionView'));
    }

    public function testActionCreateExists()
    {
        // Test that create action exists
        $this->assertTrue(method_exists($this->controller, 'actionCreate'));
    }

    public function testActionUpdateExists()
    {
        // Test that update action exists
        $this->assertTrue(method_exists($this->controller, 'actionUpdate'));
    }

    public function testActionDeleteExists()
    {
        // Test that delete action exists
        $this->assertTrue(method_exists($this->controller, 'actionDelete'));
    }

    public function testPrivateMethodsExist()
    {
        // Test that ownership checking methods exist
        $this->assertTrue(method_exists($this->controller, 'checkFaultOwnership'));
        $this->assertTrue(method_exists($this->controller, 'checkDeviceOwnership'));
    }

    public function testPrivateMethodsArePrivate()
    {
        $reflection = new \ReflectionClass($this->controller);
        
        $checkFaultMethod = $reflection->getMethod('checkFaultOwnership');
        $this->assertTrue($checkFaultMethod->isPrivate());
        
        $checkDeviceMethod = $reflection->getMethod('checkDeviceOwnership');
        $this->assertTrue($checkDeviceMethod->isPrivate());
    }

    public function testBehaviorsArrayStructure()
    {
        $behaviors = $this->controller->behaviors();
        
        // Test that all expected behavior keys exist
        $expectedKeys = ['contentNegotiator', 'jwtAuth', 'verbs', 'corsFilter'];
        foreach ($expectedKeys as $key) {
            $this->assertArrayHasKey($key, $behaviors);
        }
    }

    public function testCorsOriginsContainRequiredHosts()
    {
        $behaviors = $this->controller->behaviors();
        $corsOrigins = $behaviors['corsFilter']['cors']['Origin'];
        
        // Test required localhost origins
        $this->assertContains('http://localhost:3000', $corsOrigins);
        $this->assertContains('http://localhost:3001', $corsOrigins);
        
        // Test required IP-based origins
        $this->assertContains('http://172.22.176.1:3000', $corsOrigins);
        $this->assertContains('http://172.22.176.1:3001', $corsOrigins);
    }

    public function testJwtAuthExcludesTestEndpoint()
    {
        $behaviors = $this->controller->behaviors();
        $jwtExceptions = $behaviors['jwtAuth']['except'];
        
        $this->assertContains('test', $jwtExceptions);
        $this->assertIsArray($jwtExceptions);
    }

    public function testControllerIdProperty()
    {
        $this->assertIsString($this->controller->id);
        $this->assertNotEmpty($this->controller->id);
    }

    public function testControllerModuleProperty()
    {
        $this->assertInstanceOf(\app\modules\api\Module::class, $this->controller->module);
    }
} 