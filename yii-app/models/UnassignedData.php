<?php

namespace app\models;

use Yii;
use yii\db\ActiveRecord;

/**
 * This is the model class for table "unassigned_data".
 *
 * @property int $data_id
 * @property string $device_id
 * @property array|null $data_payload
 * @property string $timestamp
 *
 * @property Devices $device
 */
class UnassignedData extends ActiveRecord
{
    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return '{{%unassigned_data}}';
    }

    /**
     * {@inheritdoc}
     */
    public function rules()
    {
        return [
            [['device_id'], 'required'],
            [['data_payload'], 'safe'],
            [['timestamp'], 'safe'],
            [['device_id'], 'string', 'max' => 255],
            [['device_id'], 'exist', 'skipOnError' => true, 'targetClass' => Devices::class, 'targetAttribute' => ['device_id' => 'device_id']],
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function attributeLabels()
    {
        return [
            'data_id' => 'Data ID',
            'device_id' => 'Device ID',
            'data_payload' => 'Data Payload',
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

    /**
     * Find unassigned data by device ID
     * 
     * @param string $deviceId
     * @return \yii\db\ActiveQuery
     */
    public static function findByDeviceId($deviceId)
    {
        return self::find()->where(['device_id' => $deviceId]);
    }

    /**
     * Get recent unassigned data for a device
     * 
     * @param string $deviceId
     * @param int $limit
     * @return \yii\db\ActiveQuery
     */
    public static function getRecentByDeviceId($deviceId, $limit = 100)
    {
        return self::find()
            ->where(['device_id' => $deviceId])
            ->orderBy(['timestamp' => SORT_DESC])
            ->limit($limit);
    }

    /**
     * Get unassigned data within a time range
     * 
     * @param string $deviceId
     * @param string $startTime
     * @param string|null $endTime
     * @return \yii\db\ActiveQuery
     */
    public static function getDataInTimeRange($deviceId, $startTime, $endTime = null)
    {
        $query = self::find()
            ->where(['device_id' => $deviceId])
            ->andWhere(['>=', 'timestamp', $startTime]);

        if ($endTime) {
            $query->andWhere(['<=', 'timestamp', $endTime]);
        }

        return $query->orderBy(['timestamp' => SORT_ASC]);
    }

    /**
     * Count unassigned data for a device
     * 
     * @param string $deviceId
     * @return int
     */
    public static function countByDeviceId($deviceId)
    {
        return self::find()->where(['device_id' => $deviceId])->count();
    }
}
