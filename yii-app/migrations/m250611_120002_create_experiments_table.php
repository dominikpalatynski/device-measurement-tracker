<?php

use yii\db\Migration;

/**
 * Handles the creation of table `{{%experiments}}`.
 */
class m250611_120002_create_experiments_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->createTable('{{%experiments}}', [
            'experiment_id' => $this->string(255)->notNull(),
            'device_id' => $this->string(255)->notNull(),
            'experiment_name' => $this->string(255)->notNull(),
            'start_time' => $this->timestamp()->notNull(),
            'end_time' => $this->timestamp()->null(),
            'description' => $this->text()->null(),
            'status' => "ENUM('Running', 'Completed', 'Scheduled', 'Failed') NOT NULL",
            'created_at' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP'),
            'updated_at' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        ]);

        // Add primary key
        $this->addPrimaryKey('pk_experiments_experiment_id', '{{%experiments}}', 'experiment_id');

        // Create indexes
        $this->createIndex(
            'idx_experiments_device_id',
            '{{%experiments}}',
            'device_id'
        );

        $this->createIndex(
            'idx_experiments_status',
            '{{%experiments}}',
            'status'
        );

        $this->createIndex(
            'idx_experiments_start_time',
            '{{%experiments}}',
            'start_time'
        );

        // Add foreign key constraint
        $this->addForeignKey(
            'fk_experiments_device',
            '{{%experiments}}',
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
        $this->dropForeignKey('fk_experiments_device', '{{%experiments}}');
        $this->dropTable('{{%experiments}}');
    }
}
