<?php

namespace app\services;

use MongoDB\Client;
use MongoDB\Collection;
use MongoDB\Database;
use MongoDB\Exception\Exception as MongoDBException;
use Exception;

/**
 * Concrete implementation of MongoDBClientInterface
 * Wraps the actual MongoDB client for production use
 */
class MongoDBClientWrapper implements MongoDBClientInterface
{
    private Client $client;
    private Database $database;
    private string $connectionString;
    private string $databaseName;
    
    public function __construct(
        string $connectionString = 'mongodb://admin:password@localhost:27017',
        string $databaseName = 'device_measurements'
    ) {
        $this->connectionString = $connectionString;
        $this->databaseName = $databaseName;
        $this->initConnection();
    }
    
    private function initConnection(): void
    {
        try {
            $this->client = new Client($this->connectionString);
            $this->database = $this->client->selectDatabase($this->databaseName);
            
            // Test the connection
            $this->client->listDatabases();
            
            \Yii::info("MongoDB connection established successfully");
        } catch (Exception $e) {
            \Yii::error("Failed to connect to MongoDB: " . $e->getMessage());
            throw $e;
        }
    }
    
    public function getCollection(string $collectionName): Collection
    {
        return $this->database->selectCollection($collectionName);
    }
    
    public function testConnection(): bool
    {
        try {
            $this->client->listDatabases();
            return true;
        } catch (Exception $e) {
            \Yii::error("MongoDB connection test failed: " . $e->getMessage());
            return false;
        }
    }
    
    public function createIndexes(string $collectionName, array $indexes): bool
    {
        try {
            $collection = $this->getCollection($collectionName);
            
            foreach ($indexes as $index) {
                $collection->createIndex($index);
            }
            
            \Yii::info("MongoDB indexes created successfully for collection: {$collectionName}");
            return true;
        } catch (Exception $e) {
            \Yii::warning("Failed to create some MongoDB indexes: " . $e->getMessage());
            return false;
        }
    }
    
    public function close(): void
    {
        // MongoDB PHP driver handles connection cleanup automatically
        // This method is here for interface compliance and future extensibility
    }
} 