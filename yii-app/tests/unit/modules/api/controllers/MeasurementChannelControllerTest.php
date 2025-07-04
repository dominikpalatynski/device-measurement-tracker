<?php
namespace tests\unit\modules\api\controllers;

use PHPUnit\Framework\TestCase;
use app\modules\api\controllers\MeasurementChannelController;
use Yii;

/**
 * @covers \app\modules\api\controllers\MeasurementChannelController
 */
class MeasurementChannelControllerTest extends TestCase
{
    private $controller;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create controller instance
        $this->controller = new MeasurementChannelController('measurement-channel', null);
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
        $this->assertEquals('MeasurementChannelController is working', $result['message']);
        $this->assertArrayHasKey('timestamp', $result);
        $this->assertArrayHasKey('controller', $result);
        $this->assertEquals(MeasurementChannelController::class, $result['controller']);
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
        $this->assertInstanceOf(MeasurementChannelController::class, $this->controller);
    }

    public function testControllerHasCorrectId()
    {
        $this->assertEquals('measurement-channel', $this->controller->id);
    }

    public function testCorsOriginConfiguration()
    {
        $behaviors = $this->controller->behaviors();
        $corsConfig = $behaviors['corsFilter']['cors'];
        
        // Test that localhost origins are allowed
        $this->assertContains('http://localhost:3000', $corsConfig['Origin']);
        $this->assertContains('http://localhost:3001', $corsConfig['Origin']);
        
        // Test that credentials are allowed
        $this->assertTrue($corsConfig['Access-Control-Allow-Credentials']);
        
        // Test max age is set
        $this->assertEquals(3600, $corsConfig['Access-Control-Max-Age']);
    }

    public function testHttpMethodsConfiguration()
    {
        $behaviors = $this->controller->behaviors();
        $corsConfig = $behaviors['corsFilter']['cors'];
        
        // Test that required HTTP methods are allowed
        $allowedMethods = $corsConfig['Access-Control-Request-Method'];
        $this->assertContains('GET', $allowedMethods);
        $this->assertContains('POST', $allowedMethods);
        $this->assertContains('PUT', $allowedMethods);
        $this->assertContains('DELETE', $allowedMethods);
        $this->assertContains('OPTIONS', $allowedMethods);
    }

    public function testControllerInheritance()
    {
        $this->assertInstanceOf(\yii\rest\Controller::class, $this->controller);
    }

    public function testVerbsConfiguration()
    {
        $behaviors = $this->controller->behaviors();
        $verbs = $behaviors['verbs']['actions'];
        
        // Test that each action has appropriate HTTP methods
        $this->assertEquals(['GET'], $verbs['view']);
        $this->assertEquals(['POST'], $verbs['create']);
        $this->assertEquals(['GET'], $verbs['list']);
        $this->assertEquals(['PUT', 'PATCH'], $verbs['update']);
        $this->assertEquals(['DELETE'], $verbs['delete']);
    }

    public function testJwtAuthenticationExceptions()
    {
        $behaviors = $this->controller->behaviors();
        $jwtExceptions = $behaviors['jwtAuth']['except'];
        
        $this->assertContains('test', $jwtExceptions);
        $this->assertIsArray($jwtExceptions);
    }

    public function testActionListExists()
    {
        $this->assertTrue(method_exists($this->controller, 'actionList'));
    }

    public function testActionViewExists()
    {
        $this->assertTrue(method_exists($this->controller, 'actionView'));
    }

    public function testActionCreateExists()
    {
        $this->assertTrue(method_exists($this->controller, 'actionCreate'));
    }

    public function testActionUpdateExists()
    {
        $this->assertTrue(method_exists($this->controller, 'actionUpdate'));
    }

    public function testActionDeleteExists()
    {
        $this->assertTrue(method_exists($this->controller, 'actionDelete'));
    }

    public function testActionFindChannelExists()
    {
        $this->assertTrue(method_exists($this->controller, 'findChannel'));
    }

    public function testBehaviorsKeysExist()
    {
        $behaviors = $this->controller->behaviors();
        
        $expectedBehaviors = ['contentNegotiator', 'jwtAuth', 'verbs', 'corsFilter'];
        foreach ($expectedBehaviors as $behavior) {
            $this->assertArrayHasKey($behavior, $behaviors);
        }
    }

    public function testContentNegotiatorFormats()
    {
        $behaviors = $this->controller->behaviors();
        $contentNegotiator = $behaviors['contentNegotiator'];
        
        $this->assertArrayHasKey('formats', $contentNegotiator);
        $this->assertArrayHasKey('application/json', $contentNegotiator['formats']);
        $this->assertEquals(\yii\web\Response::FORMAT_JSON, $contentNegotiator['formats']['application/json']);
    }

    public function testCorsCredentialsEnabled()
    {
        $behaviors = $this->controller->behaviors();
        $corsConfig = $behaviors['corsFilter']['cors'];
        
        $this->assertTrue($corsConfig['Access-Control-Allow-Credentials']);
    }

    public function testCorsMaxAge()
    {
        $behaviors = $this->controller->behaviors();
        $corsConfig = $behaviors['corsFilter']['cors'];
        
        $this->assertEquals(3600, $corsConfig['Access-Control-Max-Age']);
    }

    public function testCorsRequestHeaders()
    {
        $behaviors = $this->controller->behaviors();
        $corsConfig = $behaviors['corsFilter']['cors'];
        
        $this->assertEquals(['*'], $corsConfig['Access-Control-Request-Headers']);
    }

    public function testControllerModuleIsNull()
    {
        // Test that module is null when passed to constructor
        $this->assertNull($this->controller->module);
    }

    public function testControllerWithModule()
    {
        // Test controller with API module
        $module = Yii::$app->getModule('api');
        $controllerWithModule = new MeasurementChannelController('measurement-channel', $module);
        
        $this->assertNotNull($controllerWithModule->module);
        $this->assertEquals('api', $controllerWithModule->module->id);
    }

    public function testCorsOriginsIncludeSpecificHosts()
    {
        $behaviors = $this->controller->behaviors();
        $corsOrigins = $behaviors['corsFilter']['cors']['Origin'];
        
        // Test specific required origins
        $requiredOrigins = [
            'http://localhost:3000',
            'http://localhost:3001',
            'http://172.22.176.1:3000',
            'http://172.22.176.1:3001'
        ];
        
        foreach ($requiredOrigins as $origin) {
            $this->assertContains($origin, $corsOrigins, "CORS should allow origin: $origin");
        }
    }

    public function testHttpMethodsAreComplete()
    {
        $behaviors = $this->controller->behaviors();
        $corsConfig = $behaviors['corsFilter']['cors'];
        
        $expectedMethods = ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'HEAD'];
        $actualMethods = $corsConfig['Access-Control-Request-Method'];
        
        foreach ($expectedMethods as $method) {
            $this->assertContains($method, $actualMethods, "CORS should allow $method method");
        }
    }

    public function testActionMethodsExist()
    {
        $methods = ['actionList', 'actionView', 'actionCreate', 'actionUpdate', 'actionDelete', 'actionTest'];
        
        foreach ($methods as $method) {
            $this->assertTrue(method_exists($this->controller, $method), "Method $method should exist");
        }
    }
} 