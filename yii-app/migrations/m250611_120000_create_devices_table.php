<?php

use yii\db\Migration;

/**
 * Handles the creation of table `{{%devices}}`.
 */
class m250611_120000_create_devices_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->createTable('{{%devices}}', [
            'device_id' => $this->string(255)->notNull(),
            'device_name' => $this->string(255)->notNull(),
            'device_type' => "ENUM('Drone', 'DSP', 'Linear Module') NOT NULL",
            'registration_date' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP'),
            'status' => "ENUM('Active', 'Pending-Registration', 'Not-Active') NOT NULL DEFAULT 'Pending-Registration'",
            'last_updated' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        ]);

        // Add primary key
        $this->addPrimaryKey('pk_devices_device_id', '{{%devices}}', 'device_id');

        // Create indexes
        $this->createIndex(
            'idx_devices_status',
            '{{%devices}}',
            'status'
        );

        $this->createIndex(
            'idx_devices_type',
            '{{%devices}}',
            'device_type'
        );
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->dropTable('{{%devices}}');
    }
}
