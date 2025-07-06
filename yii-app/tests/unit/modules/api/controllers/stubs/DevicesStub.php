<?php
namespace tests\unit\modules\api\controllers\stubs;

class DevicesStub extends \yii\base\BaseObject
{
    private static $findByDeviceIdResult = null;
    private static $findOneReturn = null;
    private static $findReturn = null;
    private static $findByOwnerReturn = null;
    private static $defaultSaveReturn = true;
    private static $defaultErrors = [];

    public $device_id;
    public $device_name;
    public $device_type;
    public $owner_id;
    public $status;
    public $registration_date;
    public $last_updated;
    public $updated_at;
    public $created_at;
    public $errors = [];
    public $saveReturn = true;
    public $attributes = [];

    const STATUS_ACTIVE = 'active';
    const STATUS_INACTIVE = 'inactive';

    public function init()
    {
        parent::init();
        $this->attributes = $this->getAttributes();
    }

    public static function setFindByDeviceIdResult($value)
    {
        self::$findByDeviceIdResult = $value;
    }

    public static function setFindOneReturn($value)
    {
        self::$findOneReturn = $value;
    }

    public static function setFindReturn($value)
    {
        self::$findReturn = $value;
    }

    public static function setFindByOwnerReturn($value)
    {
        self::$findByOwnerReturn = $value;
    }

    public static function setDefaultSaveReturn($value)
    {
        self::$defaultSaveReturn = $value;
    }

    public static function setDefaultErrors($errors)
    {
        self::$defaultErrors = $errors;
        if ($errors) {
            self::$defaultSaveReturn = false;
        }
    }

    public static function findByDeviceId($deviceId)
    {
        return self::$findByDeviceIdResult;
    }

    public static function findByOwner($ownerId)
    {
        return self::$findByOwnerReturn;
    }

    public static function findOne($condition)
    {
        if (is_array($condition) && isset($condition['device_id'])) {
            return self::$findByDeviceIdResult;
        }
        return self::$findOneReturn;
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
                    return $this->modelClass::$findByDeviceIdResult;
                }
                return null;
            }
            
            public function all()
            {
                return [];
            }
        };
    }

    public function save($runValidation = true, $attributeNames = null)
    {
        // Use instance saveReturn if set, otherwise fall back to static default
        $shouldSave = isset($this->saveReturn) ? $this->saveReturn : self::$defaultSaveReturn;
        
        // If there are instance errors or default errors and no instance errors set, save should fail
        if (!empty($this->errors) || (empty($this->errors) && !empty(self::$defaultErrors))) {
            $this->errors = !empty($this->errors) ? $this->errors : self::$defaultErrors;
            return false;
        }
        
        return $shouldSave;
    }

    public function delete()
    {
        // If there are errors, deletion should fail
        if (!empty($this->errors)) {
            return false;
        }
        // If saveReturn is explicitly set to false, deletion should fail
        if (isset($this->saveReturn) && $this->saveReturn === false) {
            return false;
        }
        // If deleteReturn is explicitly set, use that
        if (isset($this->deleteReturn)) {
            return $this->deleteReturn;
        }
        return true;
    }

    public function getErrors($attribute = null)
    {
        $errors = !empty($this->errors) ? $this->errors : self::$defaultErrors;
        return $attribute === null ? $errors : (isset($errors[$attribute]) ? $errors[$attribute] : []);
    }

    public function getAttributes($names = null, $except = [])
    {
        $attributes = [
            'device_id' => $this->device_id,
            'device_name' => $this->device_name,
            'device_type' => $this->device_type,
            'owner_id' => $this->owner_id,
            'status' => $this->status,
            'registration_date' => $this->registration_date,
            'last_updated' => $this->last_updated,
            'updated_at' => $this->updated_at,
            'created_at' => $this->created_at
        ];

        if ($names !== null) {
            $attributes = array_intersect_key($attributes, array_flip($names));
        }

        if ($except) {
            $attributes = array_diff_key($attributes, array_flip($except));
        }

        return $attributes;
    }

    public function __get($name)
    {
        if (property_exists($this, $name)) {
            return $this->$name;
        }
        return null;
    }

    public function __set($name, $value)
    {
        if (property_exists($this, $name)) {
            $this->$name = $value;
            if ($name !== 'attributes') {
                $this->attributes = $this->getAttributes();
            }
        }
    }

    public function load($data, $formName = null)
    {
        if ($formName === null) {
            foreach ($data as $name => $value) {
                if (property_exists($this, $name)) {
                    $this->$name = $value;
                }
            }
        } elseif (isset($data[$formName])) {
            foreach ($data[$formName] as $name => $value) {
                if (property_exists($this, $name)) {
                    $this->$name = $value;
                }
            }
        }
        $this->attributes = $this->getAttributes();
        return true;
    }
} 