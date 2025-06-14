<?php

namespace app\models;

use Yii;
use yii\db\ActiveRecord;
use yii\behaviors\TimestampBehavior;
use yii\db\Expression;

/**
 * This is the model class for table "device_configurations".
 *
 * @property int $config_id
 * @property string $device_id
 * @property array|null $configuration_details
 * @property string $created_at
 * @property string $updated_at
 *
 * @property Devices $device
 */
class DeviceConfigurations extends ActiveRecord
{
    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return '{{%device_configurations}}';
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
            [['device_id'], 'required'],
            [['configuration_details'], 'safe'],
            [['created_at', 'updated_at'], 'safe'],
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
            'config_id' => 'Config ID',
            'device_id' => 'Device ID',
            'configuration_details' => 'Configuration Details',
            'created_at' => 'Created At',
            'updated_at' => 'Updated At',
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
     * Handle JSON encoding/decoding for configuration_details
     */
    public function afterFind()
    {
        parent::afterFind();
        if ($this->configuration_details && is_string($this->configuration_details)) {
            $this->configuration_details = json_decode($this->configuration_details, true);
        }
    }

    /**
     * Handle JSON encoding before save
     */
    public function beforeSave($insert)
    {
        if (parent::beforeSave($insert)) {
            if ($this->configuration_details && is_array($this->configuration_details)) {
                $this->configuration_details = json_encode($this->configuration_details);
            }
            return true;
        }
        return false;
    }

    /**
     * Find configurations by device ID
     * 
     * @param string $deviceId
     * @return \yii\db\ActiveQuery
     */
    public static function findByDeviceId($deviceId)
    {
        return self::find()->where(['device_id' => $deviceId]);
    }

    /**
     * Get latest configuration for a device
     * 
     * @param string $deviceId
     * @return self|null
     */
    public static function getLatestByDeviceId($deviceId)
    {
        return self::find()
            ->where(['device_id' => $deviceId])
            ->orderBy(['created_at' => SORT_DESC])
            ->one();
    }
}
