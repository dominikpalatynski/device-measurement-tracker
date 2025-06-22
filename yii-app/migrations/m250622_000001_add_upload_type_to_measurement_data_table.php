<?php

use yii\db\Migration;

/**
 * Handles adding column 'upload_type' to table 'measurement_data'.
 */
class m250622_000001_add_upload_type_to_measurement_data_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->addColumn('{{%measurement_data}}', 'upload_type', "ENUM('batch', 'stream') NOT NULL DEFAULT 'batch'");
        $this->createIndex('idx_measurement_data_upload_type', '{{%measurement_data}}', 'upload_type');
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->dropIndex('idx_measurement_data_upload_type', '{{%measurement_data}}');
        $this->dropColumn('{{%measurement_data}}', 'upload_type');
    }
}
