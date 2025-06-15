<?php

use yii\db\Migration;

class m250616_000002_create_verification_token_table extends Migration
{
    public function safeUp()
    {
        $this->createTable('{{%verification_token}}', [
            'id' => $this->primaryKey(),
            'device_id' => $this->integer()->notNull(),
            'token' => $this->string(255)->notNull()->unique(),
            'expiration_date' => $this->integer()->notNull(),
            'created_at' => $this->integer()->notNull(),
            'updated_at' => $this->integer()->notNull(),
            'used' => $this->boolean()->notNull()->defaultValue(false),
        ]);
        // Dodaj klucz obcy jeśli potrzebujesz:
        // $this->addForeignKey('fk_verification_token_device', '{{%verification_token}}', 'device_id', '{{%devices}}', 'device_id', 'CASCADE', 'CASCADE');
    }

    public function safeDown()
    {
        // $this->dropForeignKey('fk_verification_token_device', '{{%verification_token}}');
        $this->dropTable('{{%verification_token}}');
    }
} 