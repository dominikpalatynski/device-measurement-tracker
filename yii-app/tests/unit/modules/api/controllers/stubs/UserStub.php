<?php
namespace tests\unit\modules\api\controllers\stubs;

use yii\db\ActiveRecord;
use yii\db\ActiveQuery;
use yii\db\Connection;

class UserStub extends ActiveRecord
{
    private static $findOneReturn;
    private static $findReturn;
    private static $defaultSaveReturn = true;
    private static $defaultErrors = [];
    private static $uniqueValues = [];

    public $id;
    public $username;
    public $email;
    public $first_name;
    public $last_name;
    public $role;
    public $status;
    public $password;
    public $created_at;
    public $updated_at;

    const ROLE_ADMIN = 'admin';
    const ROLE_NORMAL = 'normal';
    const STATUS_ACTIVE = 'active';
    const STATUS_INACTIVE = 'inactive';
    const STATUS_DELETED = 'deleted';

    public static function tableName()
    {
        return 'users';
    }

    public static function primaryKey()
    {
        return ['id'];
    }

    public static function setFindOneReturn($value)
    {
        self::$findOneReturn = $value;
    }

    public static function setFindReturn($value)
    {
        self::$findReturn = $value;
    }

    public static function setDefaultSaveReturn($value)
    {
        self::$defaultSaveReturn = $value;
    }

    public static function setDefaultErrors($value)
    {
        self::$defaultErrors = $value;
    }

    public static function findOne($condition)
    {
        return self::$findOneReturn;
    }

    public static function find()
    {
        return self::$findReturn;
    }

    public function save($runValidation = true, $attributeNames = null)
    {
        if ($runValidation && !$this->validate($attributeNames)) {
            return false;
        }

        if (!empty(self::$defaultErrors)) {
            foreach (self::$defaultErrors as $attribute => $errors) {
                $this->addErrors([$attribute => $errors]);
            }
            return false;
        }

        // Set timestamps
        if ($this->isNewRecord) {
            $this->created_at = date('Y-m-d H:i:s');
        }
        $this->updated_at = date('Y-m-d H:i:s');

        return self::$defaultSaveReturn;
    }

    public function load($data, $formName = null)
    {
        if (is_array($data)) {
            foreach ($data as $key => $value) {
                if (property_exists($this, $key)) {
                    $this->$key = $value;
                }
            }
            return true;
        }
        return false;
    }

    public function rules()
    {
        return [
            [['username', 'email', 'first_name', 'last_name', 'role'], 'required'],
            [['username', 'email'], 'string', 'max' => 255],
            [['first_name', 'last_name'], 'string', 'max' => 100],
            ['role', 'in', 'range' => [self::ROLE_ADMIN, self::ROLE_NORMAL]],
            ['status', 'in', 'range' => [self::STATUS_ACTIVE, self::STATUS_INACTIVE, self::STATUS_DELETED]],
            ['email', 'email'],
            ['username', 'unique'],
            ['email', 'unique'],
        ];
    }

    public function fields()
    {
        return [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'role',
            'status',
            'created_at',
            'updated_at',
        ];
    }

    public static function setUniqueValue($attribute, $value)
    {
        self::$uniqueValues[$attribute][] = $value;
    }

    public static function clearUniqueValues()
    {
        self::$uniqueValues = [];
    }

    private function validateUnique($attribute)
    {
        if (!isset(self::$uniqueValues[$attribute])) {
            return true;
        }

        if (in_array($this->$attribute, self::$uniqueValues[$attribute])) {
            $this->addError($attribute, ucfirst($attribute) . ' has already been taken.');
            return false;
        }

        return true;
    }

    public function validate($attributeNames = null, $clearErrors = true)
    {
        if (!empty(self::$defaultErrors)) {
            foreach (self::$defaultErrors as $attribute => $errors) {
                $this->addErrors([$attribute => $errors]);
            }
            return false;
        }

        if ($clearErrors) {
            $this->clearErrors();
        }

        $valid = true;
        if ($attributeNames === null) {
            $attributeNames = $this->attributes();
        }

        // Convert to array if string
        $attributeNames = is_string($attributeNames) ? [$attributeNames] : $attributeNames;

        foreach ($this->rules() as $rule) {
            $attributes = $rule[0];
            $validator = $rule[1];
            
            if (!is_array($attributes)) {
                $attributes = [$attributes];
            }

            foreach ($attributes as $attribute) {
                if (!in_array($attribute, $attributeNames)) {
                    continue;
                }

                // Required validation
                if ($validator === 'required' && empty($this->$attribute)) {
                    $this->addError($attribute, ucfirst($attribute) . ' cannot be blank.');
                    $valid = false;
                }

                // String length validation
                if ($validator === 'string' && isset($rule['max']) && strlen($this->$attribute) > $rule['max']) {
                    $this->addError($attribute, ucfirst($attribute) . ' is too long (maximum is ' . $rule['max'] . ' characters).');
                    $valid = false;
                }

                // Email validation
                if ($validator === 'email' && !filter_var($this->$attribute, FILTER_VALIDATE_EMAIL)) {
                    $this->addError($attribute, ucfirst($attribute) . ' is not a valid email address.');
                    $valid = false;
                }

                // Range validation
                if ($validator === 'in' && isset($rule['range']) && !in_array($this->$attribute, $rule['range'])) {
                    $this->addError($attribute, ucfirst($attribute) . ' is invalid.');
                    $valid = false;
                }

                // Unique validation
                if ($validator === 'unique' && !$this->validateUnique($attribute)) {
                    $valid = false;
                }
            }
        }

        return $valid;
    }

    public function attributes()
    {
        return [
            'id',
            'username',
            'email',
            'first_name',
            'last_name',
            'role',
            'status',
            'password',
            'created_at',
            'updated_at',
        ];
    }

    public static function getDb(): Connection
    {
        return \Yii::$app->db;
    }

    public function getIsNewRecord()
    {
        return $this->id === null;
    }
} 