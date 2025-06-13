<?php

use yii\db\Migration;

/**
 * Creates the device_management database and sets it up for use.
 */
class m250611_115900_create_device_management_database extends Migration
{
    /**
     * {@inheritdoc}
     */
    public function safeUp()
    {
        // Note: This migration assumes you have permissions to create databases
        // You may need to run this manually or adjust your database configuration
        
        $sql = "CREATE DATABASE IF NOT EXISTS device_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci";
        
        // Execute the SQL directly
        $this->execute($sql);
        
        echo "Database 'device_management' created successfully.\n";
        echo "Please update your database configuration to use the new database.\n";
    }

    /**
     * {@inheritdoc}
     */
    public function safeDown()
    {
        // Be very careful with dropping databases
        echo "WARNING: This will drop the entire device_management database!\n";
        echo "Uncomment the line below if you really want to drop the database.\n";
        
        // $this->execute("DROP DATABASE IF EXISTS device_management");
    }
}
