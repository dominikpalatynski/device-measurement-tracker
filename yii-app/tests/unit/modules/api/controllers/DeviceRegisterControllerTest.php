<?php
namespace tests\unit\modules\api\controllers;

use PHPUnit\Framework\TestCase;
use Yii;
use app\modules\api\controllers\DeviceRegisterController;
use tests\unit\modules\api\controllers\stubs\DevicesStub;
use tests\unit\modules\api\controllers\stubs\FaultsStub;
use tests\unit\modules\api\controllers\stubs\VerificationTokenStub;
use yii\web\ServerErrorHttpException;
use yii\web\IdentityInterface;
use tests\unit\modules\api\controllers\stubs\ConditionStub;
use yii\web\Response;

// Mock user class implementing IdentityInterface
class MockUser implements IdentityInterface
{
    public $id;
    private $isAdmin;

    public function __construct($id, $isAdmin = false)
    {
        $this->id = $id;
        $this->isAdmin = $isAdmin;
    }

    public function isAdmin()
    {
        return $this->isAdmin;
    }

    public static function findIdentity($id)
    {
        return new self($id);
    }

    public static function findIdentityByAccessToken($token, $type = null)
    {
        return new self(1);
    }

    public function getId()
    {
        return $this->id;
    }

    public function getAuthKey()
    {
        return 'test-auth-key';
    }

    public function validateAuthKey($authKey)
    {
        return $authKey === 'test-auth-key';
    }
}

/**
 * @covers \app\modules\api\controllers\DeviceRegisterController
 */
class DeviceRegisterControllerTest extends TestCase
{
    protected $controller;
    protected $isPost = false;
    private $originalUser;

    protected function setUp(): void
    {
        parent::setUp();
        
        // Store original user component
        $this->originalUser = Yii::$app->get('user', false);
        
        // Create controller instance
        $this->controller = new DeviceRegisterController('device-register', Yii::$app);
        $this->controller->setDevicesClass(DevicesStub::class);
        $this->controller->setFaultsClass(FaultsStub::class);
        $this->controller->setVerificationTokenClass(VerificationTokenStub::class);
        
        // Setup mock user component
        $mockUserComponent = $this->getMockBuilder(\yii\web\User::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['getIsGuest', 'getId', 'can', 'setIdentity', 'getIdentity'])
            ->getMock();
        
        $mockUser = new MockUser(1, true);
        $mockUserComponent->method('getIsGuest')->willReturn(false);
        $mockUserComponent->method('getId')->willReturn(1);
        $mockUserComponent->method('can')->willReturn(true);
        $mockUserComponent->method('getIdentity')->willReturn($mockUser);
        $mockUserComponent->method('setIdentity')->willReturnSelf();
        
        Yii::$app->set('user', $mockUserComponent);

        // Configure request component
        $request = $this->getMockBuilder(\yii\web\Request::class)
            ->onlyMethods(['getIsPost', 'post', 'getBodyParams', 'getRawBody'])
            ->getMock();
        $request->method('getIsPost')->willReturn(false);
        $request->method('post')->willReturn([]);
        $request->method('getBodyParams')->willReturn([]);
        $request->method('getRawBody')->willReturn('');
        $request->enableCsrfValidation = false;
        Yii::$app->set('request', $request);

        // Mock DB component
        $mockDb = $this->getMockBuilder(\yii\db\Connection::class)
            ->disableOriginalConstructor()
            ->getMock();

        // Mock transaction
        $mockTransaction = $this->getMockBuilder(\yii\db\Transaction::class)
            ->disableOriginalConstructor()
            ->getMock();
        $mockTransaction->method('commit')->willReturn(true);
        $mockTransaction->method('rollBack')->willReturn(true);

        $mockDb->method('beginTransaction')->willReturn($mockTransaction);
        Yii::$app->set('db', $mockDb);
    }

    protected function tearDown(): void
    {
        // Reset DevicesStub static properties
        DevicesStub::setFindByDeviceIdResult(null);
        DevicesStub::setFindOneReturn(null);
        DevicesStub::setDefaultSaveReturn(true);
        DevicesStub::setDefaultErrors([]);

        // Reset request state by creating a fresh request object
        $request = new \yii\web\Request();
        $request->enableCsrfValidation = false;
        Yii::$app->set('request', $request);
        
        // Clear superglobals
        $_SERVER['REQUEST_METHOD'] = 'GET';
        $_POST = [];
        $_GET = [];

        // Restore original user component
        if ($this->originalUser) {
            Yii::$app->set('user', $this->originalUser);
        }
        parent::tearDown();
    }

    protected function mockRequest($method, $data = [], $headers = [])
    {
        $method = strtoupper($method);
        
        // Create a new request object
        $request = $this->getMockBuilder(\yii\web\Request::class)
            ->onlyMethods(['getIsPost', 'post', 'getBodyParams', 'getRawBody', 'getHeaders'])
            ->getMock();
        
        // Configure method checks
        $request->method('getIsPost')->willReturn($method === 'POST');
        
        // Configure post data access
        $request->method('post')->willReturnCallback(function($name = null) use ($data) {
            if ($name === null) return $data;
            return isset($data[$name]) ? $data[$name] : null;
        });
        
        // Configure body params
        $request->method('getBodyParams')->willReturn($data);
        
        // Configure raw body
        $request->method('getRawBody')->willReturn(json_encode($data));
        
        // Configure headers
        $headers = array_merge([
            'Content-Type' => 'application/json'
        ], $headers);
        
        $mockHeaders = $this->getMockBuilder(\yii\web\HeaderCollection::class)
            ->onlyMethods(['get', 'set'])
            ->getMock();
        
        $mockHeaders->method('get')->willReturnCallback(function($name) use ($headers) {
            return isset($headers[$name]) ? $headers[$name] : null;
        });
        
        $mockHeaders->method('set')->willReturnCallback(function($name, $value) use (&$headers) {
            $headers[$name] = $value;
        });
        
        $request->method('getHeaders')->willReturn($mockHeaders);
        
        // Set CSRF validation to false
        $request->enableCsrfValidation = false;
        
        // Set request method in $_SERVER
        $_SERVER['REQUEST_METHOD'] = $method;
        
        // Set POST/GET data
        if ($method === 'POST') {
            $_POST = $data;
        } else {
            $_GET = $data;
        }
        
        // Replace the application request component
        Yii::$app->set('request', $request);
        
        // Update isPost flag
        $this->isPost = ($method === 'POST');
    }

    protected function mockPostRequest($data)
    {
        $this->mockRequest('POST', $data);
    }

    protected function mockGetRequest($params = [])
    {
        $this->mockRequest('GET', $params);
    }

    public function testActionTest()
    {
        $result = $this->controller->actionTest();
        $this->assertTrue($result['success']);
        $this->assertEquals('DeviceRegisterController is working', $result['message']);
        $this->assertArrayHasKey('timestamp', $result);
        $this->assertEquals(DeviceRegisterController::class, $result['controller']);
    }

    public function testActionRegenerateTokenNotPost()
    {
        // Mock a GET request
        $this->mockRequest('GET');
        
        // Call the action
        $response = $this->controller->actionRegenerateToken();
        
        // Verify response
        $this->assertIsArray($response);
        $this->assertArrayHasKey('success', $response);
        $this->assertFalse($response['success']);
        $this->assertArrayHasKey('error', $response);
        $this->assertEquals('Method not allowed. Use POST to regenerate token.', $response['error']);
        $this->assertArrayHasKey('allowed_methods', $response);
        $this->assertEquals(['POST'], $response['allowed_methods']);
        $this->assertEquals(405, Yii::$app->response->statusCode);
    }

    public function testActionRegenerateTokenMissingDeviceId()
    {
        $this->mockRequest('POST', ['rawBody' => json_encode([])]);
        $result = $this->controller->actionRegenerateToken();
        $this->assertFalse($result['success']);
        $this->assertEquals('Missing deviceId in request body', $result['error']);
    }

    public function testActionRegenerateTokenDeviceNotFound()
    {
        // Set up device stub to return null (device not found)
        $deviceId = 'NONEXISTENT';
        DevicesStub::setFindByDeviceIdResult(null);
        
        // Mock a POST request with device ID
        $this->mockRequest('POST', [
            'deviceId' => $deviceId
        ], [
            'Content-Type' => 'application/json'
        ]);
        
        // Call the action
        $response = $this->controller->actionRegenerateToken();
        
        // Verify response
        $this->assertIsArray($response);
        $this->assertFalse($response['success']);
        $this->assertEquals("Device with ID '$deviceId' not found", $response['error']);
        $this->assertEquals(404, Yii::$app->response->statusCode);
    }

    public function testActionRegenerateTokenDeviceNotInactive()
    {
        // Set up device stub with active status
        $deviceId = 'TEST001';
        $device = new DevicesStub();
        $device->device_id = $deviceId;
        $device->device_name = 'Test Device';
        $device->device_type = 'sensor';
        $device->status = DevicesStub::STATUS_ACTIVE;
        DevicesStub::setFindByDeviceIdResult($device);
        
        // Mock a POST request with device ID
        $this->mockRequest('POST', [
            'deviceId' => $deviceId
        ], [
            'Content-Type' => 'application/json'
        ]);
        
        // Call the action
        $response = $this->controller->actionRegenerateToken();
        
        // Verify response
        $this->assertIsArray($response);
        $this->assertFalse($response['success']);
        $this->assertEquals('Device is not awaiting verification', $response['error']);
        $this->assertEquals(400, Yii::$app->response->statusCode);
    }

    public function testActionRegenerateTokenSuccess()
    {
        // Set up device stub
        $deviceId = 'TEST001';
        $device = new DevicesStub();
        $device->device_id = $deviceId;
        $device->device_name = 'Test Device';
        $device->device_type = 'sensor';
        $device->status = DevicesStub::STATUS_INACTIVE;
        DevicesStub::setFindByDeviceIdResult($device);
        
        // Set up verification token stub
        $token = new VerificationTokenStub();
        $token->device_id = $deviceId;
        $token->token = 'test_token';
        $token->expiration_date = time() + 3600;
        $token->used = false;
        VerificationTokenStub::setFindOneReturn($token);
        VerificationTokenStub::setNextInstance($token);
        
        // Mock a POST request with device ID
        $this->mockRequest('POST', ['deviceId' => $deviceId]);
        
        // Call the action
        $response = $this->controller->actionRegenerateToken();
        
        // Verify response
        $this->assertIsArray($response);
        $this->assertTrue($response['success']);
        $this->assertEquals('New verification token generated successfully', $response['message']);
        $this->assertArrayHasKey('data', $response);
        $this->assertEquals($deviceId, $response['data']['device_id']);
        $this->assertEquals('Test Device', $response['data']['device_name']);
        $this->assertEquals('sensor', $response['data']['device_type']);
        $this->assertEquals(DevicesStub::STATUS_INACTIVE, $response['data']['status']);
        $this->assertArrayHasKey('verification_token', $response['data']);
        $this->assertArrayHasKey('expiration_date', $response['data']);
    }

    public function testActionRegenerateTokenDeletionFailure()
    {
        // Set up device stub
        $deviceId = 'TEST001';
        $device = new DevicesStub();
        $device->device_id = $deviceId;
        $device->device_name = 'Test Device';
        $device->device_type = 'sensor';
        $device->status = DevicesStub::STATUS_INACTIVE;
        DevicesStub::setFindByDeviceIdResult($device);
        
        // Set up verification token stub that fails to delete
        $token = new VerificationTokenStub();
        $token->device_id = $deviceId;
        $token->token = 'test_token';
        $token->expiration_date = time() + 3600;
        $token->used = false;
        $token->deleteReturn = false;
        $token->errors = ['delete' => ['Error deleting existing verification token']];
        VerificationTokenStub::setFindOneReturn($token);
        
        // Mock request
        $this->mockRequest('POST', ['deviceId' => $deviceId]);
        
        // Call the action
        $result = $this->controller->actionRegenerateToken();
        
        // Verify response
        $this->assertFalse($result['success']);
        $this->assertEquals('Internal server error occurred', $result['error']);
        $this->assertEquals(500, Yii::$app->response->statusCode);
    }

    public function testActionRegenerateTokenCreationFailure()
    {
        // Set up device stub
        $deviceId = 'TEST001';
        $device = new DevicesStub();
        $device->device_id = $deviceId;
        $device->device_name = 'Test Device';
        $device->device_type = 'sensor';
        $device->status = DevicesStub::STATUS_INACTIVE;
        DevicesStub::setFindByDeviceIdResult($device);
        
        // Set up verification token stub that fails to create
        $existingToken = new VerificationTokenStub();
        $existingToken->device_id = $deviceId;
        $existingToken->token = 'old_token';
        $existingToken->deleteReturn = true;
        VerificationTokenStub::setFindOneReturn($existingToken);
        
        // Configure new token to fail on save
        $newToken = new VerificationTokenStub();
        $newToken->device_id = $deviceId;
        $newToken->token = 'new_token';
        $newToken->saveReturn = false;
        $newToken->errors = ['token' => ['Error creating token']];
        VerificationTokenStub::setNextInstance($newToken);
        
        // Mock request
        $this->mockRequest('POST', ['deviceId' => $deviceId]);
        
        // Mock response format
        Yii::$app->response->format = Response::FORMAT_JSON;
        
        // Call the action
        $result = $this->controller->actionRegenerateToken();
        
        // Verify response
        $this->assertFalse($result['success']);
        $this->assertEquals('Internal server error occurred', $result['error']);
        $this->assertEquals(500, Yii::$app->response->statusCode);
    }

    public function testActionRegisterNotPost()
    {
        $this->isPost = false;
        $result = $this->controller->actionRegister();
        $this->assertFalse($result['success']);
        $this->assertEquals('Method not allowed. Use POST to register a device.', $result['error']);
    }

    public function testActionRegisterMissingDeviceId()
    {
        // Mock a POST request without device ID
        $this->mockRequest('POST', [
            'token' => 'test_token'
        ], [
            'Content-Type' => 'application/json'
        ]);
        
        // Call the action
        $response = $this->controller->actionRegister();
        
        // Verify response
        $this->assertIsArray($response);
        $this->assertFalse($response['success']);
        $this->assertEquals('Missing deviceId or token in request body', $response['error']);
        $this->assertEquals(400, Yii::$app->response->statusCode);
    }

    public function testActionRegisterDeviceNotFound()
    {
        // Set up device stub to return null (device not found)
        $deviceId = 'NONEXISTENT';
        DevicesStub::setFindByDeviceIdResult(null);
        
        // Mock a POST request with device ID and token
        $this->mockRequest('POST', [
            'deviceId' => $deviceId,
            'token' => 'test_token'
        ]);
        
        // Call the action
        $response = $this->controller->actionRegister();
        
        // Verify response
        $this->assertIsArray($response);
        $this->assertFalse($response['success']);
        $this->assertEquals('Device not found', $response['error']);
        $this->assertEquals(404, Yii::$app->response->statusCode);
    }

    public function testActionRegisterVerificationTokenNotFound()
    {
        // Set up device stub
        $deviceId = 'TEST001';
        $device = new DevicesStub();
        $device->device_id = $deviceId;
        $device->device_name = 'Test Device';
        $device->device_type = 'sensor';
        $device->status = DevicesStub::STATUS_INACTIVE;
        DevicesStub::setFindByDeviceIdResult($device);
        
        // Set up verification token stub to return null
        VerificationTokenStub::setFindOneReturn(null);
        
        // Mock a POST request with device ID and token
        $this->mockRequest('POST', [
            'deviceId' => $deviceId,
            'token' => 'nonexistent_token'
        ], [
            'Content-Type' => 'application/json'
        ]);
        
        // Call the action
        $response = $this->controller->actionRegister();
        
        // Verify response
        $this->assertIsArray($response);
        $this->assertFalse($response['success']);
        $this->assertEquals('Verification token not found', $response['error']);
        $this->assertEquals(404, Yii::$app->response->statusCode);
    }

    public function testActionRegisterInvalidAccessToken()
    {
        // Set up device stub
        $deviceId = 'TEST001';
        $device = new DevicesStub();
        $device->device_id = $deviceId;
        $device->device_name = 'Test Device';
        $device->device_type = 'sensor';
        $device->status = DevicesStub::STATUS_INACTIVE;
        DevicesStub::setFindByDeviceIdResult($device);
        
        // Set up verification token stub with invalid token
        VerificationTokenStub::setFindOneReturn(null);
        
        // Mock a POST request with device ID and invalid token
        $this->mockRequest('POST', [
            'deviceId' => $deviceId,
            'token' => 'invalid_token'
        ], [
            'Content-Type' => 'application/json'
        ]);
        
        // Call the action
        $response = $this->controller->actionRegister();
        
        // Verify response
        $this->assertIsArray($response);
        $this->assertFalse($response['success']);
        $this->assertEquals('Verification token not found', $response['error']);
        $this->assertEquals(404, Yii::$app->response->statusCode);
    }

    public function testActionRegisterVerificationTokenAlreadyUsed()
    {
        // Set up device stub
        $deviceId = 'TEST001';
        $device = new DevicesStub();
        $device->device_id = $deviceId;
        $device->device_name = 'Test Device';
        $device->device_type = 'sensor';
        $device->status = DevicesStub::STATUS_INACTIVE;
        DevicesStub::setFindByDeviceIdResult($device);
        
        // Set up verification token stub that's already used
        $verificationToken = new VerificationTokenStub();
        $verificationToken->device_id = $deviceId;
        $verificationToken->token = 'test_token';
        $verificationToken->expiration_date = time() + 3600;
        $verificationToken->used = true;
        VerificationTokenStub::setFindOneReturn($verificationToken);
        
        // Mock a POST request with device ID and token
        $this->mockRequest('POST', [
            'deviceId' => $deviceId,
            'token' => 'test_token'
        ], [
            'Content-Type' => 'application/json'
        ]);
        
        // Call the action
        $response = $this->controller->actionRegister();
        
        // Verify response
        $this->assertIsArray($response);
        $this->assertFalse($response['success']);
        $this->assertEquals('Verification token already used', $response['error']);
        $this->assertEquals(400, Yii::$app->response->statusCode);
    }

    public function testActionRegisterErrorUpdatingVerificationToken()
    {
        // Set up device stub
        $deviceId = 'TEST001';
        $device = new DevicesStub();
        $device->device_id = $deviceId;
        $device->device_name = 'Test Device';
        $device->device_type = 'sensor';
        $device->status = DevicesStub::STATUS_INACTIVE;
        DevicesStub::setFindByDeviceIdResult($device);
        
        // Set up verification token stub that fails to save
        $verificationToken = new VerificationTokenStub();
        $verificationToken->device_id = $deviceId;
        $verificationToken->token = 'test_token';
        $verificationToken->expiration_date = time() + 3600;
        $verificationToken->used = false;
        $verificationToken->saveReturn = false;
        $verificationToken->errors = ['token' => ['Error saving token']];
        VerificationTokenStub::setFindOneReturn($verificationToken);
        
        // Mock a POST request with device ID and token
        $this->mockRequest('POST', [
            'deviceId' => $deviceId,
            'token' => 'test_token'
        ], [
            'Content-Type' => 'application/json'
        ]);
        
        // Call the action
        $response = $this->controller->actionRegister();
        
        // Verify response
        $this->assertIsArray($response);
        $this->assertFalse($response['success']);
        $this->assertStringContainsString('Error updating verification token', $response['error']);
        $this->assertEquals(500, Yii::$app->response->statusCode);
    }

    public function testActionRegisterErrorUpdatingDevice()
    {
        // Set up device stub that fails to save
        $deviceId = 'TEST001';
        $device = new DevicesStub();
        $device->device_id = $deviceId;
        $device->device_name = 'Test Device';
        $device->device_type = 'sensor';
        $device->status = DevicesStub::STATUS_INACTIVE;
        $device->saveReturn = false;
        $device->errors = ['status' => ['Error updating status']];
        DevicesStub::setFindByDeviceIdResult($device);
        
        // Set up verification token stub
        $verificationToken = new VerificationTokenStub();
        $verificationToken->device_id = $deviceId;
        $verificationToken->token = 'test_token';
        $verificationToken->expiration_date = time() + 3600;
        $verificationToken->used = false;
        $verificationToken->saveReturn = true;
        VerificationTokenStub::setFindOneReturn($verificationToken);
        
        // Mock a POST request with device ID and token
        $this->mockRequest('POST', [
            'deviceId' => $deviceId,
            'token' => 'test_token'
        ], [
            'Content-Type' => 'application/json'
        ]);
        
        // Call the action
        $response = $this->controller->actionRegister();
        
        // Verify response
        $this->assertIsArray($response);
        $this->assertFalse($response['success']);
        $this->assertStringContainsString('Error updating device', $response['error']);
        $this->assertEquals(500, Yii::$app->response->statusCode);
    }

    public function testActionRegisterSuccess()
    {
        // Set up device stub
        $deviceId = 'TEST001';
        $device = new DevicesStub();
        $device->device_id = $deviceId;
        $device->device_name = 'Test Device';
        $device->device_type = 'sensor';
        $device->status = DevicesStub::STATUS_INACTIVE;
        DevicesStub::setFindByDeviceIdResult($device);
        
        // Set up verification token stub
        $verificationToken = new VerificationTokenStub();
        $verificationToken->device_id = $deviceId;
        $verificationToken->token = 'test_token';
        $verificationToken->expiration_date = time() + 3600;
        $verificationToken->used = false;
        VerificationTokenStub::setFindOneReturn($verificationToken);
        
        // Mock a POST request with device ID and token
        $this->mockRequest('POST', [
            'deviceId' => $deviceId,
            'token' => 'test_token'
        ], [
            'Content-Type' => 'application/json'
        ]);
        
        // Call the action
        $response = $this->controller->actionRegister();
        
        // Verify response
        $this->assertIsArray($response);
        $this->assertTrue($response['success']);
        $this->assertEquals('Device registered successfully', $response['message']);
        $this->assertArrayHasKey('data', $response);
        $this->assertEquals($deviceId, $response['data']['device_id']);
        $this->assertEquals('Test Device', $response['data']['device_name']);
        $this->assertEquals('sensor', $response['data']['device_type']);
        $this->assertEquals(DevicesStub::STATUS_ACTIVE, $response['data']['status']);
        $this->assertArrayHasKey('registration_date', $response['data']);
    }

    public function testActionUpdateSuccess()
    {
        // Set up device stub
        $deviceId = 'TEST001';
        $device = new DevicesStub();
        $device->device_id = $deviceId;
        $device->device_name = 'Test Device';
        $device->device_type = 'sensor';
        $device->status = DevicesStub::STATUS_ACTIVE;
        DevicesStub::setFindByDeviceIdResult($device);
        
        // Mock a POST request with updated device data
        $this->mockRequest('POST', [
            'deviceId' => $deviceId,
            'device_name' => 'Updated Device',
            'device_type' => 'updated_sensor'
        ], [
            'Content-Type' => 'application/json'
        ]);
        
        // Call the action
        $response = $this->controller->actionUpdate($deviceId);
        
        // Verify response
        $this->assertIsArray($response);
        $this->assertTrue($response['success']);
        $this->assertEquals('Device updated successfully', $response['message']);
        $this->assertArrayHasKey('data', $response);
        $this->assertEquals($deviceId, $response['data']['device_id']);
        $this->assertEquals('Updated Device', $response['data']['device_name']);
        $this->assertEquals('updated_sensor', $response['data']['device_type']);
        $this->assertEquals(DevicesStub::STATUS_ACTIVE, $response['data']['status']);
    }

    public function testActionUpdateDeviceNotFound()
    {
        if (!class_exists('app\\models\\Devices', false)) {
            class_alias('tests\\unit\\modules\\api\\controllers\\stubs\\DevicesStub', 'app\\models\\Devices');
        }

        // Set up admin user
        Yii::$app->set('user', new \yii\web\User(['identityClass' => MockUser::class]));
        Yii::$app->user->setIdentity(new MockUser(1, true));

        DevicesStub::setFindOneReturn(null);
        $result = $this->controller->actionUpdate('DEV404');
        $this->assertFalse($result['success']);
        $this->assertStringContainsString('not found', $result['error']);
    }

    public function testActionUpdateSaveFailure()
    {
        // Set up device stub that fails to save
        $deviceId = 'TEST001';
        $device = new DevicesStub();
        $device->device_id = $deviceId;
        $device->device_name = 'Test Device';
        $device->device_type = 'sensor';
        $device->status = DevicesStub::STATUS_ACTIVE;
        $device->saveReturn = false;
        $device->errors = ['device_name' => ['Invalid name']];
        DevicesStub::setFindByDeviceIdResult($device);
        
        // Mock a POST request with updated device data
        $this->mockRequest('POST', [
            'deviceId' => $deviceId,
            'device_name' => 'Invalid Name',
            'device_type' => 'updated_sensor'
        ], [
            'Content-Type' => 'application/json'
        ]);
        
        // Call the action
        $response = $this->controller->actionUpdate($deviceId);
        
        // Verify response
        $this->assertIsArray($response);
        $this->assertFalse($response['success']);
        $this->assertStringContainsString('Invalid name', $response['error']);
        $this->assertEquals(500, Yii::$app->response->statusCode);
    }

    public function testActionDeleteSuccess()
    {
        // Set up device stub
        $deviceId = 'TEST001';
        $device = new DevicesStub();
        $device->device_id = $deviceId;
        $device->device_name = 'Test Device';
        $device->device_type = 'sensor';
        $device->status = DevicesStub::STATUS_ACTIVE;
        $device->owner_id = 1;
        $device->deleteReturn = true;
        DevicesStub::setFindOneReturn($device);
        DevicesStub::setFindByDeviceIdResult($device);
        
        // Set up admin user
        $mockUser = new MockUser(1, true);
        Yii::$app->user->setIdentity($mockUser);
        
        // Mock response format
        Yii::$app->response->format = Response::FORMAT_JSON;
        
        // Call the action
        $response = $this->controller->actionDelete($deviceId);
        
        // Verify response
        $this->assertTrue($response['success']);
        $this->assertEquals('Device deleted successfully', $response['message']);
        $this->assertEquals(200, Yii::$app->response->statusCode);
    }

    public function testActionDeleteDeviceNotFound()
    {
        if (!class_exists('app\\models\\Devices', false)) {
            class_alias('tests\\unit\\modules\\api\\controllers\\stubs\\DevicesStub', 'app\\models\\Devices');
        }

        // Set up admin user
        Yii::$app->set('user', new \yii\web\User(['identityClass' => MockUser::class]));
        Yii::$app->user->setIdentity(new MockUser(1, true));

        DevicesStub::setFindOneReturn(null);
        $result = $this->controller->actionDelete('DEV404');
        $this->assertFalse($result['success']);
        $this->assertStringContainsString('not found', $result['error']);
    }

    public function testActionDeleteFailure()
    {
        // Set up device stub that fails to delete
        $deviceId = 'TEST001';
        $device = new DevicesStub();
        $device->device_id = $deviceId;
        $device->device_name = 'Test Device';
        $device->device_type = 'sensor';
        $device->status = DevicesStub::STATUS_ACTIVE;
        $device->saveReturn = false;
        $device->errors = ['delete' => ['Error deleting device']];
        DevicesStub::setFindOneReturn($device);
        DevicesStub::setFindByDeviceIdResult($device);
        
        // Set up admin user
        $mockUser = new MockUser(1, true);
        Yii::$app->user->setIdentity($mockUser);
        
        // Call the action
        $response = $this->controller->actionDelete($deviceId);
        
        // Verify response
        $this->assertFalse($response['success']);
        $this->assertEquals('Error deleting device', $response['error']);
        $this->assertEquals(500, Yii::$app->response->statusCode);
    }

    public function testActionListAdminSeesAll()
    {
        // Set up admin user
        $mockUser = new MockUser(1, true);
        Yii::$app->user->setIdentity($mockUser);
        
        // Set up device stubs
        $device1 = new DevicesStub();
        $device1->device_id = 'TEST001';
        $device1->device_name = 'Test Device 1';
        $device1->device_type = 'sensor';
        $device1->status = DevicesStub::STATUS_ACTIVE;
        
        $device2 = new DevicesStub();
        $device2->device_id = 'TEST002';
        $device2->device_name = 'Test Device 2';
        $device2->device_type = 'sensor';
        $device2->status = DevicesStub::STATUS_ACTIVE;
        
        // Set up mock query
        $mockQuery = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['all'])
            ->getMock();
        $mockQuery->method('all')->willReturn([$device1, $device2]);
        DevicesStub::setFindReturn($mockQuery);
        
        // Mock a GET request
        $this->mockRequest('GET', [], [
            'Content-Type' => 'application/json'
        ]);
        
        // Call the action
        $response = $this->controller->actionList();
        
        // Verify response
        $this->assertIsArray($response);
        $this->assertTrue($response['success']);
        $this->assertArrayHasKey('data', $response);
        $this->assertCount(2, $response['data']);
        $this->assertEquals('TEST001', $response['data'][0]['device_id']);
        $this->assertEquals('TEST002', $response['data'][1]['device_id']);
    }

    public function testActionListUserSeesOwnDevices()
    {
        if (!class_exists('app\\models\\Devices', false)) {
            class_alias('tests\\unit\\modules\\api\\controllers\\stubs\\DevicesStub', 'app\\models\\Devices');
        }

        // Set up regular user
        Yii::$app->set('user', new \yii\web\User(['identityClass' => MockUser::class]));
        $mockUser = new MockUser(42, false);
        Yii::$app->user->setIdentity($mockUser);

        // Mock user's devices
        $devices = [
            new DevicesStub(['device_id' => 'DEV001', 'device_name' => 'My Device', 'owner_id' => 42])
        ];
        $mockQuery = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['all'])
            ->getMock();
        $mockQuery->method('all')->willReturn($devices);
        DevicesStub::setFindByOwnerReturn($mockQuery);

        $result = $this->controller->actionList();
        var_dump($result); // Debug output
        $this->assertTrue($result['success']);
        $this->assertCount(1, $result['data']);
        $this->assertEquals('DEV001', $result['data'][0]['device_id']);
    }

    public function testActionListError()
    {
        if (!class_exists('app\\models\\Devices', false)) {
            class_alias('tests\\unit\\modules\\api\\controllers\\stubs\\DevicesStub', 'app\\models\\Devices');
        }

        // Set up user that will trigger an error
        Yii::$app->set('user', new \yii\web\User(['identityClass' => MockUser::class]));
        $mockUser = new MockUser(1);
        $mockUser = $this->getMockBuilder(MockUser::class)
            ->onlyMethods(['isAdmin'])
            ->setConstructorArgs([1])
            ->getMock();
        $mockUser->method('isAdmin')->willThrowException(new \Exception('Database error'));
        Yii::$app->user->setIdentity($mockUser);

        $result = $this->controller->actionList();
        $this->assertFalse($result['success']);
        $this->assertEquals('Database error', $result['error']);
    }

    public function testActionViewSuccess()
    {
        // Mock GET request with deviceId parameter
        $this->mockRequest('GET', ['id' => 'DEV001']);

        // Setup device stub with all required data
        $deviceStub = new class {
            public $device_id = 'DEV001';
            public $device_name = 'Test Device';
            public $device_type = 'sensor';
            public $status = 'active';
            public $owner_id = 1;
            public $created_at = '2024-01-01 00:00:00';
            public $updated_at = '2024-01-01 00:00:00';
            public function save() { return true; }
            public $errors = [];
            public $attributes = [
                'device_id' => 'DEV001',
                'device_name' => 'Test Device',
                'device_type' => 'sensor',
                'status' => 'active',
                'owner_id' => 1,
                'created_at' => '2024-01-01 00:00:00',
                'updated_at' => '2024-01-01 00:00:00'
            ];
            public function toArray($fields = [], $expand = [], $recursive = true) {
                return $this->attributes;
            }
            public function getAttributes($names = null, $except = []) {
                if ($names === null) {
                    return $this->attributes;
                }
                $attrs = [];
                foreach ($names as $name) {
                    if (isset($this->attributes[$name]) && !in_array($name, $except)) {
                        $attrs[$name] = $this->attributes[$name];
                    }
                }
                return $attrs;
            }
        };
        DevicesStub::setFindOneReturn($deviceStub);
        DevicesStub::setFindByDeviceIdResult($deviceStub);

        // Execute and verify
        $result = $this->controller->actionView('DEV001');
        $this->assertTrue($result['success'], 'Expected success to be true, got false. Error: ' . ($result['error'] ?? 'No error message'));
        $this->assertArrayHasKey('data', $result);
        $this->assertEquals('DEV001', $result['data']['device_id']);
        $this->assertEquals('Test Device', $result['data']['device_name']);
        $this->assertEquals('sensor', $result['data']['device_type']);
        $this->assertEquals('active', $result['data']['status']);
    }

    public function testActionViewMissingId()
    {
        if (!class_exists('app\\models\\Devices', false)) {
            class_alias('tests\\unit\\modules\\api\\controllers\\stubs\\DevicesStub', 'app\\models\\Devices');
        }

        // Set up admin user
        Yii::$app->set('user', new \yii\web\User(['identityClass' => MockUser::class]));
        Yii::$app->user->setIdentity(new MockUser(1, true));

        // Clear request parameters
        $_GET = [];

        $result = $this->controller->actionView();
        $this->assertFalse($result['success']);
        $this->assertStringContainsString('Missing required parameter: id', $result['error']);
    }

    public function testActionViewDeviceNotFound()
    {
        if (!class_exists('app\\models\\Devices', false)) {
            class_alias('tests\\unit\\modules\\api\\controllers\\stubs\\DevicesStub', 'app\\models\\Devices');
        }

        // Set up admin user
        Yii::$app->set('user', new \yii\web\User(['identityClass' => MockUser::class]));
        Yii::$app->user->setIdentity(new MockUser(1, true));

        // Set up request parameter
        $_GET['id'] = 'DEV404';
        DevicesStub::setFindOneReturn(null);
        DevicesStub::setFindByDeviceIdResult(null);

        $result = $this->controller->actionView();
        $this->assertFalse($result['success']);
        $this->assertStringContainsString('not found', $result['error']);
    }

    public function testActionCreateSuccess()
    {
        // Set up admin user
        $mockUser = new MockUser(1, true);
        Yii::$app->user->setIdentity($mockUser);

        // Mock request with device data
        $requestData = [
            'device_name' => 'New Device',
            'device_type' => 'sensor'
        ];
        $this->mockRequest('POST', $requestData);

        // Mock security component
        $security = $this->getMockBuilder('yii\\base\\Security')
            ->onlyMethods(['generateRandomString'])
            ->getMock();
        $security->method('generateRandomString')
            ->willReturnOnConsecutiveCalls('device123', 'token456');
        Yii::$app->set('security', $security);

        // Mock device
        $device = new DevicesStub();
        $device->device_id = 'device123';
        $device->device_name = 'New Device';
        $device->device_type = 'sensor';
        $device->owner_id = 1;
        $device->status = DevicesStub::STATUS_INACTIVE;
        $device->saveReturn = true;
        DevicesStub::setFindOneReturn($device);

        // Mock verification token
        $token = new VerificationTokenStub();
        $token->device_id = 'device123';
        $token->token = 'token456';
        $token->expiration_date = time() + (24 * 60 * 60);
        $token->used = false;
        $token->saveReturn = true;
        VerificationTokenStub::setFindOneReturn($token);

        // Call the action
        $result = $this->controller->actionCreate();

        // Verify response
        $this->assertTrue($result['success']);
        $this->assertEquals('Device created successfully', $result['message']);
        $this->assertEquals('device123', $result['data']['device_id']);
        $this->assertEquals('New Device', $result['data']['device_name']);
        $this->assertEquals('sensor', $result['data']['device_type']);
        $this->assertEquals(DevicesStub::STATUS_INACTIVE, $result['data']['status']);
        $this->assertEquals('token456', $result['data']['verification_token']);
    }

    public function testActionCreateMissingData()
    {
        if (!class_exists('app\\models\\Devices', false)) {
            class_alias('tests\\unit\\modules\\api\\controllers\\stubs\\DevicesStub', 'app\\models\\Devices');
        }

        // Set up user
        Yii::$app->set('user', new \yii\web\User(['identityClass' => MockUser::class]));
        Yii::$app->user->setIdentity(new MockUser(42, false));

        // Set up request body with missing data
        Yii::$app->request->setRawBody(json_encode([
            'device_name' => 'New Device'
            // Missing device_type
        ]));

        $result = $this->controller->actionCreate();
        $this->assertFalse($result['success']);
        $this->assertStringContainsString('Missing name or type', $result['error']);
    }

    public function testActionCreateDeviceSaveFailure()
    {
        // Set up admin user
        $mockUser = new MockUser(1, true);
        Yii::$app->user->setIdentity($mockUser);

        // Mock request with device data
        $requestData = [
            'device_name' => 'Test Device',
            'device_type' => 'sensor'
        ];
        $this->mockRequest('POST', $requestData);

        // Mock security component
        $security = $this->getMockBuilder('yii\\base\\Security')
            ->onlyMethods(['generateRandomString'])
            ->getMock();
        $security->method('generateRandomString')
            ->willReturnOnConsecutiveCalls('device123', 'token456');
        Yii::$app->set('security', $security);

        // Configure device stub to fail on save
        DevicesStub::setDefaultSaveReturn(false);
        DevicesStub::setDefaultErrors(['device_name' => ['Invalid device name']]);

        // Call the action
        $result = $this->controller->actionCreate();

        // Verify response
        $this->assertFalse($result['success']);
        $this->assertEquals('Error saving device', $result['error']);
        $this->assertEquals(500, Yii::$app->response->statusCode);
    }

    public function testActionActivateSuccess()
    {
        // Set up device stub
        $deviceId = 'TEST001';
        $device = new DevicesStub();
        $device->device_id = $deviceId;
        $device->device_name = 'Test Device';
        $device->device_type = 'sensor';
        $device->status = DevicesStub::STATUS_INACTIVE;
        $device->owner_id = 1;
        $device->saveReturn = true;
        
        // Set up both find methods
        DevicesStub::setFindOneReturn($device);
        DevicesStub::setFindByDeviceIdResult($device);
        
        // Mock GET request with device ID
        $this->mockRequest('GET', ['id' => $deviceId]);
        
        // Call the action
        $result = $this->controller->actionActivate();
        
        // Verify response
        $this->assertTrue($result['success']);
        $this->assertEquals('Device activated successfully', $result['message']);
        $this->assertEquals(DevicesStub::STATUS_ACTIVE, $result['data']['status']);
    }

    public function testActionDeactivateSuccess()
    {
        // Set up device stub
        $deviceId = 'TEST001';
        $device = new DevicesStub();
        $device->device_id = $deviceId;
        $device->device_name = 'Test Device';
        $device->device_type = 'sensor';
        $device->status = DevicesStub::STATUS_ACTIVE;
        $device->owner_id = 1;
        $device->saveReturn = true;
        
        // Set up both find methods
        DevicesStub::setFindOneReturn($device);
        DevicesStub::setFindByDeviceIdResult($device);
        
        // Mock GET request with device ID
        $this->mockRequest('GET', ['id' => $deviceId]);
        
        // Call the action
        $result = $this->controller->actionDeactivate();
        
        // Verify response
        $this->assertTrue($result['success']);
        $this->assertEquals('Device deactivated successfully', $result['message']);
        $this->assertEquals(DevicesStub::STATUS_INACTIVE, $result['data']['status']);
    }

    public function testFindDeviceSuccess()
    {
        if (!class_exists('app\\models\\Devices', false)) {
            class_alias('tests\\unit\\modules\\api\\controllers\\stubs\\DevicesStub', 'app\\models\\Devices');
        }

        // Mock device
        $device = new DevicesStub();
        $device->device_id = 'DEV001';
        DevicesStub::setFindByDeviceIdResult($device);

        $result = $this->invokeMethod($this->controller, 'findDevice', ['DEV001']);
        $this->assertInstanceOf(DevicesStub::class, $result);
        $this->assertEquals('DEV001', $result->device_id);
    }

    public function testFindDeviceNotFound()
    {
        if (!class_exists('app\\models\\Devices', false)) {
            class_alias('tests\\unit\\modules\\api\\controllers\\stubs\\DevicesStub', 'app\\models\\Devices');
        }

        DevicesStub::setFindByDeviceIdResult(null);

        $this->expectException(\yii\web\NotFoundHttpException::class);
        $this->expectExceptionMessage('Device not found');

        $this->invokeMethod($this->controller, 'findDevice', ['DEV404']);
    }

    /**
     * Helper method to invoke protected/private methods
     */
    protected function invokeMethod($object, $methodName, array $parameters = [])
    {
        $reflection = new \ReflectionClass(get_class($object));
        $method = $reflection->getMethod($methodName);
        $method->setAccessible(true);
        return $method->invokeArgs($object, $parameters);
    }

    public function testActionActivateMissingId()
    {
        // Clear request parameters
        Yii::$app->request->setQueryParams([]);
        $result = $this->controller->actionActivate();
        $this->assertFalse($result['success']);
        $this->assertEquals('Missing required parameter: id', $result['error']);
    }

    public function testActionActivateDeviceNotFound()
    {
        if (!class_exists('app\\models\\Devices', false)) {
            class_alias('tests\\unit\\modules\\api\\controllers\\stubs\\DevicesStub', 'app\\models\\Devices');
        }

        // Set up admin user
        Yii::$app->set('user', new \yii\web\User(['identityClass' => MockUser::class]));
        Yii::$app->user->setIdentity(new MockUser(1, true));

        DevicesStub::setFindOneReturn(null);
        $_GET['id'] = 'DEV404';
        $result = $this->controller->actionActivate();
        $this->assertFalse($result['success']);
        $this->assertStringContainsString('not found', $result['error']);
    }

    public function testActionLiveFaultMethodNotAllowed()
    {
        $this->expectException(\yii\web\BadRequestHttpException::class);
        $this->expectExceptionMessage('Method not allowed');
        
        // Mock request to use PUT method (not allowed)
        $request = $this->getMockBuilder(\yii\web\Request::class)
            ->onlyMethods(['getIsGet', 'getIsPost', 'getIsDelete'])
            ->getMock();
        $request->method('getIsGet')->willReturn(false);
        $request->method('getIsPost')->willReturn(false);
        $request->method('getIsDelete')->willReturn(false);
        Yii::$app->set('request', $request);

        $this->controller->actionLiveFault('DEV001');
    }

    public function testGetLiveFaultDeviceNotFound()
    {
        if (!class_exists('app\\models\\Devices', false)) {
            class_alias('tests\\unit\\modules\\api\\controllers\\stubs\\DevicesStub', 'app\\models\\Devices');
        }

        DevicesStub::setFindOneReturn(null);
        
        $this->expectException(\yii\web\NotFoundHttpException::class);
        $this->expectExceptionMessage('Device not found');

        $this->invokeMethod($this->controller, 'getLiveFault', ['DEV404']);
    }

    public function testGetLiveFaultNoActiveFault()
    {
        if (!class_exists('app\\models\\Devices', false)) {
            class_alias('tests\\unit\\modules\\api\\controllers\\stubs\\DevicesStub', 'app\\models\\Devices');
        }

        // Mock device
        $device = new DevicesStub();
        $device->device_id = 'DEV001';
        $device->status = DevicesStub::STATUS_ACTIVE;
        DevicesStub::setFindByDeviceIdResult($device);

        // Mock Faults to return null for active fault
        FaultsStub::setFindActiveByDeviceReturn(null);

        $result = $this->invokeMethod($this->controller, 'getLiveFault', ['DEV001']);
        $this->assertFalse($result['success']);
        $this->assertEquals('No active live fault found for this device', $result['message']);
        $this->assertNull($result['data']);
    }

    public function testGetLiveFaultSuccess()
    {
        if (!class_exists('app\\models\\Devices', false)) {
            class_alias('tests\\unit\\modules\\api\\controllers\\stubs\\DevicesStub', 'app\\models\\Devices');
        }
        if (!class_exists('app\\models\\Faults', false)) {
            class_alias('tests\\unit\\modules\\api\\controllers\\stubs\\FaultsStub', 'app\\models\\Faults');
        }

        // Mock device
        $device = new DevicesStub();
        $device->device_id = 'DEV001';
        $device->status = DevicesStub::STATUS_ACTIVE;
        DevicesStub::setFindByDeviceIdResult($device);

        // Mock active fault
        $fault = new FaultsStub();
        $fault->fault_id = 1;
        $fault->device_id = 'DEV001';
        $fault->status = FaultsStub::STATUS_ACTIVE;
        FaultsStub::setFindActiveByDeviceReturn($fault);
        FaultsStub::setFindOneReturn($fault);

        // Mock findDevice method
        $mockController = $this->getMockBuilder(DeviceRegisterController::class)
            ->setConstructorArgs(['device-register', Yii::$app])
            ->onlyMethods(['findDevice'])
            ->getMock();
        $mockController->method('findDevice')
            ->willReturn($device);

        $mockController->setDevicesClass(DevicesStub::class);
        $mockController->setFaultsClass(FaultsStub::class);

        $result = $this->invokeMethod($mockController, 'getLiveFault', ['DEV001']);
        $this->assertTrue($result['success']);
        $this->assertNotNull($result['data']);
        $this->assertEquals(1, $result['data']['fault_id']);
    }
} 