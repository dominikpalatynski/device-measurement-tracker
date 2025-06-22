<?php

use yii\db\Migration;

/**
 * Class m250622_000002_update_device_types_to_motor_types
 * Updates device types from Drone/DSP/Linear Module to motor-specific types
 */
class m250622_000002_update_device_types_to_motor_types extends Migration
{    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        // First, modify the column to allow both old and new values temporarily
        $this->alterColumn('devices', 'device_type', "ENUM('Drone', 'DSP', 'Linear Module', 'pmsm-mechanical-vibration', 'bldc-high-speed', 'pmsm-torque-load') NOT NULL");

        // Then update existing device records to new types
        $this->update('devices', ['device_type' => 'pmsm-mechanical-vibration'], ['device_type' => 'Drone']);
        $this->update('devices', ['device_type' => 'bldc-high-speed'], ['device_type' => 'DSP']);
        $this->update('devices', ['device_type' => 'pmsm-torque-load'], ['device_type' => 'Linear Module']);

        // Finally, modify the column definition to only use new ENUM values
        $this->alterColumn('devices', 'device_type', "ENUM('pmsm-mechanical-vibration', 'bldc-high-speed', 'pmsm-torque-load') NOT NULL");

        echo "Successfully updated device types from Drone/DSP/Linear Module to motor-specific types.\n";
    }    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        // First, modify the column to allow both old and new values temporarily
        $this->alterColumn('devices', 'device_type', "ENUM('Drone', 'DSP', 'Linear Module', 'pmsm-mechanical-vibration', 'bldc-high-speed', 'pmsm-torque-load') NOT NULL");
        
        // Then update the data back to old types
        $this->update('devices', ['device_type' => 'Drone'], ['device_type' => 'pmsm-mechanical-vibration']);
        $this->update('devices', ['device_type' => 'DSP'], ['device_type' => 'bldc-high-speed']);
        $this->update('devices', ['device_type' => 'Linear Module'], ['device_type' => 'pmsm-torque-load']);

        // Finally, revert to old ENUM values only
        $this->alterColumn('devices', 'device_type', "ENUM('Drone', 'DSP', 'Linear Module') NOT NULL");

        echo "Successfully reverted device types back to Drone/DSP/Linear Module.\n";
    }
}
