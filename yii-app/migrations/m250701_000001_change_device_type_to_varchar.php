<?php

use yii\db\Migration;

/**
 * Changes the device_type field from ENUM to VARCHAR to allow custom device types
 */
class m250701_000001_change_device_type_to_varchar extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        // Change the device_type column from ENUM to VARCHAR(255)
        $this->alterColumn('{{%devices}}', 'device_type', 'VARCHAR(255) NOT NULL');
        
        echo "Successfully changed device_type field from ENUM to VARCHAR(255). Users can now enter any device type.\n";
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        // First, we need to check if there are any custom device types that don't fit the old ENUM
        $customTypes = $this->db->createCommand(
            "SELECT DISTINCT device_type FROM {{%devices}} 
             WHERE device_type NOT IN ('pmsm-mechanical-vibration', 'bldc-high-speed', 'pmsm-torque-load')"
        )->queryAll();
        
        if (!empty($customTypes)) {
            echo "Warning: Found custom device types that cannot be reverted to ENUM:\n";
            foreach ($customTypes as $type) {
                echo "  - " . $type['device_type'] . "\n";
            }
            echo "Converting custom types to 'pmsm-mechanical-vibration' for compatibility.\n";
            
            // Update custom types to a default value
            $this->update(
                '{{%devices}}', 
                ['device_type' => 'pmsm-mechanical-vibration'], 
                ['NOT IN', 'device_type', ['pmsm-mechanical-vibration', 'bldc-high-speed', 'pmsm-torque-load']]
            );
        }
        
        // Revert to the original ENUM definition
        $this->alterColumn('{{%devices}}', 'device_type', "ENUM('pmsm-mechanical-vibration', 'bldc-high-speed', 'pmsm-torque-load') NOT NULL");
        
        echo "Reverted device_type field back to ENUM with predefined values.\n";
    }
}
