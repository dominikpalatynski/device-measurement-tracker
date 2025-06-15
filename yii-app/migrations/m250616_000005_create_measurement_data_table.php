<?php

use yii\db\Migration;

class m250616_000005_create_measurement_data_table extends Migration
{
    public function safeUp()
    {
        $this->createTable('{{%measurement_data}}', [
            'data_id' => $this->primaryKey(),
            'device_id' => $this->string(255)->notNull(),
            'phenomenon_id' => $this->string(255)->null(),
            'data_payload' => $this->text()->null(),
            'timestamp' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP'),
        ]);
        $this->addForeignKey(
            'fk_measurement_data_device',
            '{{%measurement_data}}',
            'device_id',
            '{{%devices}}',
            'device_id',
            'CASCADE',
            'NO ACTION'
        );
    }

    public function safeDown()
    {
        $this->dropForeignKey('fk_measurement_data_device', '{{%measurement_data}}');
        $this->dropTable('{{%measurement_data}}');
    }
} 