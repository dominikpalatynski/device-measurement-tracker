<?php

use yii\db\Migration;

/**
 * Handles the creation of table `{{%verification_token}}`.
 */
class m240517_000001_create_verification_token_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->createTable('{{%verification_token}}', [
            'id' => $this->primaryKey(),
            'device_id' => $this->integer()->notNull(),
            'token' => $this->string(255)->notNull()->unique(),
            'expiration_date' => $this->integer()->notNull(),
            'created_at' => $this->integer()->notNull(),
            'updated_at' => $this->integer()->notNull(),
        ]);

        // Dodanie klucza obcego
        $this->addForeignKey(
            'fk-verification_token-device_id',
            '{{%verification_token}}',
            'device_id',
            '{{%device}}',
            'id',
            'CASCADE',
            'CASCADE'
        );

        // Dodanie indeksu dla pola token
        $this->createIndex(
            'idx-verification_token-token',
            '{{%verification_token}}',
            'token'
        );

        // Dodanie indeksu dla pola expiration_date
        $this->createIndex(
            'idx-verification_token-expiration_date',
            '{{%verification_token}}',
            'expiration_date'
        );

        // Dodanie indeksu dla pola device_id
        $this->createIndex(
            'idx-verification_token-device_id',
            '{{%verification_token}}',
            'device_id'
        );
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        // Usunięcie klucza obcego
        $this->dropForeignKey(
            'fk-verification_token-device_id',
            '{{%verification_token}}'
        );

        // Usunięcie indeksów
        $this->dropIndex(
            'idx-verification_token-token',
            '{{%verification_token}}'
        );
        $this->dropIndex(
            'idx-verification_token-expiration_date',
            '{{%verification_token}}'
        );
        $this->dropIndex(
            'idx-verification_token-device_id',
            '{{%verification_token}}'
        );

        // Usunięcie tabeli
        $this->dropTable('{{%verification_token}}');
    }
} 