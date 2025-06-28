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
        // Check if phenomena table exists and conditions table doesn't exist
        $phenomenaExists = $this->db->schema->getTableSchema('{{%phenomena}}') !== null;
        $conditionsExists = $this->db->schema->getTableSchema('{{%conditions}}') !== null;
        
        if ($phenomenaExists && !$conditionsExists) {
            // Rename phenomena table to conditions
            $this->renameTable('{{%phenomena}}', '{{%conditions}}');
        } elseif (!$phenomenaExists && $conditionsExists) {
            echo "Table already renamed from phenomena to conditions.\n";
        }
        
        // Check if columns need to be renamed in conditions table
        $conditionsSchema = $this->db->schema->getTableSchema('{{%conditions}}');
        if ($conditionsSchema) {
            $hasPhenomenonId = isset($conditionsSchema->columns['phenomenon_id']);
            $hasExperimentId = isset($conditionsSchema->columns['experiment_id']);
            
            if ($hasPhenomenonId) {
                $this->renameColumn('{{%conditions}}', 'phenomenon_id', 'condition_id');
            } else {
                echo "Column phenomenon_id already renamed to condition_id.\n";
            }
            
            if ($hasExperimentId) {
                $this->renameColumn('{{%conditions}}', 'experiment_id', 'fault_id');
            } else {
                echo "Column experiment_id already renamed to fault_id.\n";
            }
        }
        
        // Update foreign key references in measurement_data table
        $measurementSchema = $this->db->schema->getTableSchema('{{%measurement_data}}');
        if ($measurementSchema && isset($measurementSchema->columns['phenomenon_id'])) {
            $this->renameColumn('{{%measurement_data}}', 'phenomenon_id', 'condition_id');
        } else {
            echo "Column phenomenon_id already renamed to condition_id in measurement_data table.\n";
        }
        
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
        $measurementSchema = $this->db->schema->getTableSchema('{{%measurement_data}}');
        if ($measurementSchema && isset($measurementSchema->columns['condition_id'])) {
            $this->renameColumn('{{%measurement_data}}', 'condition_id', 'phenomenon_id');
        } else {
            echo "Column condition_id already renamed to phenomenon_id in measurement_data table.\n";
        }
        
        // Check if conditions table exists
        $conditionsExists = $this->db->schema->getTableSchema('{{%conditions}}') !== null;
        $phenomenaExists = $this->db->schema->getTableSchema('{{%phenomena}}') !== null;
        
        if ($conditionsExists) {
            // Revert columns in conditions table
            $conditionsSchema = $this->db->schema->getTableSchema('{{%conditions}}');
            $hasConditionId = isset($conditionsSchema->columns['condition_id']);
            $hasFaultId = isset($conditionsSchema->columns['fault_id']);
            
            if ($hasConditionId) {
                $this->renameColumn('{{%conditions}}', 'condition_id', 'phenomenon_id');
            } else {
                echo "Column condition_id already renamed to phenomenon_id.\n";
            }
            
            if ($hasFaultId) {
                $this->renameColumn('{{%conditions}}', 'fault_id', 'experiment_id');
            } else {
                echo "Column fault_id already renamed to experiment_id.\n";
            }
        }
        
        if ($conditionsExists && !$phenomenaExists) {
            // Rename conditions table back to phenomena
            $this->renameTable('{{%conditions}}', '{{%phenomena}}');
        } elseif (!$conditionsExists && $phenomenaExists) {
            echo "Table already renamed back from conditions to phenomena.\n";
        }
        
        echo "Reverted conditions table back to phenomena and restored column references.\n";
    }
}
