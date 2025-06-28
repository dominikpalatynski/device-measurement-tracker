<?php
namespace app\models;

use yii\db\ActiveRecord;
use yii\behaviors\TimestampBehavior;
use yii\db\Expression;

/**
 * This is the model class for table "devices".
 *
 * @property string $device_id
 * @property string $device_name
 * @property string $device_type
 * @property string $status
 * @property string $registration_date
 * @property string $last_updated
 *
 * @property Measurement[] $measurements
 * @property Faults[] $faults
 */
class Device extends ActiveRecord
{
    // Status constants
    const STATUS_ACTIVE = 'Active';
    const STATUS_PENDING = 'Pending-Registration';
    const STATUS_INACTIVE = 'Not-Active';
    
    // Type constants
    const TYPE_PMSM_MECHANICAL_VIBRATION = 'pmsm-mechanical-vibration';
    const TYPE_BLDC_HIGH_SPEED = 'bldc-high-speed';
    const TYPE_PMSM_TORQUE_LOAD = 'pmsm-torque-load';
    
    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return 'devices';
    }    
    /**
     * {@inheritdoc}
     */
    public function behaviors()
    {
        return [
            [
                'class' => TimestampBehavior::class,
                'createdAtAttribute' => 'registration_date',
                'updatedAtAttribute' => 'last_updated',
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
            [['device_uuid'], 'required'],
            [['device_uuid'], 'string', 'max' => 50],
            [['device_uuid'], 'unique'],
            [['device_id'], 'string', 'max' => 100],
            [['device_id'], 'unique'],
            [['config'], 'safe'],
            [['access_token'], 'string', 'max' => 255],
            [['name'], 'string', 'max' => 100],
            [['type'], 'string', 'max' => 50],
            [['status'], 'integer'],
            [['last_seen_at'], 'integer'],
        ];
    }    
    /**
     * Get measurements for this device
     */
    public function getMeasurements()
    {
        return $this->hasMany(MeasurementData::class, ['device_id' => 'device_id']);
    }
    
    /**
     * Get faults for this device
     */
    public function getFaults()
    {
        return $this->hasMany(Faults::class, ['device_id' => 'device_id']);
    }
    
    /**
     * Get experiments for this device (backward compatibility)
     */
    public function getExperiments()
    {
        return $this->getFaults();
    }
    
    /**
     * Get the latest measurement
     */
    public function getLatestMeasurement()
    {
        return $this->hasOne(MeasurementData::class, ['device_id' => 'device_id'])
            ->orderBy(['timestamp' => SORT_DESC]);
    }
    
    /**
     * Check if device is active
     */
    public function getIsActive()
    {
        return $this->status === self::STATUS_ACTIVE;
    }
    
    /**
     * Check if device is pending registration
     */
    public function getIsPending()
    {
        return $this->status === self::STATUS_PENDING;
    }
    
    /**
     * Find device by ID
     */
    public static function findById($id)
    {
        return static::findOne(['device_id' => $id]);
    }
    
    /**
     * Get all device types
     */
    public static function getDeviceTypes()
    {
        return [
            self::TYPE_PMSM_MECHANICAL_VIBRATION => 'PMSM Mechanical Vibration',
            self::TYPE_BLDC_HIGH_SPEED => 'BLDC High Speed',
            self::TYPE_PMSM_TORQUE_LOAD => 'PMSM Torque Load',
        ];
    }
    
    /**
     * Get all status options
     */
    public static function getStatusOptions()
    {
        return [
            self::STATUS_ACTIVE => 'Active',
            self::STATUS_PENDING => 'Pending Registration',
            self::STATUS_INACTIVE => 'Not Active',
        ];
    }
}