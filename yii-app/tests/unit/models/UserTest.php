<?php
namespace tests\unit\models;

use PHPUnit\Framework\TestCase;
use app\models\User;

/**
 * @covers \app\models\User
 */
class UserTest extends TestCase
{
    public function testCanBeInstantiated()
    {
        $user = new User();
        $this->assertInstanceOf(User::class, $user);
    }
} 