<?php

namespace app\models;

use yii\base\Model;
use Yii;

/**
 * User form model for creating and updating users
 */
class UserForm extends Model
{
    public $username;
    public $email;
    public $password;
    public $password_repeat;
    public $first_name;
    public $last_name;
    public $role;
    public $status;

    /**
     * @var User
     */
    public $user;

    /**
     * @var bool Whether this is an update operation
     */
    public $isUpdate = false;

    public function __construct($config = [])
    {
        if (isset($config['user'])) {
            $this->user = $config['user'];
            $this->isUpdate = true;
            $this->loadFromUser();
            unset($config['user']);
        }
        parent::__construct($config);
    }

    /**
     * {@inheritdoc}
     */
    public function rules()
    {
        return [
            ['username', 'trim'],
            ['username', 'required'],
            ['username', 'unique', 'targetClass' => User::class, 'filter' => $this->isUpdate ? ['!=', 'id', $this->user->id] : null],
            ['username', 'string', 'min' => 2, 'max' => 255],

            ['email', 'trim'],
            ['email', 'required'],
            ['email', 'email'],
            ['email', 'string', 'max' => 255],
            ['email', 'unique', 'targetClass' => User::class, 'filter' => $this->isUpdate ? ['!=', 'id', $this->user->id] : null],

            ['password', 'required', 'when' => function() { return !$this->isUpdate; }],
            ['password', 'string', 'min' => 6, 'max' => 255],

            ['password_repeat', 'compare', 'compareAttribute' => 'password', 'message' => 'Passwords don\'t match'],
            ['password_repeat', 'required', 'when' => function() { return !empty($this->password); }],

            [['first_name', 'last_name'], 'trim'],
            [['first_name', 'last_name'], 'string', 'max' => 100],

            ['role', 'required'],
            ['role', 'in', 'range' => [User::ROLE_ADMIN, User::ROLE_NORMAL]],

            ['status', 'in', 'range' => [User::STATUS_ACTIVE, User::STATUS_INACTIVE]],
            ['status', 'default', 'value' => User::STATUS_ACTIVE],
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function attributeLabels()
    {
        return [
            'username' => 'Username',
            'email' => 'Email',
            'password' => 'Password',
            'password_repeat' => 'Repeat Password',
            'first_name' => 'First Name',
            'last_name' => 'Last Name',
            'role' => 'Role',
            'status' => 'Status',
        ];
    }

    /**
     * Load attributes from existing user
     */
    protected function loadFromUser()
    {
        if ($this->user) {
            $this->username = $this->user->username;
            $this->email = $this->user->email;
            $this->first_name = $this->user->first_name;
            $this->last_name = $this->user->last_name;
            $this->role = $this->user->role;
            $this->status = $this->user->status;
        }
    }

    /**
     * Save user (create or update)
     * @return bool
     */
    public function save()
    {
        if (!$this->validate()) {
            return false;
        }

        if (!$this->user) {
            $this->user = new User();
        }

        $this->user->username = $this->username;
        $this->user->email = $this->email;
        $this->user->first_name = $this->first_name;
        $this->user->last_name = $this->last_name;
        $this->user->role = $this->role;
        $this->user->status = $this->status;

        if (!empty($this->password)) {
            $this->user->setPassword($this->password);
        }

        return $this->user->save();
    }

    /**
     * Get available roles
     * @return array
     */
    public static function getRoles()
    {
        return [
            User::ROLE_ADMIN => 'Administrator',
            User::ROLE_NORMAL => 'Normal User',
        ];
    }

    /**
     * Get available statuses
     * @return array
     */
    public static function getStatuses()
    {
        return [
            User::STATUS_ACTIVE => 'Active',
            User::STATUS_INACTIVE => 'Inactive',
        ];
    }
}
