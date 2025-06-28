<?php

use yii\db\Migration;

/**
 * Fixes the conditions table column names to match the model
 */
class m250628_104107_fix_conditions_table_columns extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        // Check if columns need to be renamed in conditions table
        $conditionsSchema = $this->db->schema->getTableSchema('{{%conditions}}');
        
        if ($conditionsSchema) {
            // Rename phenomenon_id to condition_id if it exists
            if (isset($conditionsSchema->columns['phenomenon_id'])) {
                $this->renameColumn('{{%conditions}}', 'phenomenon_id', 'condition_id');
                echo "Renamed phenomenon_id to condition_id in conditions table.\n";
            } else {
                echo "Column phenomenon_id already renamed to condition_id.\n";
            }
            
            // Rename experiment_id to fault_id if it exists
            if (isset($conditionsSchema->columns['experiment_id'])) {
                $this->renameColumn('{{%conditions}}', 'experiment_id', 'fault_id');
                echo "Renamed experiment_id to fault_id in conditions table.\n";
            } else {
                echo "Column experiment_id already renamed to fault_id.\n";
            }
        }
        
        echo "Fixed conditions table columns to match model expectations.\n";
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        // Revert the column names back
        $conditionsSchema = $this->db->schema->getTableSchema('{{%conditions}}');
        
        if ($conditionsSchema) {
            // Revert condition_id to phenomenon_id if it exists
            if (isset($conditionsSchema->columns['condition_id'])) {
                $this->renameColumn('{{%conditions}}', 'condition_id', 'phenomenon_id');
                echo "Reverted condition_id to phenomenon_id in conditions table.\n";
            }
            
            // Revert fault_id to experiment_id if it exists
            if (isset($conditionsSchema->columns['fault_id'])) {
                $this->renameColumn('{{%conditions}}', 'fault_id', 'experiment_id');
                echo "Reverted fault_id to experiment_id in conditions table.\n";
            }
        }
        
        echo "Reverted conditions table columns to original names.\n";
    }

    /*
    // Use up()/down() to run migration code without a transaction.
    public function up()
    {

    }

    public function down()
    {
        echo "m250628_104107_fix_conditions_table_columns cannot be reverted.\n";

        return false;
    }
    */
}
