<?php

namespace app\models;

use Yii;
use yii\db\ActiveRecord;
use yii\behaviors\TimestampBehavior;
use yii\db\Expression;

/**
 * This is the model class for table "conditions".
 *
 * @property int $id
 * @property string $condition_id
 * @property string $fault_id
 * @property string $name
 * @property string|null $description
 * @property string $status
 * @property string|null $start_time
 * @property string|null $end_time
 * @property string $created_at
 * @property string $updated_at
 *
 * @property Faults $fault
 */
class Condition extends ActiveRecord
{
    const STATUS_ACTIVE = 'Active';
    const STATUS_INACTIVE = 'Inactive';
    
    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return '{{%conditions}}';
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
            [['condition_id', 'fault_id', 'name', 'status'], 'required'],
            [['description'], 'string'],
            [['start_time', 'end_time', 'created_at', 'updated_at'], 'safe'],
            [['condition_id', 'fault_id'], 'string', 'max' => 50],
            [['name'], 'string', 'max' => 255],
            [['status'], 'string'],
            [['status'], 'in', 'range' => [self::STATUS_ACTIVE, self::STATUS_INACTIVE]],
            [['condition_id'], 'unique'],
            [['fault_id'], 'exist', 'skipOnError' => true, 'targetClass' => Faults::class, 'targetAttribute' => ['fault_id' => 'fault_id']],
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'condition_id' => 'Condition ID',
            'fault_id' => 'Fault ID',
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
     * Gets query for [[Fault]].
     *
     * @return \yii\db\ActiveQuery
     */
    public function getFault()
    {
        return $this->hasOne(Faults::class, ['fault_id' => 'fault_id']);
    }

    /**
     * Gets query for [[Device]] through fault.
     *
     * @return \yii\db\ActiveQuery
     */
    public function getDevice()
    {
        return $this->hasOne(Devices::class, ['device_id' => 'device_id'])
                    ->via('fault');
    }

    /**
     * Generate a unique condition ID
     * 
     * @return string
     */
    public static function generateConditionId()
    {
        return 'condition_' . uniqid();
    }

    /**
     * Create a new condition
     * 
     * @param string $faultId
     * @param string $name
     * @param string $description
     * @return self|null
     */
    public static function createCondition($faultId, $name, $description = null)
    {
        $condition = new self();
        $condition->condition_id = self::generateConditionId();
        $condition->fault_id = $faultId;
        $condition->name = $name;
        $condition->description = $description;
        $condition->status = self::STATUS_ACTIVE;
        
        if ($condition->save()) {
            return $condition;
        }
        
        return null;
    }

    /**
     * Start/activate a condition
     * 
     * @return bool
     */
    public function activateCondition()
    {
        $this->status = self::STATUS_ACTIVE;
        $this->start_time = new Expression('NOW()');
        return $this->save();
    }

    /**
     * Deactivate a condition
     * 
     * @return bool
     */
    public function deactivateCondition()
    {
        $this->status = self::STATUS_INACTIVE;
        $this->end_time = new Expression('NOW()');
        return $this->save();
    }

    /**
     * Check if condition is currently active
     * 
     * @return bool
     */
    public function isActive()
    {
        return $this->status === self::STATUS_ACTIVE;
    }

    // Backward compatibility methods
    public static function generatePhenomenonId() { return self::generateConditionId(); }
    public static function createPhenomenon($faultId, $name, $description = null) { return self::createCondition($faultId, $name, $description); }
    public function startPhenomenon() { return $this->activateCondition(); }
    public function finishPhenomenon() { return $this->deactivateCondition(); }
    public function stopPhenomenon() { return $this->deactivateCondition(); }
    
    // Additional backward compatibility for the old methods
    public function startCondition() { return $this->activateCondition(); }
    public function finishCondition() { return $this->deactivateCondition(); }
    public function stopCondition() { return $this->deactivateCondition(); }
}
