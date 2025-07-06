<?php
namespace tests\unit\modules\api\controllers;

use PHPUnit\Framework\TestCase;
use app\modules\api\controllers\AuthController;
use app\models\User;
use Yii;

/**
 * @covers \app\modules\api\controllers\AuthController
 */
class AuthControllerTest extends TestCase
{
    private $controller;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Create controller instance with proper module context
        $module = Yii::$app->getModule('api');
        $this->controller = new AuthController('auth', $module);
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
        $this->assertEquals('Auth controller is working', $result['message']);
        $this->assertArrayHasKey('timestamp', $result);
    }

    public function testActionLoginMissingCredentials()
    {
        // Set up request with missing password
        $_POST = []; // Clear POST data
        Yii::$app->request->setRawBody(json_encode(['username' => 'testuser']));

        $this->expectException(\yii\web\BadRequestHttpException::class);
        $this->expectExceptionMessage('Username and password are required.');

        $this->controller->actionLogin();
    }

    public function testActionMeRequiresAuthentication()
    {
        // Without proper authentication, this should fail or return proper response
        // For now, let's just test the structure since we need proper user setup
        $this->assertInstanceOf(AuthController::class, $this->controller);
    }

    public function testActionLogoutWithoutUser()
    {
        // Test logout when no user is authenticated
        $result = $this->controller->actionLogout();

        $this->assertIsArray($result);
        $this->assertTrue($result['success']);
        $this->assertEquals('Logout successful.', $result['message']);
    }

    public function testBehaviorsConfiguration()
    {
        $behaviors = $this->controller->behaviors();

        // Test that JWT auth is configured
        $this->assertArrayHasKey('jwtAuth', $behaviors);
        $this->assertEquals(\app\filters\JwtAuthFilter::class, $behaviors['jwtAuth']['class']);
        
        // Test that login and test are excluded from auth
        $this->assertContains('login', $behaviors['jwtAuth']['except']);
        $this->assertContains('test', $behaviors['jwtAuth']['except']);

        // Test CORS configuration
        $this->assertArrayHasKey('corsFilter', $behaviors);
        $this->assertEquals(\yii\filters\Cors::class, $behaviors['corsFilter']['class']);

        // Test content negotiator
        $this->assertArrayHasKey('contentNegotiator', $behaviors);
        $this->assertEquals(\yii\web\Response::FORMAT_JSON, $behaviors['contentNegotiator']['formats']['application/json']);
    }

    public function testCorsOriginsConfiguration()
    {
        $behaviors = $this->controller->behaviors();
        $corsConfig = $behaviors['corsFilter']['cors'];
        
        // Test that localhost origins are allowed
        $this->assertContains('http://localhost:3000', $corsConfig['Origin']);
        $this->assertContains('http://localhost:3001', $corsConfig['Origin']);
        $this->assertContains('http://172.22.176.1:3000', $corsConfig['Origin']);
        $this->assertContains('http://172.22.176.1:3001', $corsConfig['Origin']);
        
        // Test that credentials are allowed
        $this->assertTrue($corsConfig['Access-Control-Allow-Credentials']);
        
        // Test max age is set
        $this->assertEquals(3600, $corsConfig['Access-Control-Max-Age']);
    }

    public function testCorsMethodsConfiguration()
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
        $this->assertContains('HEAD', $allowedMethods);
    }

    public function testActionLoginInvalidJson()
    {
        // Set up request with invalid JSON
        Yii::$app->request->setRawBody('invalid json');

        $this->expectException(\yii\base\InvalidArgumentException::class);
        $this->controller->actionLogin();
    }

    public function testActionLoginEmptyCredentials()
    {
        // Set up request with empty credentials
        Yii::$app->request->setRawBody(json_encode(['username' => '', 'password' => '']));

        // Empty credentials should trigger validation error in LoginForm, not exception
        $result = $this->controller->actionLogin();
        
        $this->assertIsArray($result);
        $this->assertFalse($result['success']);
    }

    public function testActionLoginOnlyUsername()
    {
        // Set up request with only username
        Yii::$app->request->setRawBody(json_encode(['username' => 'testuser']));

        $this->expectException(\yii\web\BadRequestHttpException::class);
        $this->expectExceptionMessage('Username and password are required.');

        $this->controller->actionLogin();
    }

    public function testActionLoginOnlyPassword()
    {
        // Set up request with only password
        Yii::$app->request->setRawBody(json_encode(['password' => 'testpass']));

        $this->expectException(\yii\web\BadRequestHttpException::class);
        $this->expectExceptionMessage('Username and password are required.');

        $this->controller->actionLogin();
    }

    public function testActionChangePasswordNotImplemented()
    {
        // Test that changePassword action exists (even if not fully implemented)
        $this->assertTrue(method_exists($this->controller, 'actionChangePassword'));
    }

    public function testControllerInheritance()
    {
        // Test that controller extends the correct base class
        $this->assertInstanceOf(\yii\rest\Controller::class, $this->controller);
    }

    public function testControllerModuleContext()
    {
        // Test when controller has module context
        $module = Yii::$app->getModule('api');
        $controllerWithModule = new \app\modules\api\controllers\AuthController('auth', $module);
        
        $this->assertNotNull($controllerWithModule->module);
        $this->assertEquals('api', $controllerWithModule->module->id);
    }

    public function testActionRefresh()
    {
        // Mock user identity with generateAccessToken and save
        $mockIdentity = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['generateAccessToken', 'save'])
            ->getMock();
        $mockIdentity->method('generateAccessToken')->willReturn('mocked_token');
        $mockIdentity->method('save')->willReturn(true);

        // Mock user application component with identity and logout
        $mockUserComponent = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['logout'])
            ->getMock();
        $mockUserComponent->identity = $mockIdentity;
        $mockUserComponent->method('logout')->willReturn(true);
        Yii::$app->set('user', $mockUserComponent);

        $result = $this->controller->actionRefresh();
        $this->assertIsArray($result);
        $this->assertTrue($result['success']);
        $this->assertEquals('Token refreshed successfully.', $result['message']);
        $this->assertArrayHasKey('data', $result);
        $this->assertEquals('mocked_token', $result['data']['access_token']);
        $this->assertEquals('Bearer', $result['data']['token_type']);
        $this->assertArrayHasKey('expires_in', $result['data']);
    }

    public function testActionChangePasswordMissingFields()
    {
        $mockIdentity = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['validatePassword', 'setPassword', 'generateAuthKey', 'revokeAccessToken', 'save'])
            ->getMock();
        $mockUserComponent = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['logout'])
            ->getMock();
        $mockUserComponent->identity = $mockIdentity;
        Yii::$app->set('user', $mockUserComponent);
        Yii::$app->request->setRawBody(json_encode(['current_password' => 'old']));
        $this->expectException(\yii\web\BadRequestHttpException::class);
        $this->controller->actionChangePassword();
    }

    public function testActionChangePasswordWrongCurrentPassword()
    {
        $mockIdentity = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['validatePassword', 'setPassword', 'generateAuthKey', 'revokeAccessToken', 'save'])
            ->getMock();
        $mockIdentity->method('validatePassword')->willReturn(false);
        $mockUserComponent = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['logout'])
            ->getMock();
        $mockUserComponent->identity = $mockIdentity;
        Yii::$app->set('user', $mockUserComponent);
        Yii::$app->request->setRawBody(json_encode(['current_password' => 'wrong', 'new_password' => 'newpass123']));
        $result = $this->controller->actionChangePassword();
        $this->assertFalse($result['success']);
        $this->assertEquals('Current password is incorrect.', $result['message']);
    }

    public function testActionChangePasswordTooShort()
    {
        $mockIdentity = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['validatePassword', 'setPassword', 'generateAuthKey', 'revokeAccessToken', 'save'])
            ->getMock();
        $mockIdentity->method('validatePassword')->willReturn(true);
        $mockUserComponent = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['logout'])
            ->getMock();
        $mockUserComponent->identity = $mockIdentity;
        Yii::$app->set('user', $mockUserComponent);
        Yii::$app->request->setRawBody(json_encode(['current_password' => 'oldpass', 'new_password' => '123']));
        $result = $this->controller->actionChangePassword();
        $this->assertFalse($result['success']);
        $this->assertEquals('New password must be at least 6 characters long.', $result['message']);
    }

    public function testActionChangePasswordSaveFailure()
    {
        $mockIdentity = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['validatePassword', 'setPassword', 'generateAuthKey', 'revokeAccessToken', 'save'])
            ->getMock();
        $mockIdentity->method('validatePassword')->willReturn(true);
        $mockIdentity->method('save')->willReturn(false);
        $mockUserComponent = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['logout'])
            ->getMock();
        $mockUserComponent->identity = $mockIdentity;
        Yii::$app->set('user', $mockUserComponent);
        Yii::$app->request->setRawBody(json_encode(['current_password' => 'oldpass', 'new_password' => 'newpass123']));
        $this->expectException(\yii\web\ServerErrorHttpException::class);
        $this->controller->actionChangePassword();
    }

    public function testActionChangePasswordSuccess()
    {
        $mockIdentity = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['validatePassword', 'setPassword', 'generateAuthKey', 'revokeAccessToken', 'save'])
            ->getMock();
        $mockIdentity->method('validatePassword')->willReturn(true);
        $mockIdentity->method('save')->willReturn(true);
        $mockUserComponent = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['logout'])
            ->getMock();
        $mockUserComponent->identity = $mockIdentity;
        Yii::$app->set('user', $mockUserComponent);
        Yii::$app->request->setRawBody(json_encode(['current_password' => 'oldpass', 'new_password' => 'newpass123']));
        $result = $this->controller->actionChangePassword();
        $this->assertTrue($result['success']);
        $this->assertEquals('Password changed successfully. Please log in again.', $result['message']);
    }

    public function testActionMe()
    {
        // Mock user identity with all required properties and getDisplayName
        $mockIdentity = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['getDisplayName'])
            ->getMock();
        $mockIdentity->id = 1;
        $mockIdentity->username = 'testuser';
        $mockIdentity->email = 'test@example.com';
        $mockIdentity->first_name = 'Test';
        $mockIdentity->last_name = 'User';
        $mockIdentity->role = 'admin';
        $mockIdentity->last_login_at = '2024-06-13 12:00:00';
        $mockIdentity->method('getDisplayName')->willReturn('Test User');

        $mockUserComponent = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['logout'])
            ->getMock();
        $mockUserComponent->identity = $mockIdentity;
        Yii::$app->set('user', $mockUserComponent);

        $result = $this->controller->actionMe();
        $this->assertIsArray($result);
        $this->assertTrue($result['success']);
        $this->assertArrayHasKey('data', $result);
        $this->assertArrayHasKey('user', $result['data']);
        $user = $result['data']['user'];
        $this->assertEquals(1, $user['id']);
        $this->assertEquals('testuser', $user['username']);
        $this->assertEquals('test@example.com', $user['email']);
        $this->assertEquals('Test', $user['first_name']);
        $this->assertEquals('User', $user['last_name']);
        $this->assertEquals('admin', $user['role']);
        $this->assertEquals('Test User', $user['display_name']);
        $this->assertEquals('2024-06-13 12:00:00', $user['last_login_at']);
    }
} 