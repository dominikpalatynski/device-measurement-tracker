<?php

namespace app\models;

use Yii;
use yii\db\ActiveRecord;
use yii\behaviors\TimestampBehavior;
use yii\db\Expression;

/**
 * This is the model class for table "phenomena".
 *
 * @property int $id
 * @property string $phenomenon_id
 * @property string $experiment_id
 * @property string $name
 * @property string|null $description
 * @property string $status
 * @property string|null $start_time
 * @property string|null $end_time
 * @property string $created_at
 * @property string $updated_at
 *
 * @property Experiments $experiment
 */
class Phenomena extends ActiveRecord
{
    const STATUS_PENDING = 'Pending';
    const STATUS_ACTIVE = 'Active';
    const STATUS_FINISHED = 'Finished';
    const STATUS_STOPPED = 'Stopped';
    
    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return '{{%phenomena}}';
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
            [['phenomenon_id', 'experiment_id', 'name', 'status'], 'required'],
            [['description'], 'string'],
            [['start_time', 'end_time', 'created_at', 'updated_at'], 'safe'],
            [['phenomenon_id', 'experiment_id'], 'string', 'max' => 50],
            [['name'], 'string', 'max' => 255],
            [['status'], 'string'],
            [['status'], 'in', 'range' => [self::STATUS_PENDING, self::STATUS_ACTIVE, self::STATUS_FINISHED, self::STATUS_STOPPED]],
            [['phenomenon_id'], 'unique'],
            [['experiment_id'], 'exist', 'skipOnError' => true, 'targetClass' => Experiments::class, 'targetAttribute' => ['experiment_id' => 'experiment_id']],
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'phenomenon_id' => 'Phenomenon ID',
            'experiment_id' => 'Experiment ID',
            'name' => 'Name',
            'description' => 'Description',
            'status' => 'Status',
            'start_time' => 'Start Time',
            'end_time' => 'End Time',
            'created_at' => 'Created At',
            'updated_at' => 'Updated At',
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
     * Generate a unique phenomenon ID
     * 
     * @return string
     */
    public static function generatePhenomenonId()
    {
        return 'phenom_' . uniqid();
    }

    /**
     * Create a new phenomenon
     * 
     * @param string $experimentId
     * @param string $name
     * @param string $description
     * @return self|null
     */
    public static function createPhenomenon($experimentId, $name, $description = null)
    {
        $phenomenon = new self();
        $phenomenon->phenomenon_id = self::generatePhenomenonId();
        $phenomenon->experiment_id = $experimentId;
        $phenomenon->name = $name;
        $phenomenon->description = $description;
        $phenomenon->status = self::STATUS_PENDING;
        
        if ($phenomenon->save()) {
            return $phenomenon;
        }
        
        return null;
    }

    /**
     * Start a phenomenon
     * 
     * @return bool
     */
    public function startPhenomenon()
    {
        $this->status = self::STATUS_ACTIVE;
        $this->start_time = new Expression('NOW()');
        return $this->save();
    }

    /**
     * Complete a phenomenon
     * 
     * @return bool
     */
    public function finishPhenomenon()
    {
        $this->status = self::STATUS_FINISHED;
        $this->end_time = new Expression('NOW()');
        return $this->save();
    }

    /**
     * Stop a phenomenon
     * 
     * @return bool
     */
    public function stopPhenomenon()
    {
        $this->status = self::STATUS_STOPPED;
        $this->end_time = new Expression('NOW()');
        return $this->save();
    }
}
