<?php
namespace app\models;

use yii\db\ActiveRecord;
use yii\behaviors\TimestampBehavior;

class Device extends ActiveRecord
{
    const STATUS_INACTIVE = 0;
    const STATUS_ACTIVE = 1;
    
    public static function tableName()
    {
        return 'device';
    }
    
    public function behaviors()
    {
        return [
            TimestampBehavior::class,
        ];
    }
    
    public function rules()
    {
        return [
            [['device_uuid'], 'required'],
            [['device_uuid'], 'string', 'max' => 50],
            [['device_uuid'], 'unique'],
            [['name'], 'string', 'max' => 100],
            [['type'], 'string', 'max' => 50],
            [['status'], 'integer'],
            [['last_seen_at'], 'integer'],
        ];
    }
    
    public function getMeasurements()
    {
        return $this->hasMany(Measurement::class, ['device_id' => 'id']);
    }
    
    public function getLatestMeasurement()
    {
        return $this->hasOne(Measurement::class, ['device_id' => 'id'])
            ->orderBy(['measured_at' => SORT_DESC]);
    }
    
    public function getIsOnline()
    {
        // Consider device online if seen in the last 5 minutes
        return $this->last_seen_at && (time() - $this->last_seen_at < 300);
    }
}