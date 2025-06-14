-- Create a test device
INSERT INTO `device` 
(`id`, `device_uuid`, `name`, `type`, `status`, `created_at`, `updated_at`, `last_seen_at`) 
VALUES 
(2, 'test-device-uuid-1234562789', 'Test IoT Device', 'Drone', 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), UNIX_TIMESTAMP());

-- Add some test measurements for the device
-- Measurement from 1 hour ago
INSERT INTO `measurement` 
(`device_id`, `temperature`, `humidity`, `pressure`, `battery_level`, `raw_data`, `measured_at`, `created_at`) 
VALUES 
(1, 23.5, 45.7, 1013.25, 98.5, '{"extra": "data", "source": "test"}', UNIX_TIMESTAMP() - 3600, UNIX_TIMESTAMP() - 3600);

-- Measurement from 30 minutes ago
INSERT INTO `measurement` 
(`device_id`, `temperature`, `humidity`, `pressure`, `battery_level`, `raw_data`, `measured_at`, `created_at`) 
VALUES 
(1, 24.2, 46.1, 1012.9, 97.8, '{"extra": "data", "source": "test"}', UNIX_TIMESTAMP() - 1800, UNIX_TIMESTAMP() - 1800);

-- Measurement from now
INSERT INTO `measurement` 
(`device_id`, `temperature`, `humidity`, `pressure`, `battery_level`, `raw_data`, `measured_at`, `created_at`) 
VALUES 
(1, 25.0, 47.5, 1012.5, 97.0, '{"extra": "data", "source": "test"}', UNIX_TIMESTAMP(), UNIX_TIMESTAMP());

-- Add a second test device with different parameters
INSERT INTO `device` 
(`id`, `device_uuid`, `name`, `type`, `status`, `created_at`, `updated_at`, `last_seen_at`) 
VALUES 
(3, 'test-device-uuid-9876534321', 'Weather Station Alpha', 'DSP', 1, UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), UNIX_TIMESTAMP() - 900);


-- Add some test measurements for the second device
INSERT INTO `measurement` 
(`device_id`, `temperature`, `humidity`, `pressure`, `battery_level`, `raw_data`, `measured_at`, `created_at`) 
VALUES 
(2, 18.7, 65.3, 1015.3, 85.2, '{"extra": "data", "source": "test"}', UNIX_TIMESTAMP() - 1200, UNIX_TIMESTAMP() - 1200);

INSERT INTO `measurement` 
(`device_id`, `temperature`, `humidity`, `pressure`, `battery_level`, `raw_data`, `measured_at`, `created_at`) 
VALUES 
(2, 19.1, 63.7, 1014.8, 83.8, '{"extra": "data", "source": "test"}', UNIX_TIMESTAMP() - 600, UNIX_TIMESTAMP() - 600);

-- Create a device with 'Pending-Registration' status
INSERT INTO `device` 
(`id`, `device_uuid`, `name`, `type`, `status`, `created_at`, `updated_at`, `last_seen_at`) 
VALUES 
(4, 'pending-device-uuid-123345', 'New Sensor', 'Linear Module', 0, UNIX_TIMESTAMP(), UNIX_TIMESTAMP(), NULL);
