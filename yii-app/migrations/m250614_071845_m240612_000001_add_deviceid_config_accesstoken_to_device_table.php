<?php

use yii\db\Migration;

class m250614_071845_m240612_000001_add_deviceid_config_accesstoken_to_device_table extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        $this->addColumn('device', 'device_id', $this->string(100)->unique()->after('id'));
        $this->addColumn('device', 'config', $this->text()->after('type'));
        $this->addColumn('device', 'access_token', $this->string(255)->after('config'));
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        $this->dropColumn('device', 'access_token');
        $this->dropColumn('device', 'config');
        $this->dropColumn('device', 'device_id');
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
