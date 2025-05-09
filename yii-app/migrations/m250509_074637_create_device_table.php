<?php

use yii\db\Migration;

/**
 * Handles the creation of table `{{%device}}`.
 */
class m250509_074637_create_device_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->createTable('measurement', [
            'id' => $this->primaryKey(),
            'device_id' => $this->integer()->notNull(),
            'temperature' => $this->decimal(5, 2)->null(),
            'humidity' => $this->decimal(5, 2)->null(),
            'pressure' => $this->decimal(8, 2)->null(),
            'battery_level' => $this->decimal(5, 2)->null(),
            'raw_data' => $this->text()->null(),
            'measured_at' => $this->integer()->notNull(),
            'created_at' => $this->integer()->notNull(),
        ]);

        // Create index on device_id
        $this->createIndex(
            'idx_device_id',
            'measurement',
            'device_id'
        );

        // Create index on measured_at
        $this->createIndex(
            'idx_measured_at',
            'measurement',
            'measured_at'
        );

        // Add foreign key constraint
        $this->addForeignKey(
            'fk_measurement_device',
            'measurement',
            'device_id',
            'device',
            'id',
            'CASCADE',
            'NO ACTION'
        );
    }

    public function safeDown()
    {
        // Drop foreign key first
        $this->dropForeignKey('fk_measurement_device', 'measurement');
        
        // Then drop table
        $this->dropTable('measurement');
    }
}
