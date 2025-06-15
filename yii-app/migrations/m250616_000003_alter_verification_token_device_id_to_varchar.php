<?php

use yii\db\Migration;

class m250616_000003_alter_verification_token_device_id_to_varchar extends Migration
{
    public function safeUp()
    {
        $this->alterColumn('{{%verification_token}}', 'device_id', $this->string(255)->notNull());
    }

    public function safeDown()
    {
        $this->alterColumn('{{%verification_token}}', 'device_id', $this->integer()->notNull());
    }
} 