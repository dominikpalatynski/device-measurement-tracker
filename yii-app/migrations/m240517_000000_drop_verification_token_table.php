<?php

use yii\db\Migration;

/**
 * Handles dropping of table `{{%verification_token}}`.
 */
class m240517_000000_drop_verification_token_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->dropTable('{{%verification_token}}');
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        // Nie możemy przywrócić tabeli, ponieważ nie mamy jej struktury
        return false;
    }
} 