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
 * @property string $registration_date
 * @property string $status
 * @property string $last_updated
 *
 * @property Faults[] $faults
 */
class Devices extends ActiveRecord
{
    const STATUS_ACTIVE = 'Active';
    const STATUS_INACTIVE = 'Inactive';

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
            [['device_id', 'device_name', 'device_type'], 'required'],
            [['registration_date', 'last_updated'], 'safe'],
            [['device_id', 'device_name'], 'string', 'max' => 255],
            [['device_type'], 'string'],
            [['device_type'], 'in', 'range' => [self::TYPE_PMSM_MECHANICAL_VIBRATION, self::TYPE_BLDC_HIGH_SPEED, self::TYPE_PMSM_TORQUE_LOAD]],
            [['status'], 'string'],
            [['status'], 'in', 'range' => [self::STATUS_ACTIVE, self::STATUS_INACTIVE]],
            [['device_id'], 'unique'],
            [['config'], 'safe'],
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
            'registration_date' => 'Registration Date',
            'status' => 'Status',
            'last_updated' => 'Last Updated',
            'config' => 'Config',
        ];
    }    /**
     * Gets query for [[Faults]].
     *
     * @return \yii\db\ActiveQuery
     */
    public function getFaults()
    {
        return $this->hasMany(Faults::class, ['device_id' => 'device_id']);
    }

    /**
     * Gets query for [[DeviceConfigurations]].
     *
     * @return \yii\db\ActiveQuery
     */
    public function getDeviceConfigurations()
    {
        return $this->hasMany(DeviceConfigurations::class, ['device_id' => 'device_id']);
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
            ->where(['status' => [Faults::STATUS_RUNNING, Faults::STATUS_SCHEDULED]])
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
            ->where(['status' => [Faults::STATUS_RUNNING, Faults::STATUS_SCHEDULED]])
            ->one();
    }
}
