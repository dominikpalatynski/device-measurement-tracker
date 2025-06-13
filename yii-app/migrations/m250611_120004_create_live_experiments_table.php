<?php

use yii\db\Migration;

/**
 * Handles the creation of table `{{%live_experiments}}`.
 */
class m250611_120004_create_live_experiments_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->createTable('{{%live_experiments}}', [
            'live_experiment_id' => $this->primaryKey(),
            'experiment_id' => $this->string(255)->notNull(),
            'device_id' => $this->string(255)->notNull(),
            'stream_url' => $this->string(255)->null(),
            'is_active' => $this->boolean()->notNull()->defaultValue(true),
            'start_time' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP'),
            'end_time' => $this->timestamp()->null(),
        ]);

        // Create indexes
        $this->createIndex(
            'idx_live_experiments_experiment_id',
            '{{%live_experiments}}',
            'experiment_id'
        );

        $this->createIndex(
            'idx_live_experiments_device_id',
            '{{%live_experiments}}',
            'device_id'
        );

        $this->createIndex(
            'idx_live_experiments_is_active',
            '{{%live_experiments}}',
            'is_active'
        );

        // Add foreign key constraints
        $this->addForeignKey(
            'fk_live_experiments_experiment',
            '{{%live_experiments}}',
            'experiment_id',
            '{{%experiments}}',
            'experiment_id',
            'CASCADE',
            'NO ACTION'
        );

        $this->addForeignKey(
            'fk_live_experiments_device',
            '{{%live_experiments}}',
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
        $this->dropForeignKey('fk_live_experiments_experiment', '{{%live_experiments}}');
        $this->dropForeignKey('fk_live_experiments_device', '{{%live_experiments}}');
        $this->dropTable('{{%live_experiments}}');
    }
}
