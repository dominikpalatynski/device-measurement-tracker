<?php

namespace app\models;

use Yii;
use yii\db\ActiveRecord;
use yii\behaviors\TimestampBehavior;
use yii\db\Expression;

/**
 * This is the model class for table "faults".
 *
 * @property string $fault_id
 * @property string $device_id
 * @property string $fault_name
 * @property string $start_time
 * @property string|null $end_time
 * @property string|null $description
 * @property string $status
 * @property string $created_at
 * @property string $updated_at
 * @property string $type
 * 
 * @property Devices $device
 * @property Conditions[] $conditions
 */
class Faults extends ActiveRecord
{
    const STATUS_ACTIVE = 'Active';
    const STATUS_INACTIVE = 'Inactive';

    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return '{{%faults}}';
    }

    /**
     * {@inheritdoc}
     */
    public static function primaryKey()
    {
        return ['fault_id'];
    }

    /**
     * {@inheritdoc}
     */
    public function behaviors()
    {
        return [
            [
                'class' => TimestampBehavior::class,
                'createdAtAttribute' => 'created_at',
                'updatedAtAttribute' => 'updated_at',
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
            [['fault_id', 'device_id', 'fault_name', 'start_time', 'status'], 'required'],
            [['start_time', 'end_time', 'created_at', 'updated_at'], 'safe'],
            [['description'], 'string'],
            [['fault_id', 'device_id'], 'string', 'max' => 255],
            [['fault_name'], 'string', 'max' => 255],
            [['status'], 'string', 'max' => 50],
            [['type'], 'string', 'max' => 50],
            [['fault_id'], 'unique'],
            [['device_id'], 'exist', 'skipOnError' => true, 'targetClass' => Devices::class, 'targetAttribute' => ['device_id' => 'device_id']],
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function attributeLabels()
    {
        return [
            'fault_id' => 'Fault ID',
            'device_id' => 'Device ID',
            'fault_name' => 'Fault Name',
            'start_time' => 'Start Time',
            'end_time' => 'End Time',
            'description' => 'Description',
            'status' => 'Status',
            'created_at' => 'Created At',
            'updated_at' => 'Updated At',
            'type' => 'Type',
        ];
    }

    /**
     * Gets query for associated device.
     *
     * @return \yii\db\ActiveQuery
     */
    public function getDevice()
    {
        return $this->hasOne(Devices::class, ['device_id' => 'device_id']);
    }

    /**
     * Gets query for associated conditions.
     *
     * @return \yii\db\ActiveQuery
     */
    public function getConditions()
    {
        return $this->hasMany(Conditions::class, ['fault_id' => 'fault_id']);
    }

    /**
     * Create a new fault
     */
    public static function createFault($deviceId, $faultName, $description = null)
    {
        $fault = new self();
        $fault->fault_id = self::generateFaultId();
        $fault->device_id = $deviceId;
        $fault->fault_name = $faultName;
        $fault->description = $description;
        $fault->start_time = date('Y-m-d H:i:s');
        $fault->status = self::STATUS_ACTIVE;
        
        if ($fault->save()) {
            return $fault;
        }
        
        return false;
    }

    /**
     * Generate a unique fault ID
     */
    public static function generateFaultId()
    {
        return 'FAULT_' . date('Ymd_His') . '_' . substr(uniqid(), -6);
    }

    /**
     * Get faults by device
     */
    public static function findByDevice($deviceId)
    {
        return self::find()
            ->where(['device_id' => $deviceId])
            ->orderBy(['created_at' => SORT_DESC])
            ->all();
    }

    /**
     * Get active fault for device
     */
    public static function findActiveByDevice($deviceId)
    {
        return self::find()
            ->where(['device_id' => $deviceId])
            ->andWhere(['status' => self::STATUS_ACTIVE])
            ->one();
    }

    /**
     * Check if fault is currently active
     */
    public function isActive()
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    /**
     * Activate a fault
     */
    public function activate()
    {
        $this->status = self::STATUS_ACTIVE;
        return $this->save();
    }

    /**
     * Deactivate a fault
     */
    public function deactivate()
    {
        $this->status = self::STATUS_INACTIVE;
        $this->end_time = date('Y-m-d H:i:s');
        return $this->save();
    }
}
