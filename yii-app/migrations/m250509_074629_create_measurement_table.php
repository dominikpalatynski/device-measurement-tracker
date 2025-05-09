<?php

use yii\db\Migration;

/**
 * Handles the creation of table `{{%measurement}}`.
 */
class m250509_074629_create_measurement_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->createTable('device', [
            'id' => $this->primaryKey(),
            'device_uuid' => $this->string(50)->notNull(),
            'name' => $this->string(100)->null(),
            'type' => $this->string(50)->null(),
            'status' => $this->tinyInteger()->notNull()->defaultValue(1),
            'last_seen_at' => $this->integer()->null(),
            'created_at' => $this->integer()->notNull(),
            'updated_at' => $this->integer()->notNull(),
        ]);

        // Create unique index on device_uuid
        $this->createIndex(
            'device_uuid_UNIQUE',
            'device',
            'device_uuid',
            true
        );
    }

    public function safeDown()
    {
        $this->dropTable('device');
    }
}
