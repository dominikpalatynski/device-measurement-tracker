<?php
namespace tests\unit\models;

use PHPUnit\Framework\TestCase;
use app\models\Faults;

/**
 * @covers \app\models\Faults
 */
class FaultsTest extends TestCase
{
    public function testCanBeInstantiated()
    {
        $fault = new Faults();
        $this->assertInstanceOf(Faults::class, $fault);
    }
} 