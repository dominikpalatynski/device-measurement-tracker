<?php

use yii\db\Migration;

class m250616_000005_create_measurement_data_table extends Migration
{    public function safeUp()
    {
        $this->createTable('{{%measurement_data}}', [
            'data_id' => $this->primaryKey(),
            'device_id' => $this->string(255)->notNull(),
            'phenomenon_id' => $this->string(255)->null(),
            'data_payload' => $this->getDb()->getSchema()->createColumnSchemaBuilder('longtext')->null(),
            'timestamp' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP'),
        ]);
        
        // Add index on device_id for better query performance
        $this->createIndex(
            'idx_measurement_data_device_id',
            '{{%measurement_data}}',
            'device_id'
        );
        
        // Add index on phenomenon_id for better query performance
        $this->createIndex(
            'idx_measurement_data_phenomenon_id',
            '{{%measurement_data}}',
            'phenomenon_id'
        );
        
        // Add foreign key constraint
        $this->addForeignKey(
            'fk_measurement_data_device',
            '{{%measurement_data}}',
            'device_id',
            '{{%devices}}',
            'device_id',
            'CASCADE',
            'NO ACTION'
        );
    }    public function safeDown()
    {
        $this->dropForeignKey('fk_measurement_data_device', '{{%measurement_data}}');
        $this->dropIndex('idx_measurement_data_device_id', '{{%measurement_data}}');
        $this->dropIndex('idx_measurement_data_phenomenon_id', '{{%measurement_data}}');
        $this->dropTable('{{%measurement_data}}');
    }
} 