<?php

use yii\db\Migration;

/**
 * Simplifies the conditions table status ENUM from 4 states to 2 states
 * Maps: Pending/Finished/Stopped -> Inactive, Active -> Active
 */
class m250102_120000_simplify_conditions_status_enum extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        // Check if conditions table exists
        $tableExists = $this->db->getTableSchema('{{%conditions}}', true) !== null;
        
        if (!$tableExists) {
            echo "Conditions table does not exist, skipping migration.\n";
            return true;
        }

        echo "Simplifying conditions status ENUM...\n";

        // Step 1: Add temporary column with new ENUM
        echo "Adding temporary status column with new ENUM...\n";
        $this->addColumn('{{%conditions}}', 'status_new', "ENUM('Active', 'Inactive') NOT NULL DEFAULT 'Inactive'");

        // Step 2: Copy and transform data to new column
        echo "Mapping existing status values:\n";
        
        // Map 'Active' to 'Active'
        $activeCount = $this->db->createCommand("UPDATE {{%conditions}} SET status_new = 'Active' WHERE status = 'Active'")->execute();
        if ($activeCount > 0) {
            echo "  - Kept $activeCount 'Active' records as 'Active'\n";
        }
        
        // Map 'Pending' to 'Inactive'
        $pendingCount = $this->db->createCommand("UPDATE {{%conditions}} SET status_new = 'Inactive' WHERE status = 'Pending'")->execute();
        if ($pendingCount > 0) {
            echo "  - Converted $pendingCount 'Pending' records to 'Inactive'\n";
        }
        
        // Map 'Finished' to 'Inactive'
        $finishedCount = $this->db->createCommand("UPDATE {{%conditions}} SET status_new = 'Inactive' WHERE status = 'Finished'")->execute();
        if ($finishedCount > 0) {
            echo "  - Converted $finishedCount 'Finished' records to 'Inactive'\n";
        }
        
        // Map 'Stopped' to 'Inactive'
        $stoppedCount = $this->db->createCommand("UPDATE {{%conditions}} SET status_new = 'Inactive' WHERE status = 'Stopped'")->execute();
        if ($stoppedCount > 0) {
            echo "  - Converted $stoppedCount 'Stopped' records to 'Inactive'\n";
        }

        // Step 3: Drop old column
        echo "Dropping old status column...\n";
        $this->dropColumn('{{%conditions}}', 'status');

        // Step 4: Rename new column to original name
        echo "Renaming new column to 'status'...\n";
        $this->renameColumn('{{%conditions}}', 'status_new', 'status');

        echo "✅ Successfully simplified conditions status ENUM to 'Active' and 'Inactive'\n";
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        // Check if conditions table exists
        $tableExists = $this->db->getTableSchema('{{%conditions}}', true) !== null;
        
        if (!$tableExists) {
            echo "Conditions table does not exist, skipping rollback.\n";
            return true;
        }

        echo "Reverting conditions status ENUM to original 4-state version...\n";

        // Step 1: Add temporary column with original ENUM
        echo "Adding temporary status column with original ENUM...\n";
        $this->addColumn('{{%conditions}}', 'status_old', "ENUM('Pending', 'Active', 'Finished', 'Stopped') NOT NULL DEFAULT 'Pending'");

        // Step 2: Map simplified statuses back to more detailed ones
        echo "Mapping status values back:\n";
        
        // 'Active' remains 'Active'
        $activeCount = $this->db->createCommand("UPDATE {{%conditions}} SET status_old = 'Active' WHERE status = 'Active'")->execute();
        if ($activeCount > 0) {
            echo "  - Kept $activeCount 'Active' records as 'Active'\n";
        }
        
        // Map 'Inactive' to 'Stopped' (safest default for inactive states)
        $inactiveCount = $this->db->createCommand("UPDATE {{%conditions}} SET status_old = 'Stopped' WHERE status = 'Inactive'")->execute();
        if ($inactiveCount > 0) {
            echo "  - Converted $inactiveCount 'Inactive' records to 'Stopped'\n";
        }

        // Step 3: Drop simplified column
        echo "Dropping simplified status column...\n";
        $this->dropColumn('{{%conditions}}', 'status');

        // Step 4: Rename old column back
        echo "Renaming column back to 'status'...\n";
        $this->renameColumn('{{%conditions}}', 'status_old', 'status');

        echo "✅ Successfully reverted to original 4-state ENUM\n";
        echo "⚠️  Note: Original status distinctions (Pending/Finished/Stopped) were lost and mapped to 'Stopped'\n";
    }
} 