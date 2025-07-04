<?php
namespace tests\unit\modules\api\controllers;

use PHPUnit\Framework\TestCase;
use Yii;
use app\modules\api\controllers\ConditionsController;
use yii\web\NotFoundHttpException;
use yii\web\ForbiddenHttpException;
use yii\web\ServerErrorHttpException;

class TestCondition extends \app\models\Condition
{
    public static $findReturn = null;
    public static $findOneReturn = null;
    public static $saveReturn = true;
    public static $deleteReturn = true;
    public static $activateReturn = true;
    public static $deactivateReturn = true;
    public static function find() { return static::$findReturn; }
    public static function findOne($condition) { return static::$findOneReturn; }
    public static $statusActive = 'Active';
    const STATUS_ACTIVE = 'Active';
    const STATUS_INACTIVE = 'Inactive';
    public static function createCondition($faultId, $name, $description = null) {
        $obj = new static();
        $obj->fault_id = $faultId;
        $obj->name = $name;
        $obj->description = $description;
        $obj->status = self::STATUS_ACTIVE;
        $obj->condition_id = 'mocked';
        return $obj;
    }
    public static function instantiate($row) { return new static(); }
    public function toArray(...$params) { return ['id' => 1, 'name' => $this->name]; }
    public function save($runValidation = true, $attributeNames = null) { /*echo 'TestCondition::save called\n';*/ return static::$saveReturn; }
    public function delete() { /*echo 'TestCondition::delete called\n';*/ return static::$deleteReturn; }
    public function activateCondition() { return static::$activateReturn; }
    public function deactivateCondition() { return static::$deactivateReturn; }
}
class TestFaults extends \app\models\Faults
{
    public static $findOneReturn = null;
    public static function findOne($condition) { return static::$findOneReturn; }
}
class TestDevices extends \app\models\Devices
{
    public static $findOneReturn = null;
    public static function findOne($condition) { return static::$findOneReturn; }
}

/**
 * @covers \app\modules\api\controllers\ConditionsController
 */
class ConditionsControllerTest extends TestCase
{
    private $controller;
    private $mockUser;
    private $originalUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->originalUser = Yii::$app->get('user');
        $this->controller = new ConditionsController('conditions', null);
        $this->controller->conditionClass = TestCondition::class;
        $this->controller->faultsClass = TestFaults::class;
        $this->controller->devicesClass = TestDevices::class;
        $this->mockUser = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['isAdmin'])
            ->getMock();
        Yii::$app->set('user', (object)['identity' => $this->mockUser]);
    }

    protected function tearDown(): void
    {
        Yii::$app->set('user', $this->originalUser);
        parent::tearDown();
    }

    public function testActionTestReturnsSuccess()
    {
        $result = $this->controller->actionTest();
        $this->assertTrue($result['success']);
        $this->assertEquals('ConditionsController is working', $result['message']);
        $this->assertArrayHasKey('timestamp', $result);
    }

    public function testActionListAdminSeesAll()
    {
        $this->controller->conditionClass = TestCondition::class;
        $this->mockUser->method('isAdmin')->willReturn(true);
        $mockCondition = new TestCondition();
        $mockCondition->name = 'Test';
        $mockQuery = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['all'])
            ->getMock();
        $mockQuery->method('all')->willReturn([$mockCondition]);
        TestCondition::$findReturn = $mockQuery;
        TestCondition::$findOneReturn = $mockCondition;
        $result = $this->controller->actionList();
        $this->assertTrue($result['success']);
        $this->assertCount(1, $result['data']);
    }

    public function testActionListNonAdminSeesOwn()
    {
        $this->controller->conditionClass = TestCondition::class;
        $this->mockUser->method('isAdmin')->willReturn(false);
        $this->mockUser->id = 42;
        $mockQuery = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['innerJoinWith', 'where', 'all'])
            ->getMock();
        $mockQuery->method('innerJoinWith')->willReturnSelf();
        $mockQuery->method('where')->willReturnSelf();
        $mockQuery->method('all')->willReturn([]);
        TestCondition::$findReturn = $mockQuery;
        TestCondition::$findOneReturn = null;
        $result = $this->controller->actionList();
        $this->assertTrue($result['success']);
        $this->assertIsArray($result['data']);
    }

    public function testActionViewNotFound()
    {
        $this->controller->conditionClass = TestCondition::class;
        TestCondition::$findOneReturn = null;
        TestCondition::$findReturn = null;
        $result = $this->controller->actionView(999);
        $this->assertFalse($result['success']);
        $this->assertEquals('Condition not found', $result['error']);
    }

    public function testActionViewSuccess()
    {
        $this->controller->conditionClass = TestCondition::class;
        $this->mockUser->method('isAdmin')->willReturn(true);
        $mockCondition = new TestCondition();
        $mockCondition->name = 'Test';
        TestCondition::$findOneReturn = $mockCondition;
        TestCondition::$findReturn = $mockCondition;
        TestFaults::$findOneReturn = (object)['device_id' => 1];
        TestDevices::$findOneReturn = (object)['owner_id' => 1];
        $result = $this->controller->actionView(1);
        $this->assertTrue($result['success']);
        $this->assertEquals(['id' => 1, 'name' => 'Test'], $result['data']);
    }

    public function testActionViewForbidden()
    {
        $this->mockUser->method('isAdmin')->willReturn(false);
        $this->mockUser->id = 42;
        $mockCondition = (object)['fault_id' => 1];
        TestCondition::$findOneReturn = $mockCondition;
        TestFaults::$findOneReturn = (object)['device_id' => 2];
        TestDevices::$findOneReturn = (object)['owner_id' => 99];
        $result = $this->controller->actionView(1);
        $this->assertFalse($result['success']);
        $this->assertStringContainsString('permission', $result['error']);
    }

    public function testActionCreateSuccess()
    {
        $this->controller->conditionClass = TestCondition::class;
        $this->mockUser->method('isAdmin')->willReturn(true);
        Yii::$app->request->setBodyParams([
            'fault_id' => 1,
            'name' => 'Test Condition',
            'description' => 'desc',
        ]);
        TestFaults::$findOneReturn = (object)['type' => 'normal', 'device_id' => 1];
        TestDevices::$findOneReturn = (object)['owner_id' => 1];
        $mockCondition = new TestCondition();
        $mockCondition->name = 'Test Condition';
        $mockQuery = $this->getMockBuilder(\stdClass::class)->addMethods(['where','all'])->getMock();
        $mockQuery->method('where')->willReturnSelf();
        $mockQuery->method('all')->willReturn([]);
        TestCondition::$findReturn = $mockQuery;
        TestCondition::$findOneReturn = $mockCondition;
        TestCondition::$saveReturn = true;
        $result = $this->controller->actionCreate();
        $this->assertTrue($result['success']);
        $this->assertEquals('Condition created successfully', $result['message']);
    }

    public function testActionCreateFailure()
    {
        $this->controller->conditionClass = TestCondition::class;
        $this->mockUser->method('isAdmin')->willReturn(true);
        Yii::$app->request->setBodyParams([
            'fault_id' => 1,
            'name' => 'Test Condition',
            'description' => 'desc',
        ]);
        TestFaults::$findOneReturn = (object)['type' => 'normal', 'device_id' => 1];
        TestDevices::$findOneReturn = (object)['owner_id' => 1];
        $mockCondition = new TestCondition();
        $mockCondition->name = 'Test Condition';
        $mockQuery = $this->getMockBuilder(\stdClass::class)->addMethods(['where','all'])->getMock();
        $mockQuery->method('where')->willReturnSelf();
        $mockQuery->method('all')->willReturn([]);
        TestCondition::$findReturn = $mockQuery;
        TestCondition::$findOneReturn = $mockCondition;
        TestCondition::$saveReturn = false;
        $this->expectException(ServerErrorHttpException::class);
        $this->controller->actionCreate();
    }

    public function testActionCreateMissingFields()
    {
        $this->mockUser->method('isAdmin')->willReturn(true);
        Yii::$app->request->setBodyParams(['name' => 'Test Condition']);
        $this->expectException(ServerErrorHttpException::class);
        $this->controller->actionCreate();
    }

    public function testActionCreateForbidden()
    {
        $this->mockUser->method('isAdmin')->willReturn(false);
        $this->mockUser->id = 42;
        Yii::$app->request->setBodyParams([
            'fault_id' => 1,
            'name' => 'Test Condition',
        ]);
        TestFaults::$findOneReturn = (object)['type' => 'normal', 'device_id' => 1];
        TestDevices::$findOneReturn = (object)['owner_id' => 99];
        $this->expectException(ServerErrorHttpException::class);
        $this->controller->actionCreate();
    }

    public function testActionUpdateSuccess()
    {
        $this->mockUser->method('isAdmin')->willReturn(true);
        $mockCondition = new TestCondition();
        $mockCondition->name = 'Updated';
        TestCondition::$findOneReturn = $mockCondition;
        TestCondition::$saveReturn = true;
        TestFaults::$findOneReturn = (object)['device_id' => 1];
        TestDevices::$findOneReturn = (object)['owner_id' => 1];
        Yii::$app->request->setBodyParams(['name' => 'Updated']);
        $result = $this->controller->actionUpdate(1);
        $this->assertTrue($result['success']);
        $this->assertEquals('Condition updated successfully', $result['message']);
    }

    public function testActionUpdateNotFound()
    {
        TestCondition::$findOneReturn = null;
        $result = $this->controller->actionUpdate(999);
        $this->assertFalse($result['success']);
        $this->assertEquals('Condition not found', $result['error']);
    }

    public function testActionUpdateFailure()
    {
        $this->mockUser->method('isAdmin')->willReturn(true);
        $mockCondition = new TestCondition();
        $mockCondition->name = 'Fail';
        TestCondition::$findOneReturn = $mockCondition;
        TestCondition::$saveReturn = false;
        TestFaults::$findOneReturn = (object)['device_id' => 1];
        TestDevices::$findOneReturn = (object)['owner_id' => 1];
        Yii::$app->request->setBodyParams(['name' => 'Fail']);
        $this->expectException(ServerErrorHttpException::class);
        $this->controller->actionUpdate(1);
    }

    public function testActionDeleteSuccess()
    {
        $this->mockUser->method('isAdmin')->willReturn(true);
        $mockCondition = new TestCondition();
        TestCondition::$findOneReturn = $mockCondition;
        TestCondition::$deleteReturn = true;
        TestFaults::$findOneReturn = (object)['device_id' => 1];
        TestDevices::$findOneReturn = (object)['owner_id' => 1];
        $result = $this->controller->actionDelete(1);
        $this->assertTrue($result['success']);
        $this->assertEquals('Condition deleted successfully', $result['message']);
    }

    public function testActionDeleteNotFound()
    {
        TestCondition::$findOneReturn = null;
        $result = $this->controller->actionDelete(999);
        $this->assertFalse($result['success']);
        $this->assertEquals('Condition not found', $result['error']);
    }

    public function testActionDeleteFailure()
    {
        $this->mockUser->method('isAdmin')->willReturn(true);
        $mockCondition = new TestCondition();
        TestCondition::$findOneReturn = $mockCondition;
        TestCondition::$deleteReturn = false;
        TestFaults::$findOneReturn = (object)['device_id' => 1];
        TestDevices::$findOneReturn = (object)['owner_id' => 1];
        $this->expectException(ServerErrorHttpException::class);
        $this->controller->actionDelete(1);
    }

    public function testActionStartSuccess()
    {
        $this->mockUser->method('isAdmin')->willReturn(true);
        $mockCondition = new TestCondition();
        $mockCondition->name = 'Started';
        TestCondition::$findOneReturn = $mockCondition;
        TestCondition::$activateReturn = true;
        TestFaults::$findOneReturn = (object)['device_id' => 1];
        TestDevices::$findOneReturn = (object)['owner_id' => 1];
        $result = $this->controller->actionStart(1);
        $this->assertTrue($result['success']);
        $this->assertEquals('Condition activated successfully', $result['message']);
    }

    public function testActionStartNotFound()
    {
        TestCondition::$findOneReturn = null;
        $result = $this->controller->actionStart(999);
        $this->assertFalse($result['success']);
        $this->assertEquals('Condition not found', $result['error']);
    }

    public function testActionStartFailure()
    {
        $this->mockUser->method('isAdmin')->willReturn(true);
        $mockCondition = new TestCondition();
        TestCondition::$findOneReturn = $mockCondition;
        TestCondition::$activateReturn = false;
        TestFaults::$findOneReturn = (object)['device_id' => 1];
        TestDevices::$findOneReturn = (object)['owner_id' => 1];
        $this->expectException(ServerErrorHttpException::class);
        $this->controller->actionStart(1);
    }

    public function testActionStopSuccess()
    {
        $this->mockUser->method('isAdmin')->willReturn(true);
        $mockCondition = new TestCondition();
        $mockCondition->name = 'Stopped';
        TestCondition::$findOneReturn = $mockCondition;
        TestCondition::$deactivateReturn = true;
        TestFaults::$findOneReturn = (object)['device_id' => 1];
        TestDevices::$findOneReturn = (object)['owner_id' => 1];
        $result = $this->controller->actionStop(1);
        $this->assertTrue($result['success']);
        $this->assertEquals('Condition deactivated successfully', $result['message']);
    }

    public function testActionStopNotFound()
    {
        TestCondition::$findOneReturn = null;
        $result = $this->controller->actionStop(999);
        $this->assertFalse($result['success']);
        $this->assertEquals('Condition not found', $result['error']);
    }

    public function testActionStopFailure()
    {
        $this->mockUser->method('isAdmin')->willReturn(true);
        $mockCondition = new TestCondition();
        TestCondition::$findOneReturn = $mockCondition;
        TestCondition::$deactivateReturn = false;
        TestFaults::$findOneReturn = (object)['device_id' => 1];
        TestDevices::$findOneReturn = (object)['owner_id' => 1];
        $this->expectException(ServerErrorHttpException::class);
        $this->controller->actionStop(1);
    }

    public function testActionDataSuccess()
    {
        $this->mockUser->method('isAdmin')->willReturn(true);
        $mockCondition = new TestCondition();
        TestCondition::$findOneReturn = $mockCondition;
        TestFaults::$findOneReturn = (object)['device_id' => 1];
        TestDevices::$findOneReturn = (object)['owner_id' => 1];
        Yii::$app->request->setBodyParams(['measurements' => [1,2,3]]);
        $result = $this->controller->actionData(1);
        $this->assertTrue($result['success']);
        $this->assertEquals(3, $result['total_count']);
    }

    public function testActionDataNotFound()
    {
        TestCondition::$findOneReturn = null;
        $result = $this->controller->actionData(999);
        $this->assertFalse($result['success']);
        $this->assertEquals('Condition not found', $result['error']);
    }

    public function testActionDataMissingMeasurements()
    {
        $this->mockUser->method('isAdmin')->willReturn(true);
        $mockCondition = new TestCondition();
        TestCondition::$findOneReturn = $mockCondition;
        TestFaults::$findOneReturn = (object)['device_id' => 1];
        TestDevices::$findOneReturn = (object)['owner_id' => 1];
        Yii::$app->request->setBodyParams([]);
        $this->expectException(ServerErrorHttpException::class);
        $this->controller->actionData(1);
    }
} 