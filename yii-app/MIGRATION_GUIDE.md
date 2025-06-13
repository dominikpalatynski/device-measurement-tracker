# Database Migration Guide for Device Management System

## Overview
This guide explains how to run the new migrations for the device management system with the following new tables:
- devices
- device_configurations  
- experiments
- unassigned_data
- live_experiments

## Migration Files Created
1. `m250611_115900_create_device_management_database.php` - Creates the new database
2. `m250611_120000_create_devices_table.php` - Creates devices table
3. `m250611_120001_create_device_configurations_table.php` - Creates device_configurations table
4. `m250611_120002_create_experiments_table.php` - Creates experiments table
5. `m250611_120003_create_unassigned_data_table.php` - Creates unassigned_data table
6. `m250611_120004_create_live_experiments_table.php` - Creates live_experiments table

## Prerequisites
1. Make sure Docker containers are running:
   ```bash
   cd c:\Users\sawar\OneDrive\Desktop\device-measurement-tracker
   docker-compose up -d
   ```

2. Ensure you have access to the Yii2 application directory:
   ```bash
   cd c:\Users\sawar\OneDrive\Desktop\device-measurement-tracker\yii-app
   ```

## Option 1: Create New Database and Run Migrations

### Step 1: Update Database Configuration (Optional)
If you want to use the new `device_management` database, update `config/db.php`:

```php
<?php
return [
    'class' => 'yii\db\Connection',
    'dsn' => 'mysql:host=127.0.0.1;dbname=device_management',
    'username' => 'iot_user',
    'password' => 'iot_password',
    'charset' => 'utf8',
];
```

### Step 2: Run Migrations
```bash
# Navigate to the yii-app directory
cd c:\Users\sawar\OneDrive\Desktop\device-measurement-tracker\yii-app

# Run all pending migrations
php yii migrate
```

## Option 2: Add Tables to Existing Database

If you want to add the new tables to your existing `iot_monitoring` database:

### Step 1: Skip the database creation migration
```bash
# Mark the database creation migration as applied without running it
php yii migrate/mark m250611_115900_create_device_management_database
```

### Step 2: Run the table creation migrations
```bash
php yii migrate
```

## Option 3: Manual Database Creation

You can also create the database manually using MySQL command line or phpMyAdmin:

### Using MySQL Command Line:
```sql
CREATE DATABASE IF NOT EXISTS device_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE device_management;
```

Then run the migrations:
```bash
php yii migrate
```

## Verification

After running the migrations, verify the tables were created:

### Check migration status:
```bash
php yii migrate/history
```

### Connect to MySQL and verify tables:
```bash
# Connect to MySQL (you may need to install MySQL client or use Docker)
mysql -h 127.0.0.1 -u iot_user -p

# In MySQL prompt:
USE device_management;  # or iot_monitoring if using existing DB
SHOW TABLES;
DESCRIBE devices;
DESCRIBE device_configurations;
DESCRIBE experiments;
DESCRIBE unassigned_data;
DESCRIBE live_experiments;
```

## Rollback (if needed)

To rollback migrations:
```bash
# Rollback the last migration
php yii migrate/down

# Rollback specific number of migrations
php yii migrate/down 5

# Rollback to specific migration
php yii migrate/to m250611_115900_create_device_management_database
```

## Troubleshooting

### Common Issues:

1. **Permission Denied**: Make sure the database user has CREATE privileges
2. **Connection Failed**: Verify Docker containers are running and database credentials are correct
3. **Migration Already Applied**: Use `php yii migrate/history` to check applied migrations

### Database Permissions:
If you get permission errors, you may need to grant additional privileges:
```sql
GRANT ALL PRIVILEGES ON device_management.* TO 'iot_user'@'%';
GRANT CREATE ON *.* TO 'iot_user'@'%';
FLUSH PRIVILEGES;
```

## Next Steps

After successful migration:
1. Create corresponding Yii2 models for the new tables
2. Update your API controllers to handle the new entities
3. Update the frontend to work with the new data structure
4. Test the integration between devices, experiments, and configurations

## File Locations
- Migration files: `yii-app/migrations/`
- Database config: `yii-app/config/db.php`
- Models (to be created): `yii-app/models/`
