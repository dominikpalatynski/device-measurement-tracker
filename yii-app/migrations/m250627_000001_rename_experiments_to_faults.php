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
        // Check if experiments table exists and faults table doesn't exist
        $experimentsExists = $this->db->schema->getTableSchema('{{%experiments}}') !== null;
        $faultsExists = $this->db->schema->getTableSchema('{{%faults}}') !== null;
        
        if ($experimentsExists && !$faultsExists) {
            // Rename experiments table to faults
            $this->renameTable('{{%experiments}}', '{{%faults}}');
        } elseif (!$experimentsExists && $faultsExists) {
            echo "Table already renamed from experiments to faults.\n";
        }
        
        // Check if columns need to be renamed in faults table
        $faultsSchema = $this->db->schema->getTableSchema('{{%faults}}');
        if ($faultsSchema) {
            $hasExperimentId = isset($faultsSchema->columns['experiment_id']);
            $hasExperimentName = isset($faultsSchema->columns['experiment_name']);
            
            if ($hasExperimentId) {
                $this->renameColumn('{{%faults}}', 'experiment_id', 'fault_id');
            } else {
                echo "Column experiment_id already renamed to fault_id.\n";
            }
            
            if ($hasExperimentName) {
                $this->renameColumn('{{%faults}}', 'experiment_name', 'fault_name');
            } else {
                echo "Column experiment_name already renamed to fault_name.\n";
            }
        }
        
        // Note: measurement_data table has phenomenon_id, not experiment_id
        // This will be handled in the second migration (rename_phenomena_to_conditions)
        
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
        
        // Note: measurement_data table changes are handled in the second migration
        
        // Check if faults table exists and experiments table doesn't exist
        $faultsExists = $this->db->schema->getTableSchema('{{%faults}}') !== null;
        $experimentsExists = $this->db->schema->getTableSchema('{{%experiments}}') !== null;
        
        if ($faultsExists) {
            // Check if columns need to be renamed back in faults table
            $faultsSchema = $this->db->schema->getTableSchema('{{%faults}}');
            $hasFaultId = isset($faultsSchema->columns['fault_id']);
            $hasFaultName = isset($faultsSchema->columns['fault_name']);
            
            if ($hasFaultId) {
                $this->renameColumn('{{%faults}}', 'fault_id', 'experiment_id');
            } else {
                echo "Column fault_id already renamed to experiment_id.\n";
            }
            
            if ($hasFaultName) {
                $this->renameColumn('{{%faults}}', 'fault_name', 'experiment_name');
            } else {
                echo "Column fault_name already renamed to experiment_name.\n";
            }
        }
        
        if ($faultsExists && !$experimentsExists) {
            // Rename faults table back to experiments
            $this->renameTable('{{%faults}}', '{{%experiments}}');
        } elseif (!$faultsExists && $experimentsExists) {
            echo "Table already renamed back from faults to experiments.\n";
        }
        
        echo "Reverted faults table back to experiments and restored column references.\n";
    }
}
