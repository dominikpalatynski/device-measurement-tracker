<?php
namespace tests\unit\models;

use PHPUnit\Framework\TestCase;
use app\models\Condition;

/**
 * @covers \app\models\Condition
 */
class ConditionTest extends TestCase
{
    public function testCanBeInstantiated()
    {
        $condition = new Condition();
        $this->assertInstanceOf(Condition::class, $condition);
    }
} 