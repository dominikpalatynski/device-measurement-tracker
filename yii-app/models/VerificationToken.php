<?php

namespace app\models;

use Yii;
use yii\db\ActiveRecord;
use yii\behaviors\TimestampBehavior;

/**
 * This is the model class for table "{{%verification_token}}".
 *
 * @property int $id
 * @property int $device_id
 * @property string $token
 * @property int $expiration_date
 * @property int $created_at
 * @property int $updated_at
 *
 * @property Device $device
 */
class VerificationToken extends ActiveRecord
{
    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return '{{%verification_token}}';
    }

    /**
     * {@inheritdoc}
     */
    public function behaviors()
    {
        return [
            TimestampBehavior::class,
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function rules()
    {
        return [
            [['token', 'expiration_date', 'device_id'], 'required'],
            [['expiration_date', 'created_at', 'updated_at', 'device_id'], 'integer'],
            [['token'], 'string', 'max' => 255],
            [['token'], 'unique'],
            ['expiration_date', 'validateExpirationDate'],
            ['device_id', 'exist', 'skipOnError' => true, 'targetClass' => Device::class, 'targetAttribute' => ['device_id' => 'id']],
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'device_id' => 'ID Urządzenia',
            'token' => 'Token',
            'expiration_date' => 'Data wygaśnięcia',
            'created_at' => 'Data utworzenia',
            'updated_at' => 'Data aktualizacji',
        ];
    }

    /**
     * Gets query for [[Device]]
     *
     * @return \yii\db\ActiveQuery
     */
    public function getDevice()
    {
        return $this->hasOne(Device::class, ['id' => 'device_id']);
    }

    /**
     * Walidacja daty wygaśnięcia
     */
    public function validateExpirationDate($attribute, $params)
    {
        if ($this->$attribute <= time()) {
            $this->addError($attribute, 'Data wygaśnięcia musi być w przyszłości');
        }
    }

    /**
     * Sprawdza czy token jest ważny
     * @return bool
     */
    public function isValid()
    {
        return $this->expiration_date > time();
    }

    /**
     * Generuje nowy token
     * @param int $deviceId ID urządzenia
     * @param int $expirationTime Czas ważności tokenu w sekundach
     * @return self
     */
    public static function generate($deviceId, $expirationTime = 3600)
    {
        $token = new self();
        $token->device_id = $deviceId;
        $token->token = Yii::$app->security->generateRandomString(32);
        $token->expiration_date = time() + $expirationTime;
        $token->used = false;
        return $token;
    }

    /**
     * Znajduje token po jego wartości
     * @param string $token
     * @return self|null
     */
    public static function findByToken($token)
    {
        return self::findOne(['token' => $token]);
    }
} 