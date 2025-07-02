<?php

namespace app\models;

use Yii;
use yii\db\ActiveRecord;
use yii\behaviors\TimestampBehavior;
use yii\db\Expression;

/**
 * This is the model class for table "devices".
 *
 * @property string $device_id
 * @property string $device_name
 * @property string $device_type
 * @property int $owner_id
 * @property string $registration_date
 * @property string $status
 * @property string $last_updated
 *
 * @property User $owner
 * @property Faults[] $faults
 */
class Devices extends ActiveRecord
{
    const STATUS_ACTIVE = 'Active';
    const STATUS_INACTIVE = 'Not-Active';
    const STATUS_PENDING = 'Pending-Registration';

    const TYPE_PMSM_MECHANICAL_VIBRATION = 'pmsm-mechanical-vibration';
    const TYPE_BLDC_HIGH_SPEED = 'bldc-high-speed';
    const TYPE_PMSM_TORQUE_LOAD = 'pmsm-torque-load';

    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return '{{%devices}}';
    }

    /**
     * {@inheritdoc}
     */
    public static function primaryKey()
    {
        return ['device_id'];
    }

    /**
     * {@inheritdoc}
     */
    public function rules()
    {
        return [
            [['device_id', 'device_name', 'device_type', 'owner_id'], 'required'],
            [['registration_date', 'last_updated'], 'safe'],
            [['owner_id'], 'integer'],
            [['device_id', 'device_name'], 'string', 'max' => 255],
            [['device_type'], 'string', 'max' => 255],
            [['status'], 'string'],
            [['status'], 'in', 'range' => [self::STATUS_ACTIVE, self::STATUS_INACTIVE, self::STATUS_PENDING]],
            [['device_id'], 'unique'],
            [['config'], 'safe'],
            [['owner_id'], 'exist', 'targetClass' => User::class, 'targetAttribute' => 'id'],
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function attributeLabels()
    {
        return [
            'device_id' => 'Device ID',
            'device_name' => 'Device Name',
            'device_type' => 'Device Type',
            'owner_id' => 'Owner',
            'registration_date' => 'Registration Date',
            'status' => 'Status',
            'last_updated' => 'Last Updated',
            'config' => 'Config',
        ];
    }    /**
     * Gets query for [[Owner]].
     *
     * @return \yii\db\ActiveQuery
     */
    public function getOwner()
    {
        return $this->hasOne(User::class, ['id' => 'owner_id']);
    }

    /**
     * Gets query for [[Faults]].
     *
     * @return \yii\db\ActiveQuery
     */
    public function getFaults()
    {
        return $this->hasMany(Faults::class, ['device_id' => 'device_id']);
    }

    /**
     * Get device by ID
     * 
     * @param string $id
     * @return self|null
     */
    public static function findByDeviceId($id)
    {
        return self::findOne(['device_id' => $id]);
    }

    /**
     * Get device by ID for specific owner
     * 
     * @param string $id
     * @param int $ownerId
     * @return self|null
     */
    public static function findByDeviceIdAndOwner($id, $ownerId)
    {
        return self::findOne(['device_id' => $id, 'owner_id' => $ownerId]);
    }

    /**
     * Get all devices for specific owner
     * 
     * @param int $ownerId
     * @return \yii\db\ActiveQuery
     */
    public static function findByOwner($ownerId)
    {
        return self::find()->where(['owner_id' => $ownerId]);
    }

    /**
     * Check if user owns this device
     * 
     * @param int $userId
     * @return bool
     */
    public function isOwnedBy($userId)
    {
        return $this->owner_id == $userId;
    }
    
    /**
     * Check if device is active
     * 
     * @return bool
     */
    public function isActive()
    {
        return $this->status === self::STATUS_ACTIVE;
    }    /**
     * Check if device has active faults
     * 
     * @return bool
     */
    public function hasActiveFaults()
    {
        return $this->getFaults()
            ->where(['status' => Faults::STATUS_ACTIVE])
            ->exists();
    }

    /**
     * Get active fault
     * 
     * @return Faults|null
     */
    public function getActiveFault()
    {
        return $this->getFaults()
            ->where(['status' => Faults::STATUS_ACTIVE])
            ->one();
    }
}
