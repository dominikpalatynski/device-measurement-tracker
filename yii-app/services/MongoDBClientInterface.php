<?php

namespace app\services;

use MongoDB\Collection;

/**
 * Interface for MongoDB client operations
 * This allows us to inject mock clients for testing
 */
interface MongoDBClientInterface
{
    /**
     * Get a collection from the database
     * @param string $collectionName
     * @return Collection
     */
    public function getCollection(string $collectionName): Collection;
    
    /**
     * Test the connection to MongoDB
     * @return bool
     */
    public function testConnection(): bool;
    
    /**
     * Create indexes on a collection
     * @param string $collectionName
     * @param array $indexes
     * @return bool
     */
    public function createIndexes(string $collectionName, array $indexes): bool;
    
    /**
     * Close the connection
     * @return void
     */
    public function close(): void;
} 