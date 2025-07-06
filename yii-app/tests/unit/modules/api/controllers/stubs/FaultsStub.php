<?php
namespace tests\unit\modules\api\controllers\stubs;

class FaultsStub extends \yii\base\BaseObject
{
    private static $findActiveByDeviceReturn = null;
    private static $findOneReturn = null;
    public static $findAllReturn = [];
    public $fault_id;
    public $device_id;
    public $start_time;
    public $end_time;
    public $status;
    public $duration = 3600;
    public $errors = [];

    const STATUS_ACTIVE = 'active';
    const STATUS_INACTIVE = 'inactive';

    public static function setFindActiveByDeviceReturn($value)
    {
        self::$findActiveByDeviceReturn = $value;
    }

    public static function setFindOneReturn($value)
    {
        self::$findOneReturn = $value;
    }

    public static function findOne($condition)
    {
        if (isset($condition['device_id']) && isset($condition['status'])) {
            if ($condition['status'] === self::STATUS_ACTIVE) {
                return self::$findActiveByDeviceReturn;
            }
        }
        return self::$findOneReturn;
    }

    public function getDuration()
    {
        return $this->duration;
    }

    public function save($runValidation = true, $attributeNames = null)
    {
        if (!empty($this->errors)) {
            return false;
        }
        return true;
    }

    public function getErrors($attribute = null)
    {
        return $attribute === null ? $this->errors : (isset($this->errors[$attribute]) ? $this->errors[$attribute] : []);
    }

    public function getAttributes($names = null, $except = [])
    {
        return [
            'fault_id' => $this->fault_id,
            'device_id' => $this->device_id,
            'start_time' => $this->start_time,
            'end_time' => $this->end_time,
            'status' => $this->status,
            'duration' => $this->duration
        ];
    }

    public static function find()
    {
        return new class(get_called_class()) {
            private $modelClass;
            private $whereCondition;
            
            public function __construct($modelClass)
            {
                $this->modelClass = $modelClass;
            }
            
            public function where($condition)
            {
                $this->whereCondition = $condition;
                return $this;
            }
            
            public function one()
            {
                if ($this->whereCondition && isset($this->whereCondition['device_id'])) {
                    return $this->modelClass::$findOneReturn;
                }
                return null;
            }
            
            public function all()
            {
                return $this->modelClass::$findAllReturn;
            }
            
            public function andWhere($condition)
            {
                return $this;
            }
        };
    }

    public static function tableName()
    {
        return 'faults';
    }
} 