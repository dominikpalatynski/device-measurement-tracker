<?php

namespace app\models;

use Yii;
use yii\db\ActiveRecord;
use yii\behaviors\TimestampBehavior;
use yii\db\Expression;

/**
 * This is the model class for table "live_faults".
 *
 * @property int $live_fault_id
 * @property string $fault_id
 * @property string $device_id
 * @property string|null $stream_url
 * @property bool $is_active
 * @property string $start_time
 * @property string|null $end_time
 *
 * @property Faults $fault
 * @property Devices $device
 */
class LiveFaults extends ActiveRecord
{
    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return '{{%live_faults}}';
    }

    /**
     * {@inheritdoc}
     */
    public function rules()
    {
        return [
            [['fault_id', 'device_id'], 'required'],
            [['is_active'], 'boolean'],
            [['start_time', 'end_time'], 'safe'],
            [['fault_id', 'device_id', 'stream_url'], 'string', 'max' => 255],
            [['fault_id'], 'exist', 'skipOnError' => true, 'targetClass' => Faults::class, 'targetAttribute' => ['fault_id' => 'fault_id']],
            [['device_id'], 'exist', 'skipOnError' => true, 'targetClass' => Devices::class, 'targetAttribute' => ['device_id' => 'device_id']],
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function attributeLabels()
    {
        return [
            'live_fault_id' => 'Live Fault ID',
            'fault_id' => 'Fault ID',
            'device_id' => 'Device ID',
            'stream_url' => 'Stream URL',
            'is_active' => 'Is Active',
            'start_time' => 'Start Time',
            'end_time' => 'End Time',
        ];
    }

    /**
     * Gets query for [[Fault]].
     *
     * @return \yii\db\ActiveQuery
     */
    public function getFault()
    {
        return $this->hasOne(Faults::class, ['fault_id' => 'fault_id']);
    }

    /**
     * Gets query for [[Device]].
     *
     * @return \yii\db\ActiveQuery
     */
    public function getDevice()
    {
        return $this->hasOne(Devices::class, ['device_id' => 'device_id']);
    }

    /**
     * Create a new live fault
     */
    public static function createLiveFault($faultId, $deviceId, $streamUrl = null)
    {
        $liveFault = new self();
        $liveFault->fault_id = $faultId;
        $liveFault->device_id = $deviceId;
        $liveFault->stream_url = $streamUrl;
        $liveFault->is_active = true;
        $liveFault->start_time = new Expression('NOW()');

        if ($liveFault->save()) {
            return $liveFault;
        }

        return false;
    }

    /**
     * Stop the live fault
     */
    public function stopLiveFault()
    {
        $this->is_active = false;
        $this->end_time = new Expression('NOW()');
        return $this->save();
    }

    /**
     * Check if the live fault is currently active
     */
    public function isActive()
    {
        return $this->is_active && $this->end_time === null;
    }

    /**
     * Get duration in seconds
     */
    public function getDuration()
    {
        $startTime = strtotime($this->start_time);
        $endTime = $this->end_time ? strtotime($this->end_time) : time();
        return $endTime - $startTime;
    }

    /**
     * Find active live fault for device
     */
    public static function findActiveByDevice($deviceId)
    {
        return self::find()
            ->where(['device_id' => $deviceId, 'is_active' => true])
            ->andWhere(['IS', 'end_time', null])
            ->one();    }
}
