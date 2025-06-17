<?php

use yii\db\Migration;

/**
 * Class m250617_000002_drop_live_experiments_table
 */
class m250617_000002_drop_live_experiments_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->dropTable('{{%live_experiments}}');
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->createTable('{{%live_experiments}}', [
            'live_experiment_id' => $this->string()->notNull()->unique(),
            'experiment_id' => $this->string()->notNull(),
            'device_id' => $this->string()->notNull(),
            'stream_url' => $this->string(),
            'is_active' => $this->boolean()->defaultValue(true),
            'start_time' => $this->dateTime()->notNull(),
            'end_time' => $this->dateTime(),
            'created_at' => $this->dateTime()->notNull(),
            'updated_at' => $this->dateTime(),
        ]);

        $this->addPrimaryKey('pk_live_experiments', '{{%live_experiments}}', 'live_experiment_id');
        $this->addForeignKey(
            'fk_live_experiments_experiment',
            '{{%live_experiments}}',
            'experiment_id',
            '{{%experiments}}',
            'experiment_id',
            'CASCADE',
            'CASCADE'
        );
        $this->addForeignKey(
            'fk_live_experiments_device',
            '{{%live_experiments}}',
            'device_id',
            '{{%devices}}',
            'device_id',
            'CASCADE',
            'CASCADE'
        );
    }
} 