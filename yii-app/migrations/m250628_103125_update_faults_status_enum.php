<?php

use yii\db\Migration;

/**
 * Updates the faults table status enum to match the model constants
 */
class m250628_103125_update_faults_status_enum extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        // First, update existing data to map old status values to new ones
        $this->update('{{%faults}}', ['status' => 'Active'], ['status' => 'Running']);
        $this->update('{{%faults}}', ['status' => 'Active'], ['status' => 'Scheduled']);
        $this->update('{{%faults}}', ['status' => 'Inactive'], ['status' => 'Completed']);
        $this->update('{{%faults}}', ['status' => 'Inactive'], ['status' => 'Failed']);
        
        // Now update the enum definition to match the model constants
        $this->alterColumn('{{%faults}}', 'status', "ENUM('Active','Inactive') NOT NULL");
        
        echo "Updated faults status enum to match model constants (Active, Inactive).\n";
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        // Revert the enum definition
        $this->alterColumn('{{%faults}}', 'status', "ENUM('Running','Completed','Scheduled','Failed') NOT NULL");
        
        // Revert the data mapping
        $this->update('{{%faults}}', ['status' => 'Running'], ['status' => 'Active']);
        $this->update('{{%faults}}', ['status' => 'Completed'], ['status' => 'Inactive']);
        
        echo "Reverted faults status enum to original values (Running, Completed, Scheduled, Failed).\n";
    }

    /*
    // Use up()/down() to run migration code without a transaction.
    public function up()
    {

    }

    public function down()
    {
        echo "m250628_103125_update_faults_status_enum cannot be reverted.\n";

        return false;
    }
    */
}
