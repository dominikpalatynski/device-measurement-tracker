<?php

use yii\db\Migration;

/**
 * Handles the creation of table `{{%unassigned_data}}`.
 */
class m250611_120003_create_unassigned_data_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->createTable('{{%unassigned_data}}', [
            'data_id' => $this->primaryKey(),
            'device_id' => $this->string(255)->notNull(),
            'data_payload' => 'JSON',
            'timestamp' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP'),
        ]);

        // Create index on device_id
        $this->createIndex(
            'idx_unassigned_data_device_id',
            '{{%unassigned_data}}',
            'device_id'
        );

        // Create index on timestamp
        $this->createIndex(
            'idx_unassigned_data_timestamp',
            '{{%unassigned_data}}',
            'timestamp'
        );

        // Add foreign key constraint
        $this->addForeignKey(
            'fk_unassigned_data_device',
            '{{%unassigned_data}}',
            'device_id',
            '{{%devices}}',
            'device_id',
            'CASCADE',
            'NO ACTION'
        );
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->dropForeignKey('fk_unassigned_data_device', '{{%unassigned_data}}');
        $this->dropTable('{{%unassigned_data}}');
    }
}
