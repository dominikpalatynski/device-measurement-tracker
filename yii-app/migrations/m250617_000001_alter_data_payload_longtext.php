<?php

use yii\db\Migration;

/**
 * Alters data_payload column to LONGTEXT in measurement_data table.
 */
class m250617_000001_alter_data_payload_longtext extends Migration
{
    public function safeUp()
    {
        $this->alterColumn('{{%measurement_data}}', 'data_payload', 'LONGTEXT');
    }

    public function safeDown()
    {
        $this->alterColumn('{{%measurement_data}}', 'data_payload', $this->text());
    }
} 