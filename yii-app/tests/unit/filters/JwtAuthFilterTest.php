<?php
namespace tests\unit\filters;

use Yii;
use PHPUnit\Framework\TestCase;
use yii\web\UnauthorizedHttpException;
use yii\web\ForbiddenHttpException;
use app\filters\JwtAuthFilter;

class TestUser {
    public $role;
    public static $findByTokenReturn = null;
    public static function findIdentityByAccessToken($token) {
        return static::$findByTokenReturn;
    }
}

/**
 * @covers \app\filters\JwtAuthFilter
 */
class JwtAuthFilterTest extends TestCase
{
    private $originalRequest;
    private $originalUser;

    protected function setUp(): void
    {
        parent::setUp();
        $this->originalRequest = Yii::$app->get('request');
        $this->originalUser = Yii::$app->get('user');
        // Mock Yii::$app->request and headers
        $mockHeaders = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['get'])
            ->getMock();
        Yii::$app->set('request', (object)[
            'headers' => $mockHeaders
        ]);
    }

    protected function tearDown(): void
    {
        Yii::$app->set('request', $this->originalRequest);
        Yii::$app->set('user', $this->originalUser);
        parent::tearDown();
    }

    public function testExceptedActionSkipsAuth()
    {
        $filter = new JwtAuthFilter();
        $filter->except = ['test'];
        $action = (object)['id' => 'test'];
        $this->assertTrue($filter->beforeAction($action));
    }

    public function testMissingTokenThrowsUnauthorized()
    {
        $this->expectException(UnauthorizedHttpException::class);
        $filter = new JwtAuthFilter();
        $filter->throwException = true;
        $action = (object)['id' => 'not-excepted'];
        Yii::$app->request->headers->method('get')->willReturn(null);
        $filter->beforeAction($action);
    }

    public function testInvalidTokenThrowsUnauthorized()
    {
        $this->expectException(UnauthorizedHttpException::class);
        $filter = new JwtAuthFilter();
        $filter->throwException = true;
        $filter->userClass = TestUser::class;
        $action = (object)['id' => 'not-excepted'];
        Yii::$app->request->headers->method('get')->willReturn('Bearer invalidtoken');
        TestUser::$findByTokenReturn = null;
        $filter->beforeAction($action);
    }

    public function testValidTokenSetsUser()
    {
        $filter = new JwtAuthFilter();
        $filter->throwException = true;
        $filter->userClass = TestUser::class;
        $action = (object)['id' => 'not-excepted'];
        Yii::$app->request->headers->method('get')->willReturn('Bearer validtoken');
        $mockUser = new TestUser();
        $mockUser->role = 'user';
        TestUser::$findByTokenReturn = $mockUser;
        $mockUserComponent = $this->getMockBuilder(\stdClass::class)
            ->addMethods(['setIdentity'])
            ->getMock();
        $mockUserComponent->expects($this->once())->method('setIdentity')->with($mockUser);
        Yii::$app->set('user', $mockUserComponent);
        $this->assertTrue($filter->beforeAction($action));
    }

    public function testRoleCheckThrowsForbidden()
    {
        $this->expectException(ForbiddenHttpException::class);
        $filter = new JwtAuthFilter();
        $filter->throwException = true;
        $filter->roles = ['restricted' => ['admin']];
        $filter->userClass = TestUser::class;
        $action = (object)['id' => 'restricted'];
        Yii::$app->request->headers->method('get')->willReturn('Bearer validtoken');
        $mockUser = new TestUser();
        $mockUser->role = 'user';
        TestUser::$findByTokenReturn = $mockUser;
        Yii::$app->set('user', $this->getMockBuilder(\stdClass::class)->addMethods(['setIdentity'])->getMock());
        $filter->beforeAction($action);
    }
} 