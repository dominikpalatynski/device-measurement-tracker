<?php
namespace app\models;

use yii\db\ActiveRecord;

class Measurement extends ActiveRecord
{
    public static function tableName()
    {
        return 'measurement';
    }
    
    public function rules()
    {
        return [
            [['device_id', 'measured_at', 'created_at'], 'required'],
            [['device_id', 'measured_at', 'created_at'], 'integer'],
            [['temperature', 'humidity', 'pressure', 'battery_level'], 'number'],
            [['raw_data'], 'string'],
            [['device_id'], 'exist', 'skipOnError' => true, 
                'targetClass' => Device::class, 
                'targetAttribute' => ['device_id' => 'id']],
        ];
    }
    
    public function getDevice()
    {
        return $this->hasOne(Device::class, ['id' => 'device_id']);
    }
    
    public function fields()
    {
        return [
            'id',
            'device_id',
            'temperature',
            'humidity',
            'pressure',
            'battery_level',
            'measured_at',
            'measured_at_formatted' => function ($model) {
                return date('Y-m-d H:i:s', $model->measured_at);
            },
        ];
    }
}