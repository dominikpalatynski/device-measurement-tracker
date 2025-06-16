<?php

use yii\db\Migration;

/**
 * Handles adding column 'type' to table 'experiments'.
 */
class m250618_000001_add_type_to_experiments_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->addColumn('{{%experiments}}', 'type', "ENUM('batch', 'stream') NOT NULL DEFAULT 'batch'");
        $this->createIndex('idx_experiments_type', '{{%experiments}}', 'type');
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->dropIndex('idx_experiments_type', '{{%experiments}}');
        $this->dropColumn('{{%experiments}}', 'type');
    }
} 