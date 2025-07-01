<?php

use yii\db\Migration;

/**
 * Handles the creation of table `{{%users}}`.
 */
class m250101_120000_create_users_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->createTable('{{%users}}', [
            'id' => $this->primaryKey(),
            'username' => $this->string(255)->notNull()->unique(),
            'email' => $this->string(255)->notNull()->unique(),
            'password_hash' => $this->string(255)->notNull(),
            'first_name' => $this->string(100),
            'last_name' => $this->string(100),
            'role' => $this->string(20)->notNull()->defaultValue('normal'),
            'status' => $this->string(20)->notNull()->defaultValue('active'),
            'auth_key' => $this->string(32),
            'access_token' => $this->string(255)->unique(),
            'password_reset_token' => $this->string(255)->unique(),
            'email_verification_token' => $this->string(255)->unique(),
            'last_login_at' => $this->timestamp(),
            'created_at' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP'),
            'updated_at' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
        ]);

        // Create indexes
        $this->createIndex('idx-users-username', '{{%users}}', 'username');
        $this->createIndex('idx-users-email', '{{%users}}', 'email');
        $this->createIndex('idx-users-role', '{{%users}}', 'role');
        $this->createIndex('idx-users-status', '{{%users}}', 'status');
        $this->createIndex('idx-users-access_token', '{{%users}}', 'access_token');
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->dropTable('{{%users}}');
    }
}
