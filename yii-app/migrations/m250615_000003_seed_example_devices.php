<?php

use yii\db\Migration;

/**
 * Class m250615_000003_seed_example_devices
 * Seeds the devices table with example device data for testing
 */
class m250615_000003_seed_example_devices extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        // Check if devices table exists
        if (!$this->db->schema->getTableSchema('devices')) {
            echo "Table 'devices' does not exist. Skipping seed migration.\n";
            return true;
        }

        // Insert example devices
        $this->batchInsert('devices', [
            'device_id',
            'device_name', 
            'device_type',
            'status'
        ], [
            [
                'DRONE_001_2025',
                'IoT Monitoring Drone #1',
                'Drone',
                'Active'
            ],
            [
                'DSP_SENSOR_001',
                'Digital Signal Processing Unit #1',
                'DSP',
                'Active'
            ],
            [
                'LINEAR_MOD_001',
                'Linear Module Sensor #1',
                'Linear Module',
                'Pending-Registration'
            ],
            [
                'DRONE_002_2025',
                'IoT Monitoring Drone #2',
                'Drone',
                'Not-Active'
            ],
            [
                'DSP_SENSOR_002',
                'Digital Signal Processing Unit #2',
                'DSP',
                'Active'
            ],
            [
                'LINEAR_MOD_002',
                'Linear Module Sensor #2',
                'Linear Module',
                'Active'
            ]
        ]);

        echo "Successfully inserted " . count([
            'DRONE_001_2025',
            'DSP_SENSOR_001',
            'LINEAR_MOD_001',
            'DRONE_002_2025',
            'DSP_SENSOR_002',
            'LINEAR_MOD_002'
        ]) . " example devices.\n";
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        // Remove the example devices
        $deviceIds = [
            'DRONE_001_2025',
            'DSP_SENSOR_001',
            'LINEAR_MOD_001',
            'DRONE_002_2025',
            'DSP_SENSOR_002',
            'LINEAR_MOD_002'
        ];

        foreach ($deviceIds as $deviceId) {
            $this->delete('devices', ['device_id' => $deviceId]);
        }

        echo "Successfully removed example devices.\n";
    }
}
