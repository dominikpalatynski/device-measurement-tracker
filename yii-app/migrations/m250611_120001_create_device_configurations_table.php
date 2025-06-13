<?php

use yii\db\Migration;

/**
 * Handles the creation of table `{{%device_configurations}}`.
 */
class m250611_120001_create_device_configurations_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->createTable('{{%device_configurations}}', [
            'config_id' => $this->primaryKey(),
            'device_id' => $this->string(255)->notNull(),
            'configuration_details' => 'JSON',
            'created_at' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP'),
            'updated_at' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        ]);

        // Create index on device_id
        $this->createIndex(
            'idx_device_configurations_device_id',
            '{{%device_configurations}}',
            'device_id'
        );

        // Add foreign key constraint
        $this->addForeignKey(
            'fk_device_configurations_device',
            '{{%device_configurations}}',
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
        $this->dropForeignKey('fk_device_configurations_device', '{{%device_configurations}}');
        $this->dropTable('{{%device_configurations}}');
    }
}
