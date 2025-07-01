<?php

use yii\db\Migration;

/**
 * Handles seeding the default admin user.
 */
class m250101_120001_seed_admin_user extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->insert('{{%users}}', [
            'username' => 'admin',
            'email' => 'admin@example.com',
            'password_hash' => Yii::$app->security->generatePasswordHash('admin123'),
            'first_name' => 'System',
            'last_name' => 'Administrator',
            'role' => 'admin',
            'status' => 'active',
            'auth_key' => Yii::$app->security->generateRandomString(),
            'created_at' => new \yii\db\Expression('NOW()'),
            'updated_at' => new \yii\db\Expression('NOW()'),
        ]);

        // Create a normal user as well
        $this->insert('{{%users}}', [
            'username' => 'user',
            'email' => 'user@example.com',
            'password_hash' => Yii::$app->security->generatePasswordHash('user123'),
            'first_name' => 'Normal',
            'last_name' => 'User',
            'role' => 'normal',
            'status' => 'active',
            'auth_key' => Yii::$app->security->generateRandomString(),
            'created_at' => new \yii\db\Expression('NOW()'),
            'updated_at' => new \yii\db\Expression('NOW()'),
        ]);
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->delete('{{%users}}', ['username' => ['admin', 'user']]);
    }
}
