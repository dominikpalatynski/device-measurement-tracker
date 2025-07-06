<?php
namespace tests\unit\modules\api\controllers\stubs;

class ConditionStub extends \yii\base\BaseObject
{
    public static $findReturn = null;
    public static $findOneReturn = null;
    public $condition_id;
    public $name;
    public $description;
    public $status;
    public $fault_id;
    public $start_time;
    public $end_time;
    public $duration = 3600;

    const STATUS_ACTIVE = 'active';
    const STATUS_INACTIVE = 'inactive';

    public static function find()
    {
        return self::$findReturn;
    }

    public static function findOne($condition)
    {
        return self::$findOneReturn;
    }

    public static function setFindReturn($value)
    {
        self::$findReturn = $value;
    }

    public static function setFindOneReturn($value)
    {
        self::$findOneReturn = $value;
    }

    public function getDuration()
    {
        return $this->duration;
    }
} 