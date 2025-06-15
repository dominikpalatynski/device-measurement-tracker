<?php

use yii\db\Migration;

class m250614_071845_m240612_000001_add_deviceid_config_accesstoken_to_device_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        // This migration is now intentionally left blank because the 'device' table is not needed.
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        // This migration is now intentionally left blank because the 'device' table is not needed.
    }

    /*
    // Use up()/down() to run migration code without a transaction.
    public function up()
    {

    }

    public function down()
    {
        echo "m250614_071845_m240612_000001_add_deviceid_config_accesstoken_to_device_table cannot be reverted.\n";

        return false;
    }
    */
}
