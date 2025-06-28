<?php

use yii\db\Migration;

/**
 * Renames experiments table to faults and updates related columns
 */
class m250627_000001_rename_experiments_to_faults extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        // Rename experiments table to faults
        $this->renameTable('{{%experiments}}', '{{%faults}}');
        
        // Rename columns in faults table
        $this->renameColumn('{{%faults}}', 'experiment_id', 'fault_id');
        $this->renameColumn('{{%faults}}', 'experiment_name', 'fault_name');
        
        // Update foreign key references in measurement_data table
        $this->renameColumn('{{%measurement_data}}', 'experiment_id', 'fault_id');
        
        // Update any other tables that reference experiment_id
        // Add more table updates as needed
        
        echo "Renamed experiments table to faults and updated column references.\n";
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        // Reverse the changes
        
        // Revert foreign key references in measurement_data table
        $this->renameColumn('{{%measurement_data}}', 'fault_id', 'experiment_id');
        
        // Revert columns in faults table
        $this->renameColumn('{{%faults}}', 'fault_id', 'experiment_id');
        $this->renameColumn('{{%faults}}', 'fault_name', 'experiment_name');
        
        // Rename faults table back to experiments
        $this->renameTable('{{%faults}}', '{{%experiments}}');
        
        echo "Reverted faults table back to experiments and restored column references.\n";
    }
}
