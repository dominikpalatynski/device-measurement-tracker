<?php

namespace app\models;

use Yii;
use yii\db\ActiveRecord;

/**
 * This is the model class for table "measurement_channels".
 *
 * @property int $id
 * @property string|null $sensor_type
 * @property string|null $data_type
 * @property int|null $frame_offset
 * @property int|null $samples_per_frame
 * @property int|null $sampling_frequency
 * @property string|null $channel_name
 * @property string|null $physical_unit
 * @property float|null $measurement_range_min
 * @property float|null $measurement_range_max
 */
class MeasurementChannel extends ActiveRecord
{
    /**
     * {@inheritdoc}
     */
    public static function tableName()
    {
        return '{{%measurement_channels}}';
    }

    /**
     * {@inheritdoc}
     */
    public function rules()
    {
        return [
            [['frame_offset', 'samples_per_frame', 'sampling_frequency'], 'integer'],
            [['measurement_range_min', 'measurement_range_max'], 'number'],
            [['sensor_type'], 'string', 'max' => 50],
            [['data_type', 'physical_unit'], 'string', 'max' => 20],
            [['channel_name'], 'string', 'max' => 255],
        ];
    }

    /**
     * {@inheritdoc}
     */
    public function attributeLabels()
    {
        return [
            'id' => 'ID',
            'sensor_type' => 'Sensor Type',
            'data_type' => 'Data Type',
            'frame_offset' => 'Frame Offset',
            'samples_per_frame' => 'Samples Per Frame',
            'sampling_frequency' => 'Sampling Frequency',
            'channel_name' => 'Channel Name',
            'physical_unit' => 'Physical Unit',
            'measurement_range_min' => 'Measurement Range Min',
            'measurement_range_max' => 'Measurement Range Max',
        ];
    }
}
