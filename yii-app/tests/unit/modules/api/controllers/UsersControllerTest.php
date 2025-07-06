<?php

namespace tests\unit\modules\api\controllers;

use Yii;
use app\modules\api\controllers\UsersController;
use app\models\User;
use app\models\UserForm;
use PHPUnit\Framework\TestCase;
use yii\web\Response;
use yii\data\ActiveDataProvider;
use yii\web\NotFoundHttpException;
use yii\web\BadRequestHttpException;
use yii\helpers\Json;
use yii\web\Request;
use tests\unit\modules\api\controllers\stubs\UserStub;
use yii\db\Connection;
use yii\db\Schema;
use yii\db\Query;

class UsersControllerTest extends TestCase
{
    private $controller;
    private $mockRequest;
    private $mockResponse;
    private $mockDb;
    private $mockSchema;

    protected function setUp(): void
    {
        parent::setUp();

        // Create mock schema
        $this->mockSchema = $this->getMockBuilder(Schema::class)
            ->disableOriginalConstructor()
            ->getMock();
        $this->mockSchema->method('getTableSchema')
            ->willReturn(new \yii\db\TableSchema([
                'columns' => [
                    'id' => new \yii\db\ColumnSchema(['name' => 'id', 'type' => 'integer']),
                    'username' => new \yii\db\ColumnSchema(['name' => 'username', 'type' => 'string']),
                    'email' => new \yii\db\ColumnSchema(['name' => 'email', 'type' => 'string']),
                    'first_name' => new \yii\db\ColumnSchema(['name' => 'first_name', 'type' => 'string']),
                    'last_name' => new \yii\db\ColumnSchema(['name' => 'last_name', 'type' => 'string']),
                    'role' => new \yii\db\ColumnSchema(['name' => 'role', 'type' => 'string']),
                    'status' => new \yii\db\ColumnSchema(['name' => 'status', 'type' => 'string']),
                ],
                'primaryKey' => ['id']
            ]));

        // Create mock database connection
        $this->mockDb = $this->getMockBuilder(Connection::class)
            ->disableOriginalConstructor()
            ->getMock();
        $this->mockDb->method('getSchema')->willReturn($this->mockSchema);
        $this->mockDb->method('createCommand')->willReturn(
            $this->getMockBuilder(\yii\db\Command::class)
                ->disableOriginalConstructor()
                ->getMock()
        );

        // Create a mock application if it doesn't exist
        if (Yii::$app === null) {
            new \yii\web\Application([
                'id' => 'testapp',
                'basePath' => dirname(dirname(dirname(dirname(dirname(__DIR__))))),
                'components' => [
                    'request' => [
                        'class' => 'yii\web\Request',
                        'enableCsrfValidation' => false,
                    ],
                    'response' => [
                        'class' => 'yii\web\Response',
                    ],
                    'db' => $this->mockDb,
                ],
            ]);
        } else {
            Yii::$app->set('db', $this->mockDb);
        }

        // Mock request
        $this->mockRequest = $this->getMockBuilder(Request::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['getRawBody', 'get'])
            ->getMock();

        // Mock response
        $this->mockResponse = $this->getMockBuilder(Response::class)
            ->disableOriginalConstructor()
            ->getMock();
        $this->mockResponse->format = Response::FORMAT_JSON;

        // Set up application components
        Yii::$app->set('request', $this->mockRequest);
        Yii::$app->set('response', $this->mockResponse);

        // Create controller instance
        $this->controller = new UsersController('users', Yii::$app);

        // Reset UserStub static properties
        UserStub::setFindOneReturn(null);
        UserStub::setFindReturn(null);
        UserStub::setDefaultSaveReturn(true);
        UserStub::setDefaultErrors([]);
        UserStub::clearUniqueValues();

        // Replace User class with UserStub
        Yii::$container->set(User::class, UserStub::class);
    }

    protected function tearDown(): void
    {
        parent::tearDown();
        if (Yii::$app && Yii::$app->has('db')) {
            Yii::$app->db->close();
        }
        Yii::$app->set('request', null);
        Yii::$app->set('response', null);
        Yii::$container = new \yii\di\Container();
    }

    private function createTestUser($id = 1): UserStub
    {
        $user = new UserStub();
        $user->id = $id;
        $user->username = "testuser{$id}";
        $user->email = "test{$id}@example.com";
        $user->first_name = "Test{$id}";
        $user->last_name = "User{$id}";
        $user->role = User::ROLE_NORMAL;
        $user->status = User::STATUS_ACTIVE;
        $user->created_at = date('Y-m-d H:i:s');
        $user->updated_at = date('Y-m-d H:i:s');
        return $user;
    }

    private function createMockQuery($returnData, $count = null)
    {
        $mockQuery = $this->getMockBuilder(\yii\db\Query::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['all', 'where', 'andWhere', 'createCommand', 'count', 'one', 'from', 'orderBy', 'offset', 'limit'])
            ->getMock();

        $mockQuery->expects($this->any())
            ->method('all')
            ->willReturn($returnData);

        $mockQuery->expects($this->any())
            ->method('where')
            ->willReturnSelf();

        $mockQuery->expects($this->any())
            ->method('andWhere')
            ->willReturnSelf();

        $mockQuery->expects($this->any())
            ->method('from')
            ->willReturnSelf();

        $mockQuery->expects($this->any())
            ->method('orderBy')
            ->willReturnSelf();

        $mockQuery->expects($this->any())
            ->method('offset')
            ->willReturnSelf();

        $mockQuery->expects($this->any())
            ->method('limit')
            ->willReturnSelf();

        $mockQuery->expects($this->any())
            ->method('count')
            ->willReturn($count ?? count($returnData));

        $mockQuery->expects($this->any())
            ->method('one')
            ->willReturn($returnData[0] ?? null);

        $mockCommand = $this->getMockBuilder(\yii\db\Command::class)
            ->disableOriginalConstructor()
            ->onlyMethods(['queryAll', 'queryOne', 'execute'])
            ->getMock();

        $mockCommand->expects($this->any())
            ->method('queryAll')
            ->willReturn($returnData);

        $mockCommand->expects($this->any())
            ->method('queryOne')
            ->willReturn($returnData[0] ?? null);

        $mockCommand->expects($this->any())
            ->method('execute')
            ->willReturn(1);

        $mockQuery->expects($this->any())
            ->method('createCommand')
            ->willReturn($mockCommand);

        return $mockQuery;
    }

    public function testActionIndexWithNoFilters()
    {
        // Mock request parameters
        $this->mockRequest->expects($this->any())
            ->method('get')
            ->willReturnMap([
                ['role', null],
                ['status', null],
                ['search', null],
                ['per_page', 20],
                ['page', 1]
            ]);

        // Set up test users
        $users = [
            $this->createTestUser(1),
            $this->createTestUser(2)
        ];

        // Set up mock query
        UserStub::setFindReturn($this->createMockQuery($users));

        // Execute the action
        $result = $this->controller->actionIndex();

        // Verify response structure
        $this->assertTrue($result['success']);
        $this->assertCount(2, $result['data']);
        $this->assertEquals([
            'current_page' => 1,
            'per_page' => 20,
            'total_count' => 2,
            'page_count' => 1
        ], $result['pagination']);

        // Verify user data
        $this->assertEquals('testuser1', $result['data'][0]['username']);
        $this->assertEquals('testuser2', $result['data'][1]['username']);
    }

    public function testActionIndexWithFilters()
    {
        // Mock request parameters with filters
        $this->mockRequest->expects($this->any())
            ->method('get')
            ->willReturnMap([
                ['role', User::ROLE_ADMIN],
                ['status', User::STATUS_ACTIVE],
                ['search', 'admin'],
                ['per_page', 10],
                ['page', 1]
            ]);

        // Set up test user
        $adminUser = $this->createTestUser(1);
        $adminUser->role = User::ROLE_ADMIN;

        // Set up mock query
        UserStub::setFindReturn($this->createMockQuery([$adminUser]));

        // Execute the action
        $result = $this->controller->actionIndex();

        // Verify response
        $this->assertTrue($result['success']);
        $this->assertCount(1, $result['data']);
        $this->assertEquals(User::ROLE_ADMIN, $result['data'][0]['role']);
    }

    public function testActionView()
    {
        $userId = 1;
        $user = $this->createTestUser($userId);
        UserStub::setFindOneReturn($user);

        $result = $this->controller->actionView($userId);

        $this->assertTrue($result['success']);
        $this->assertEquals($userId, $result['data']['id']);
        $this->assertEquals('testuser1', $result['data']['username']);
        $this->assertEquals('test1@example.com', $result['data']['email']);
    }

    public function testActionViewNotFound()
    {
        $userId = 999;
        UserStub::setFindOneReturn(null);

        $this->expectException(NotFoundHttpException::class);
        $this->expectExceptionMessage('User not found');

        $this->controller->actionView($userId);
    }

    public function testActionCreate()
    {
        $userData = [
            'username' => 'newuser',
            'email' => 'newuser@example.com',
            'password' => 'password123',
            'first_name' => 'New',
            'last_name' => 'User',
            'role' => User::ROLE_NORMAL
        ];

        // Mock request raw body
        $this->mockRequest->expects($this->once())
            ->method('getRawBody')
            ->willReturn(Json::encode($userData));

        // Set up new user
        $newUser = new UserStub();
        $newUser->load($userData, '');
        $newUser->id = 3;
        UserStub::setFindOneReturn($newUser);
        UserStub::setDefaultSaveReturn(true);

        // Execute action
        $result = $this->controller->actionCreate();

        // Verify response
        $this->assertTrue($result['success']);
        $this->assertEquals('User created successfully.', $result['message']);
        $this->assertEquals('newuser', $result['data']['username']);
    }

    public function testActionCreateValidationError()
    {
        $userData = [
            'username' => 'newuser',
            // Missing required fields
        ];

        // Mock request raw body
        $this->mockRequest->expects($this->once())
            ->method('getRawBody')
            ->willReturn(Json::encode($userData));

        // Set up validation errors
        UserStub::setDefaultErrors([
            'email' => ['Email cannot be blank.'],
            'password' => ['Password cannot be blank.']
        ]);

        // Execute action and expect exception
        $this->expectException(BadRequestHttpException::class);
        $this->controller->actionCreate();
    }

    public function testActionUpdate()
    {
        $userId = 1;
        $userData = [
            'first_name' => 'Updated',
            'last_name' => 'Name',
            'email' => 'updated@example.com'
        ];

        // Mock request raw body
        $this->mockRequest->expects($this->once())
            ->method('getRawBody')
            ->willReturn(Json::encode($userData));

        // Set up existing user
        $existingUser = $this->createTestUser($userId);
        UserStub::setFindOneReturn($existingUser);

        // Execute action
        $result = $this->controller->actionUpdate($userId);

        // Verify response
        $this->assertTrue($result['success']);
        $this->assertEquals('User updated successfully.', $result['message']);
        $this->assertEquals('updated@example.com', $result['data']['email']);
    }

    public function testActionUpdateNotFound()
    {
        $userId = 999;
        UserStub::setFindOneReturn(null);

        $this->expectException(NotFoundHttpException::class);
        $this->expectExceptionMessage('User not found');

        $this->controller->actionUpdate($userId);
    }

    public function testActionDelete()
    {
        $userId = 1;
        $user = $this->createTestUser($userId);
        UserStub::setFindOneReturn($user);

        $result = $this->controller->actionDelete($userId);

        $this->assertTrue($result['success']);
        $this->assertEquals('User deleted successfully.', $result['message']);
        $this->assertEquals(User::STATUS_DELETED, $user->status);
    }

    public function testActionDeleteNotFound()
    {
        $userId = 999;
        UserStub::setFindOneReturn(null);

        $this->expectException(NotFoundHttpException::class);
        $this->expectExceptionMessage('User not found');

        $this->controller->actionDelete($userId);
    }

    public function testActionActivate()
    {
        $userId = 1;
        $user = $this->createTestUser($userId);
        $user->status = User::STATUS_INACTIVE;
        UserStub::setFindOneReturn($user);

        $result = $this->controller->actionActivate($userId);

        $this->assertTrue($result['success']);
        $this->assertEquals('User activated successfully.', $result['message']);
        $this->assertEquals(User::STATUS_ACTIVE, $user->status);
    }

    public function testActionActivateAlreadyActive()
    {
        $userId = 1;
        $user = $this->createTestUser($userId);
        $user->status = User::STATUS_ACTIVE;
        UserStub::setFindOneReturn($user);

        $this->expectException(BadRequestHttpException::class);
        $this->expectExceptionMessage('User is already active');

        $this->controller->actionActivate($userId);
    }

    public function testActionDeactivate()
    {
        $userId = 1;
        $user = $this->createTestUser($userId);
        UserStub::setFindOneReturn($user);

        $result = $this->controller->actionDeactivate($userId);

        $this->assertTrue($result['success']);
        $this->assertEquals('User deactivated successfully.', $result['message']);
        $this->assertEquals(User::STATUS_INACTIVE, $user->status);
    }

    public function testActionDeactivateAlreadyInactive()
    {
        $userId = 1;
        $user = $this->createTestUser($userId);
        $user->status = User::STATUS_INACTIVE;
        UserStub::setFindOneReturn($user);

        $this->expectException(BadRequestHttpException::class);
        $this->expectExceptionMessage('User is already inactive');

        $this->controller->actionDeactivate($userId);
    }

    private function setUniqueConstraint($user)
    {
        UserStub::setUniqueValue('username', $user->username);
        UserStub::setUniqueValue('email', $user->email);
    }
}