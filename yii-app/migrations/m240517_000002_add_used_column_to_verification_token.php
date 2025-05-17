<?php

use yii\db\Migration;

/**
 * Handles adding used column to table `{{%verification_token}}`.
 */
class m240517_000002_add_used_column_to_verification_token extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->addColumn('{{%verification_token}}', 'used', $this->boolean()->notNull()->defaultValue(false));
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->dropColumn('{{%verification_token}}', 'used');
    }
} 