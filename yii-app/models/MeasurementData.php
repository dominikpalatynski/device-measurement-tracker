<?php

namespace app\models;

use Yii;
use yii\db\ActiveRecord;

/**
 * This is the model class for table "measurement_data".
 * * @property int $data_id
 * @property string $device_id
 * @property string|null $phenomenon_id
 * @property array|null $data_payload
 * @property string $upload_type
 * @property string $timestamp
 *
 * @property Devices $device
 */
class MeasurementData extends ActiveRecord
{
    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return '{{%measurement_data}}';
    }

    /**
     * {@inheritdoc}
     */    public function rules()
    {
        return [
            [['device_id'], 'required'],
            [['data_payload'], 'safe'],
            [['timestamp'], 'safe'],
            [['device_id', 'phenomenon_id'], 'string', 'max' => 255],
            [['upload_type'], 'in', 'range' => ['batch', 'stream']],
            [['device_id'], 'exist', 'skipOnError' => true, 'targetClass' => Devices::class, 'targetAttribute' => ['device_id' => 'device_id']],
        ];
    }

    /**
     * {@inheritdoc}
     */    public function attributeLabels()
    {
        return [
            'data_id' => 'Data ID',
            'device_id' => 'Device ID',
            'phenomenon_id' => 'Phenomenon ID',
            'data_payload' => 'Data Payload',
            'upload_type' => 'Upload Type',
            'timestamp' => 'Timestamp',
        ];
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
     * Handle JSON encoding/decoding for data_payload
     */
    public function afterFind()
    {
        parent::afterFind();
        if ($this->data_payload && is_string($this->data_payload)) {
            $this->data_payload = json_decode($this->data_payload, true);
        }
    }

    /**
     * Handle JSON encoding before save
     */
    public function beforeSave($insert)
    {
        if (parent::beforeSave($insert)) {
            if ($this->data_payload && is_array($this->data_payload)) {
                $this->data_payload = json_encode($this->data_payload);
            }
            return true;
        }
        return false;
    }
} 