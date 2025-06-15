<?php

use yii\db\Migration;

class m250616_000004_add_config_to_devices_table extends Migration
{
    public function safeUp()
    {
        $this->addColumn('{{%devices}}', 'config', $this->json()->null()->after('last_updated'));
    }

    public function safeDown()
    {
        $this->dropColumn('{{%devices}}', 'config');
    }
} 