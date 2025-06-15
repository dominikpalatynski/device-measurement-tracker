<?php

use yii\db\Migration;

class m250616_000006_drop_unassigned_data_table extends Migration
{
    public function safeUp()
    {
        $this->dropTable('{{%unassigned_data}}');
    }

    public function safeDown()
    {
        // Optionally, you could recreate the table here if needed
        // For now, just throw an exception
        throw new \yii\db\Exception('Cannot revert drop of unassigned_data table.');
    }
} 