<?php

use yii\db\Migration;

/**
 * Creates table `measurement_channels` with all required metadata fields.
 */
class m250617_000003_create_measurement_channels_table extends Migration
{
    public function safeUp()
    {
        $this->createTable('{{%measurement_channels}}', [
            'id' => $this->primaryKey(),
            'sensor_type' => $this->string(50),
            'data_type' => $this->string(20),
            'frame_offset' => $this->integer(),
            'samples_per_frame' => $this->integer(),
            'sampling_frequency' => $this->integer(),
            'channel_name' => $this->string(255),
            'physical_unit' => $this->string(20),
            'measurement_range_min' => $this->decimal(10,4),
            'measurement_range_max' => $this->decimal(10,4),
        ]);
    }

    public function safeDown()
    {
        $this->dropTable('{{%measurement_channels}}');
    }
} 