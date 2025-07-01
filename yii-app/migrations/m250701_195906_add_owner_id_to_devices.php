<?php

use yii\db\Migration;

class m250701_195906_add_owner_id_to_devices extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        // First, add owner_id column as nullable
        $this->addColumn('{{%devices}}', 'owner_id', $this->integer()->null()->after('device_type'));
        
        // Update existing devices to be owned by admin user (id=1)
        // This assumes the admin user has id=1
        $this->update('{{%devices}}', ['owner_id' => 1]);
        
        // Now make the column NOT NULL
        $this->alterColumn('{{%devices}}', 'owner_id', $this->integer()->notNull());
        
        // Add foreign key constraint to users table
        $this->addForeignKey(
            'fk_devices_owner_id',
            '{{%devices}}',
            'owner_id',
            '{{%users}}',
            'id',
            'CASCADE',
            'CASCADE'
        );
        
        // Create index for better performance
        $this->createIndex(
            'idx_devices_owner_id',
            '{{%devices}}',
            'owner_id'
        );
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        // Drop foreign key constraint
        $this->dropForeignKey('fk_devices_owner_id', '{{%devices}}');
        
        // Drop index
        $this->dropIndex('idx_devices_owner_id', '{{%devices}}');
        
        // Drop column
        $this->dropColumn('{{%devices}}', 'owner_id');
    }

    /*
    // Use up()/down() to run migration code without a transaction.
    public function up()
    {

    }

    public function down()
    {
        echo "m250701_195906_add_owner_id_to_devices cannot be reverted.\n";

        return false;
    }
    */
}
