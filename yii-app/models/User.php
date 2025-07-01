<?php

namespace app\models;

use Yii;
use yii\db\ActiveRecord;
use yii\web\IdentityInterface;
use yii\behaviors\TimestampBehavior;
use yii\db\Expression;
use Firebase\JWT\JWT;
use Firebase\JWT\Key;

/**
 * User model
 *
 * @property integer $id
 * @property string $username
 * @property string $email
 * @property string $password_hash
 * @property string $first_name
 * @property string $last_name
 * @property string $role
 * @property string $status
 * @property string $auth_key
 * @property string $access_token
 * @property string $password_reset_token
 * @property string $email_verification_token
 * @property string $last_login_at
 * @property string $created_at
 * @property string $updated_at
 * @property string $password write-only password
 */
class User extends ActiveRecord implements IdentityInterface
{
    const STATUS_DELETED = 'deleted';
    const STATUS_INACTIVE = 'inactive';
    const STATUS_ACTIVE = 'active';
    
    const ROLE_ADMIN = 'admin';
    const ROLE_NORMAL = 'normal';

    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return '{{%users}}';
    }

    /**
     * {@inheritdoc}
     */
    public function behaviors()
    {
        return [
            [
                'class' => TimestampBehavior::class,
                'attributes' => [
                    ActiveRecord::EVENT_BEFORE_INSERT => ['created_at', 'updated_at'],
                    ActiveRecord::EVENT_BEFORE_UPDATE => ['updated_at'],
                ],
                'value' => new Expression('NOW()'),
            ],
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function rules()
    {
        return [
            ['status', 'default', 'value' => self::STATUS_ACTIVE],
            ['status', 'in', 'range' => [self::STATUS_ACTIVE, self::STATUS_INACTIVE, self::STATUS_DELETED]],
            ['role', 'default', 'value' => self::ROLE_NORMAL],
            ['role', 'in', 'range' => [self::ROLE_ADMIN, self::ROLE_NORMAL]],
            
            ['username', 'trim'],
            ['username', 'required'],
            ['username', 'unique', 'targetClass' => '\app\models\User', 'message' => 'This username has already been taken.'],
            ['username', 'string', 'min' => 2, 'max' => 255],

            ['email', 'trim'],
            ['email', 'required'],
            ['email', 'email'],
            ['email', 'string', 'max' => 255],
            ['email', 'unique', 'targetClass' => '\app\models\User', 'message' => 'This email address has already been taken.'],

            ['password_hash', 'required'],
            ['password_hash', 'string', 'min' => 6],

            [['first_name', 'last_name'], 'string', 'max' => 100],
            [['password_reset_token', 'email_verification_token', 'access_token'], 'string', 'max' => 255],
            ['auth_key', 'string', 'max' => 32],
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'username' => 'Username',
            'email' => 'Email',
            'first_name' => 'First Name',
            'last_name' => 'Last Name',
            'role' => 'Role',
            'status' => 'Status',
            'created_at' => 'Created At',
            'updated_at' => 'Updated At',
            'last_login_at' => 'Last Login',
        ];
    }

    /**
     * {@inheritdoc}
     */
    public static function findIdentity($id)
    {
        return static::findOne(['id' => $id, 'status' => self::STATUS_ACTIVE]);
    }

    /**
     * {@inheritdoc}
     */
    public static function findIdentityByAccessToken($token, $type = null)
    {
        try {
            $secretKey = Yii::$app->params['jwtSecretKey'] ?? 'your-secret-key';
            $decoded = JWT::decode($token, new Key($secretKey, 'HS256'));
            
            $user = static::findOne(['id' => $decoded->sub, 'status' => self::STATUS_ACTIVE]);
            
            if ($user && $user->access_token === $token) {
                return $user;
            }
        } catch (\Exception $e) {
            Yii::error('JWT decode error: ' . $e->getMessage());
        }
        
        return null;
    }

    /**
     * Finds user by username
     *
     * @param string $username
     * @return static|null
     */
    public static function findByUsername($username)
    {
        return static::findOne(['username' => $username, 'status' => self::STATUS_ACTIVE]);
    }

    /**
     * Finds user by email
     *
     * @param string $email
     * @return static|null
     */
    public static function findByEmail($email)
    {
        return static::findOne(['email' => $email, 'status' => self::STATUS_ACTIVE]);
    }

    /**
     * Finds user by password reset token
     *
     * @param string $token password reset token
     * @return static|null
     */
    public static function findByPasswordResetToken($token)
    {
        if (!static::isPasswordResetTokenValid($token)) {
            return null;
        }

        return static::findOne([
            'password_reset_token' => $token,
            'status' => self::STATUS_ACTIVE,
        ]);
    }

    /**
     * Finds out if password reset token is valid
     *
     * @param string $token password reset token
     * @return bool
     */
    public static function isPasswordResetTokenValid($token)
    {
        if (empty($token)) {
            return false;
        }

        $timestamp = (int) substr($token, strrpos($token, '_') + 1);
        $expire = Yii::$app->params['user.passwordResetTokenExpire'] ?? 3600;
        return $timestamp + $expire >= time();
    }

    /**
     * {@inheritdoc}
     */
    public function getId()
    {
        return $this->getPrimaryKey();
    }

    /**
     * {@inheritdoc}
     */
    public function getAuthKey()
    {
        return $this->auth_key;
    }

    /**
     * {@inheritdoc}
     */
    public function validateAuthKey($authKey)
    {
        return $this->getAuthKey() === $authKey;
    }

    /**
     * Validates password
     *
     * @param string $password password to validate
     * @return bool if password provided is valid for current user
     */
    public function validatePassword($password)
    {
        return Yii::$app->security->validatePassword($password, $this->password_hash);
    }

    /**
     * Generates password hash from password and sets it to the model
     *
     * @param string $password
     */
    public function setPassword($password)
    {
        $this->password_hash = Yii::$app->security->generatePasswordHash($password);
    }

    /**
     * Generates "remember me" authentication key
     */
    public function generateAuthKey()
    {
        $this->auth_key = Yii::$app->security->generateRandomString();
    }

    /**
     * Generates new password reset token
     */
    public function generatePasswordResetToken()
    {
        $this->password_reset_token = Yii::$app->security->generateRandomString() . '_' . time();
    }

    /**
     * Removes password reset token
     */
    public function removePasswordResetToken()
    {
        $this->password_reset_token = null;
    }

    /**
     * Generate JWT access token
     * @return string
     */
    public function generateAccessToken()
    {
        $secretKey = Yii::$app->params['jwtSecretKey'] ?? 'your-secret-key';
        $issuedAt = time();
        $expiration = $issuedAt + (Yii::$app->params['jwtExpiration'] ?? 3600); // 1 hour default

        $payload = [
            'iat' => $issuedAt,
            'exp' => $expiration,
            'sub' => $this->id,
            'username' => $this->username,
            'email' => $this->email,
            'role' => $this->role,
        ];

        $this->access_token = JWT::encode($payload, $secretKey, 'HS256');
        return $this->access_token;
    }

    /**
     * Check if user is admin
     * @return bool
     */
    public function isAdmin()
    {
        return $this->role === self::ROLE_ADMIN;
    }

    /**
     * Check if user is normal user
     * @return bool
     */
    public function isNormal()
    {
        return $this->role === self::ROLE_NORMAL;
    }

    /**
     * Get user's full name
     * @return string
     */
    public function getFullName()
    {
        return trim($this->first_name . ' ' . $this->last_name);
    }

    /**
     * Get user's display name
     * @return string
     */
    public function getDisplayName()
    {
        $fullName = $this->getFullName();
        return $fullName ?: $this->username;
    }

    /**
     * Update last login timestamp
     */
    public function updateLastLogin()
    {
        $this->last_login_at = new Expression('NOW()');
        $this->save(false, ['last_login_at']);
    }

    /**
     * Before save event
     */
    public function beforeSave($insert)
    {
        if (parent::beforeSave($insert)) {
            if ($insert) {
                $this->generateAuthKey();
            }
            return true;
        }
        return false;
    }

    /**
     * Revoke access token
     */
    public function revokeAccessToken()
    {
        $this->access_token = null;
        $this->save(false, ['access_token']);
    }
}
