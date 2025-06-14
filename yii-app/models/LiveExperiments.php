<?php

namespace app\models;

use Yii;
use yii\db\ActiveRecord;
use yii\behaviors\TimestampBehavior;
use yii\db\Expression;

/**
 * This is the model class for table "live_experiments".
 *
 * @property int $live_experiment_id
 * @property string $experiment_id
 * @property string $device_id
 * @property string|null $stream_url
 * @property bool $is_active
 * @property string $start_time
 * @property string|null $end_time
 *
 * @property Experiments $experiment
 * @property Devices $device
 */
class LiveExperiments extends ActiveRecord
{
    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return '{{%live_experiments}}';
    }

    /**
     * {@inheritdoc}
     */
    public function rules()
    {
        return [
            [['experiment_id', 'device_id'], 'required'],
            [['is_active'], 'boolean'],
            [['start_time', 'end_time'], 'safe'],
            [['experiment_id', 'device_id', 'stream_url'], 'string', 'max' => 255],
            [['experiment_id'], 'exist', 'skipOnError' => true, 'targetClass' => Experiments::class, 'targetAttribute' => ['experiment_id' => 'experiment_id']],
            [['device_id'], 'exist', 'skipOnError' => true, 'targetClass' => Devices::class, 'targetAttribute' => ['device_id' => 'device_id']],
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function attributeLabels()
    {
        return [
            'live_experiment_id' => 'Live Experiment ID',
            'experiment_id' => 'Experiment ID',
            'device_id' => 'Device ID',
            'stream_url' => 'Stream URL',
            'is_active' => 'Is Active',
            'start_time' => 'Start Time',
            'end_time' => 'End Time',
        ];
    }

    /**
     * Gets query for [[Experiment]].
     *
     * @return \yii\db\ActiveQuery
     */
    public function getExperiment()
    {
        return $this->hasOne(Experiments::class, ['experiment_id' => 'experiment_id']);
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
     * Create a new live experiment
     */
    public static function createLiveExperiment($experimentId, $deviceId, $streamUrl = null)
    {
        $liveExperiment = new self();
        $liveExperiment->experiment_id = $experimentId;
        $liveExperiment->device_id = $deviceId;
        $liveExperiment->stream_url = $streamUrl;
        $liveExperiment->is_active = true;
        $liveExperiment->start_time = new Expression('NOW()');

        if ($liveExperiment->save()) {
            return $liveExperiment;
        }

        return false;
    }

    /**
     * Stop the live experiment
     */
    public function stopLiveExperiment()
    {
        $this->is_active = false;
        $this->end_time = new Expression('NOW()');
        return $this->save();
    }

    /**
     * Check if the live experiment is currently active
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
     * Find active live experiment for device
     */
    public static function findActiveByDevice($deviceId)
    {
        return self::find()
            ->where(['device_id' => $deviceId, 'is_active' => true])
            ->andWhere(['IS', 'end_time', null])
            ->one();    }
}
