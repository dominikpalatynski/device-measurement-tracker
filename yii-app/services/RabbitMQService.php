<?php
namespace app\services;

/**
 * RabbitMQ Service - Simple and Reliable Message Queue
 * 
 * Uses RabbitMQ's built-in features:
 * - Automatic message acknowledgment
 * - Durable queues (survive server restart)
 * - Dead letter exchanges
 * - No data loss guarantee
 */

require_once __DIR__ . '/../vendor/autoload.php';

use PhpAmqpLib\Connection\AMQPStreamConnection;
use PhpAmqpLib\Message\AMQPMessage;
use PhpAmqpLib\Wire\AMQPTable;
use Exception;

class RabbitMQService 
{
    private $connection;
    private $channel;
    private $config;
    
    public function __construct() 
    {
        $this->loadConfiguration();
        $this->connect();
    }
    
    /**
     * Load RabbitMQ configuration
     */
    private function loadConfiguration() 
    {
        $this->config = [
            'host' => getenv('RABBITMQ_HOST') ?: 'localhost',
            'port' => getenv('RABBITMQ_PORT') ?: 5672,
            'user' => getenv('RABBITMQ_USER') ?: 'user',
            'password' => getenv('RABBITMQ_PASSWORD') ?: 'password',
            'vhost' => getenv('RABBITMQ_VHOST') ?: '/',
            'queues' => [
                'mqtt_messages' => 'mqtt_messages',
                'mqtt_dead_letter' => 'mqtt_dead_letter'
            ]
        ];
    }
    
    /**
     * Connect to RabbitMQ
     */
    private function connect() 
    {
        try {
            $this->connection = new AMQPStreamConnection(
                $this->config['host'],
                $this->config['port'],
                $this->config['user'],
                $this->config['password'],
                $this->config['vhost']
            );
            
            $this->channel = $this->connection->channel();
            
            // Setup queues with built-in reliability
            $this->setupQueues();
            
            echo "[INFO] RabbitMQ connected successfully\n";
            
        } catch (Exception $e) {
            throw new Exception("Failed to connect to RabbitMQ: " . $e->getMessage());
        }
    }
    
    /**
     * Setup durable queues with dead letter exchange
     */
    private function setupQueues() 
    {
        // Dead letter exchange and queue (for failed messages)
        $this->channel->exchange_declare('mqtt_dlx', 'direct', false, true, false);
        $this->channel->queue_declare(
            $this->config['queues']['mqtt_dead_letter'], 
            false, // passive
            true,  // durable (survives server restart)
            false, // exclusive
            false  // auto-delete
        );
        $this->channel->queue_bind($this->config['queues']['mqtt_dead_letter'], 'mqtt_dlx', 'failed');
        
        // Main queue with dead letter exchange
        $args = new AMQPTable([
            'x-dead-letter-exchange' => 'mqtt_dlx',
            'x-dead-letter-routing-key' => 'failed'
        ]);
        
        $this->channel->queue_declare(
            $this->config['queues']['mqtt_messages'],
            false, // passive  
            true,  // durable (survives server restart)
            false, // exclusive
            false, // auto-delete
            false, // nowait
            $args  // arguments (dead letter config)
        );
        
        echo "[INFO] RabbitMQ queues configured with dead letter exchange\n";
    }
    
    /**
     * Publish MQTT message to queue
     */
    public function publishMqttMessage($topic, $payload) 
    {
        try {
            $messageData = [
                'topic' => $topic,
                'payload' => $payload,
                'received_at' => time(),
                'message_id' => uniqid('mqtt_', true)
            ];
            
            $message = new AMQPMessage(
                json_encode($messageData),
                [
                    'delivery_mode' => AMQPMessage::DELIVERY_MODE_PERSISTENT, // Message survives restart
                    'message_id' => $messageData['message_id'],
                    'timestamp' => time()
                ]
            );
            
            $this->channel->basic_publish(
                $message, 
                '', // exchange
                $this->config['queues']['mqtt_messages'] // routing key (queue name)
            );
            
            echo "[INFO] MQTT message published: {$messageData['message_id']}\n";
            return true;
            
        } catch (Exception $e) {
            echo "[ERROR] Failed to publish MQTT message: " . $e->getMessage() . "\n";
            return false;
        }
    }
    
    /**
     * Subscribe to MQTT messages with reliable manual ACK
     */
    public function subscribe($callback) 
    {
        try {
            echo "[INFO] Starting RabbitMQ consumer (Manual ACK - Reliable Mode)...\n";
            
            // Set QoS - only process 1 message at a time (reliable processing)
            $this->channel->basic_qos(null, 1, null);
            
            // Setup consumer with manual ACK
            $this->channel->basic_consume(
                $this->config['queues']['mqtt_messages'], // queue
                '',    // consumer tag
                false, // no_local
                false, // no_ack (manual ACK for reliability)
                false, // exclusive
                false, // nowait
                function (AMQPMessage $msg) use ($callback) {
                    try {
                        // Decode message
                        $data = json_decode($msg->getBody(), true);
                        
                        echo "[" . date('Y-m-d H:i:s') . "] Processing message: {$data['message_id']}\n";
                        
                        // Call the callback function
                        $result = $callback($data['topic'], $data['payload'], $data);
                        
                        if ($result !== false) {
                            // Success - ACK the message (removes from queue)
                            $msg->ack();
                            echo "✅ Message ACK'd: {$data['message_id']}\n";
                        } else {
                            // Failed - NACK with requeue=false (sends to dead letter)
                            $msg->nack(false, false);
                            echo "❌ Message NACK'd (sent to dead letter): {$data['message_id']}\n";
                        }
                        
                    } catch (Exception $e) {
                        echo "❌ Processing error: " . $e->getMessage() . "\n";
                        // NACK with requeue=false (sends to dead letter queue)
                        $msg->nack(false, false);
                    }
                }
            );
            
            // Start consuming (blocking)
            while ($this->channel->is_consuming()) {
                $this->channel->wait();
            }
            
        } catch (Exception $e) {
            echo "[ERROR] Consumer error: " . $e->getMessage() . "\n";
        }
    }
    
    /**
     * Get queue statistics
     */
    public function getQueueStats() 
    {
        try {
            $mainQueue = $this->channel->queue_declare($this->config['queues']['mqtt_messages'], true);
            $deadQueue = $this->channel->queue_declare($this->config['queues']['mqtt_dead_letter'], true);
            
            return [
                'main_queue_messages' => $mainQueue[1],
                'dead_letter_messages' => $deadQueue[1]
            ];
            
        } catch (Exception $e) {
            echo "[ERROR] Failed to get queue stats: " . $e->getMessage() . "\n";
            return [];
        }
    }
    
    /**
     * Close connection
     */
    public function close() 
    {
        try {
            if ($this->channel) {
                $this->channel->close();
            }
            if ($this->connection) {
                $this->connection->close();
            }
            echo "[INFO] RabbitMQ connection closed\n";
        } catch (Exception $e) {
            echo "[ERROR] Error closing RabbitMQ: " . $e->getMessage() . "\n";
        }
    }
    
    public function __destruct() 
    {
        $this->close();
    }
} 