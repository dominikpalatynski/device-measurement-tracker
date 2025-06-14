<?php

use yii\db\Migration;

/**
 * Handles the creation of table `{{%phenomena}}`.
 */
class m250615_000002_create_phenomena_table extends Migration
{
    /**
     * {@inheritdoc}
     */    public function safeUp()
    {
        // Check if table already exists
        $tableExists = $this->db->getTableSchema('{{%phenomena}}', true) !== null;
        
        if (!$tableExists) {
            $this->createTable('{{%phenomena}}', [
                'id' => $this->primaryKey(),
                'phenomenon_id' => $this->string(50)->notNull()->unique(),
                'experiment_id' => $this->string(50)->notNull(),
                'name' => $this->string(255)->notNull(),
                'description' => $this->text()->null(),
                'status' => "ENUM('Pending', 'Active', 'Finished', 'Stopped') NOT NULL DEFAULT 'Pending'",
                'start_time' => $this->dateTime()->null(),
                'end_time' => $this->dateTime()->null(),
                'created_at' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP'),
                'updated_at' => $this->timestamp()->defaultExpression('CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP'),
            ]);

            // Create indexes
            $this->createIndex(
                'idx_phenomena_phenomenon_id',
                '{{%phenomena}}',
                'phenomenon_id'
            );

            $this->createIndex(
                'idx_phenomena_experiment_id',
                '{{%phenomena}}',
                'experiment_id'
            );

            $this->createIndex(
                'idx_phenomena_status',
                '{{%phenomena}}',
                'status'
            );

            // Check if experiments table exists before adding foreign key
            $experimentsTableExists = $this->db->getTableSchema('{{%experiments}}', true) !== null;
            if ($experimentsTableExists) {
                // Add foreign key to experiments table
                $this->addForeignKey(
                    'fk_phenomena_experiment_id',
                    '{{%phenomena}}',
                    'experiment_id',
                    '{{%experiments}}',
                    'experiment_id',
                    'CASCADE',
                    'CASCADE'
                );
            } else {
                echo "Warning: experiments table not found, foreign key not added\n";
            }
        } else {
            echo "Table {{%phenomena}} already exists, skipping creation\n";
            
            // Check if foreign key exists
            $fkExists = false;
            try {
                $result = $this->db->createCommand('SHOW CREATE TABLE {{%phenomena}}')->queryOne();
                if (isset($result['Create Table']) && strpos($result['Create Table'], 'fk_phenomena_experiment_id') === false) {
                    // Foreign key doesn't exist, but table and experiments table do
                    $experimentsTableExists = $this->db->getTableSchema('{{%experiments}}', true) !== null;
                    if ($experimentsTableExists) {
                        echo "Adding missing foreign key to phenomena table...\n";
                        // Add foreign key to experiments table
                        $this->addForeignKey(
                            'fk_phenomena_experiment_id',
                            '{{%phenomena}}',
                            'experiment_id',
                            '{{%experiments}}',
                            'experiment_id',
                            'CASCADE',
                            'CASCADE'
                        );
                    }
                }
            } catch (\Exception $e) {
                echo "Error checking foreign key: " . $e->getMessage() . "\n";
            }
        }
    }

    /**
     * {@inheritdoc}
     */    public function safeDown()
    {
        $tableExists = $this->db->getTableSchema('{{%phenomena}}', true) !== null;
        
        if ($tableExists) {
            // Check if foreign key exists before dropping
            $fkExists = false;
            try {
                $result = $this->db->createCommand('SHOW CREATE TABLE {{%phenomena}}')->queryOne();
                if (isset($result['Create Table']) && strpos($result['Create Table'], 'fk_phenomena_experiment_id') !== false) {
                    $fkExists = true;
                }
            } catch (\Exception $e) {
                // Ignore errors and assume FK doesn't exist
            }
            
            if ($fkExists) {
                $this->dropForeignKey('fk_phenomena_experiment_id', '{{%phenomena}}');
            }
            $this->dropTable('{{%phenomena}}');
        }
    }
}
