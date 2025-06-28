<?php

use yii\db\Migration;

/**
 * Renames phenomena table to conditions and updates related columns
 */
class m250627_000002_rename_phenomena_to_conditions extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        // Rename phenomena table to conditions
        $this->renameTable('{{%phenomena}}', '{{%conditions}}');
        
        // Rename columns in conditions table
        $this->renameColumn('{{%conditions}}', 'phenomenon_id', 'condition_id');
        $this->renameColumn('{{%conditions}}', 'experiment_id', 'fault_id');
        
        // Update foreign key references in measurement_data table
        $this->renameColumn('{{%measurement_data}}', 'phenomenon_id', 'condition_id');
        
        // Update any other tables that reference phenomenon_id
        // Add more table updates as needed
        
        echo "Renamed phenomena table to conditions and updated column references.\n";
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        // Reverse the changes
        
        // Revert foreign key references in measurement_data table
        $this->renameColumn('{{%measurement_data}}', 'condition_id', 'phenomenon_id');
        
        // Revert columns in conditions table
        $this->renameColumn('{{%conditions}}', 'condition_id', 'phenomenon_id');
        $this->renameColumn('{{%conditions}}', 'fault_id', 'experiment_id');
        
        // Rename conditions table back to phenomena
        $this->renameTable('{{%conditions}}', '{{%phenomena}}');
        
        echo "Reverted conditions table back to phenomena and restored column references.\n";
    }
}
