<?php

namespace tests\unit\modules\api\controllers\stubs;

use yii\base\BaseObject;

class VerificationTokenStub extends BaseObject
{
    private static $findOneReturn = null;
    private static $nextInstance = null;
    private static $defaultSaveReturn = true;
    private static $defaultErrors = [];
    
    public $token = 'token';
    public $used = false;
    public $saveReturn = true;
    public $deleteReturn = true;
    public $expiration_date = null;
    public $created_at = null;
    public $updated_at = null;
    public $device_id = null;
    public $errors = [];
    public $id = 1;

    public static function setFindOneReturn($value) { self::$findOneReturn = $value; }
    public static function getFindOneReturn() { return self::$findOneReturn; }
    public static function setNextInstance($instance)
    {
        self::$nextInstance = $instance;
    }
    public static function getNextInstance() { return self::$nextInstance; }
    
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

    public function __construct()
    {
        if (self::$nextInstance !== null) {
            $instance = self::$nextInstance;
            self::$nextInstance = null;
            foreach (get_object_vars($instance) as $property => $value) {
                $this->$property = $value;
            }
        }
    }

    public static function findOne($cond)
    {
        return self::$findOneReturn;
    }

    public static function createNew($config = [])
    {
        if (self::$nextInstance !== null) {
            $instance = self::$nextInstance;
            self::$nextInstance = null;
            return $instance;
        }
        return new static($config);
    }

    public function save($runValidation = true, $attributeNames = null)
    {
        // If there are instance errors, save should fail
        if (!empty($this->errors)) {
            return false;
        }
        
        // If saveReturn is explicitly set, use that
        if (isset($this->saveReturn)) {
            return $this->saveReturn;
        }
        
        // If there are default errors, save should fail
        if (!empty(self::$defaultErrors)) {
            $this->errors = self::$defaultErrors;
            return false;
        }
        
        // Use default save return if set
        if (isset(self::$defaultSaveReturn)) {
            return self::$defaultSaveReturn;
        }
        
        // Default to success
        return true;
    }

    public function delete()
    {
        return $this->deleteReturn;
    }

    public function validate($attributeNames = null, $clearErrors = true)
    {
        if ($clearErrors) {
            $this->errors = [];
        }

        // Basic validation rules
        if (empty($this->token)) {
            $this->addError('token', 'Token cannot be blank');
            return false;
        }

        if (empty($this->device_id)) {
            $this->addError('device_id', 'Device ID cannot be blank');
            return false;
        }

        if (empty($this->expiration_date)) {
            $this->addError('expiration_date', 'Expiration date cannot be blank');
            return false;
        }

        if (!$this->saveReturn) {
            $this->addError('token', 'Failed to save token');
            return false;
        }

        return empty($this->errors);
    }

    public function init()
    {
        parent::init();
        foreach ($this->attributes() as $attribute) {
            if (isset($this->$attribute)) {
                $this->$attribute = $this->$attribute;
            }
        }
    }

    public function attributes()
    {
        return [
            'id',
            'token',
            'used',
            'saveReturn',
            'deleteReturn',
            'expiration_date',
            'created_at',
            'updated_at',
            'device_id',
            'errors',
        ];
    }

    public function __get($name)
    {
        if (isset($this->$name)) {
            return $this->$name;
        }
        return null;
    }

    public function __set($name, $value)
    {
        $this->$name = $value;
    }

    public function addError($attribute, $error)
    {
        if (!isset($this->errors[$attribute])) {
            $this->errors[$attribute] = [];
        }
        $this->errors[$attribute][] = $error;
    }

    public function getErrors($attribute = null)
    {
        $errors = !empty($this->errors) ? $this->errors : self::$defaultErrors;
        return $attribute === null ? $errors : (isset($errors[$attribute]) ? $errors[$attribute] : []);
    }

    public function hasErrors($attribute = null)
    {
        if ($attribute === null) {
            return !empty($this->errors);
        }
        return isset($this->errors[$attribute]);
    }

    public function getAttributes($names = null, $except = [])
    {
        return [
            'token' => $this->token,
            'device_id' => $this->device_id,
            'expiration_date' => $this->expiration_date,
            'used' => $this->used,
            'created_at' => $this->created_at,
            'updated_at' => $this->updated_at
        ];
    }
} 