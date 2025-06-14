<?php

namespace app\models;

use Yii;
use yii\db\ActiveRecord;
use yii\behaviors\TimestampBehavior;
use yii\db\Expression;

/**
 * This is the model class for table "experiments".
 *
 * @property string $experiment_id
 * @property string $device_id
 * @property string $experiment_name
 * @property string $start_time
 * @property string|null $end_time
 * @property string|null $description
 * @property string $status
 * @property string $created_at
 * @property string $updated_at
 * 
 * @property Devices $device
 * @property Phenomena[] $phenomena
 */
class Experiments extends ActiveRecord
{
    const STATUS_RUNNING = 'Running';
    const STATUS_COMPLETED = 'Completed';
    const STATUS_SCHEDULED = 'Scheduled';
    const STATUS_FAILED = 'Failed';/**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return '{{%experiments}}';
    }

    /**
     * {@inheritdoc}
     */
    public static function primaryKey()
    {
        return ['experiment_id'];
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
    }    /**
     * {@inheritdoc}
     */
    public function rules()
    {
        return [
            [['experiment_id', 'experiment_name', 'device_id', 'status', 'start_time'], 'required'],
            [['description'], 'string'],
            [['start_time', 'end_time', 'created_at', 'updated_at'], 'safe'],
            [['experiment_id', 'device_id', 'experiment_name'], 'string', 'max' => 255],
            [['status'], 'string'],
            [['status'], 'in', 'range' => [self::STATUS_RUNNING, self::STATUS_COMPLETED, self::STATUS_SCHEDULED, self::STATUS_FAILED]],
            [['experiment_id'], 'unique'],
            [['device_id'], 'exist', 'skipOnError' => true, 'targetClass' => Devices::class, 'targetAttribute' => ['device_id' => 'device_id']],
        ];
    }/**
     * {@inheritdoc}
     */
    public function attributeLabels()
    {        return [
            'experiment_id' => 'Experiment ID',
            'experiment_name' => 'Experiment Name',
            'description' => 'Description',
            'device_id' => 'Device ID',
            'status' => 'Status',
            'start_time' => 'Start Time',
            'end_time' => 'End Time',
            'created_at' => 'Created At',
            'updated_at' => 'Updated At',
        ];
    }    /**
     * Gets query for [[Device]].
     *
     * @return \yii\db\ActiveQuery
     */
    public function getDevice()
    {
        return $this->hasOne(Devices::class, ['device_id' => 'device_id']);
    }

    /**
     * Gets query for [[Phenomena]].
     *
     * @return \yii\db\ActiveQuery
     */
    public function getPhenomena()
    {
        return $this->hasMany(Phenomena::class, ['experiment_id' => 'experiment_id']);
    }    /**
     * Generate a unique experiment ID
     * 
     * @return string
     */
    public static function generateExperimentId()
    {
        return 'exp_' . uniqid();
    }    /**
     * Create a new experiment
     * 
     * @param string $deviceId
     * @param string $name
     * @param string $description
     * @return self|null
     */
    public static function createExperiment($deviceId, $name, $description = null)
    {
        $experiment = new self();
        $experiment->experiment_id = self::generateExperimentId();
        $experiment->device_id = $deviceId;
        $experiment->experiment_name = $name;
        $experiment->description = $description;
        $experiment->status = self::STATUS_SCHEDULED;
        $experiment->start_time = new Expression('NOW()');
        
        if ($experiment->save()) {
            return $experiment;
        }
        
        return null;
    }
}
