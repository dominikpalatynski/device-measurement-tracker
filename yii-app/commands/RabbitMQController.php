<?php
namespace app\commands;

use Yii;
use yii\console\Controller;
use app\services\RabbitMQService;
use app\services\MeasurementService;

class RabbitMQController extends Controller
{
    private $rabbitMQService;
    private $measurementService;
    
    public function __construct($id, $module, $config = [])
    {
        $this->measurementService = new MeasurementService();
        parent::__construct($id, $module, $config);
    }
    
    /**
     * Start RabbitMQ consumer (reliable manual ACK)
     */
    public function actionConsume()
    {
        $this->stdout("Starting RabbitMQ consumer...\n");
        
        try {
            $this->rabbitMQService = new RabbitMQService();
            
            // Subscribe with callback - reliable manual ACK
            $this->rabbitMQService->subscribe(function($topic, $payload, $messageData) {
                return $this->processMessage($topic, $payload, $messageData);
            });
            
        } catch (\Exception $e) {
            $this->stderr("Consumer error: " . $e->getMessage() . "\n");
            return self::EXIT_CODE_ERROR;
        }
        
        return self::EXIT_CODE_NORMAL;
    }
    
    /**
     * Process MQTT message (return false to send to dead letter queue)
     */
    private function processMessage($topic, $payload, $messageData)
    {
        try {
            $this->stdout("Processing: {$topic} (ID: {$messageData['message_id']})\n");
            
            // Process the message using your existing service
            $this->measurementService->processRealTimeDataMqttMessage($topic, $payload);
            
            $this->stdout("✅ Success: {$messageData['message_id']}\n");
            return true; // Success - RabbitMQ will ACK automatically
            
        } catch (\Exception $e) {
            $this->stderr("❌ Failed: " . $e->getMessage() . "\n");
            return false; // Failure - RabbitMQ will send to dead letter queue
        }
    }
    
    /**
     * Get queue statistics
     */
    public function actionStats()
    {
        try {
            $this->rabbitMQService = new RabbitMQService();
            $stats = $this->rabbitMQService->getQueueStats();
            
            $this->stdout("📊 Queue Statistics:\n");
            $this->stdout("Main Queue: {$stats['main_queue_messages']} messages\n");
            $this->stdout("Dead Letter: {$stats['dead_letter_messages']} messages\n");
            
        } catch (\Exception $e) {
            $this->stderr("Stats error: " . $e->getMessage() . "\n");
            return self::EXIT_CODE_ERROR;
        }
        
        return self::EXIT_CODE_NORMAL;
    }
    
    /**
     * Test publishing a message
     */
    public function actionTest()
    {
        try {
            $this->rabbitMQService = new RabbitMQService();
            
            $testPayload = json_encode([
                'deviceId' => 'TEST123',
                'data' => ['test' => 'value'],
                'timestamp' => date('c')
            ]);
            
            $result = $this->rabbitMQService->publishMqttMessage('test/topic', $testPayload);
            
            if ($result) {
                $this->stdout("✅ Test message published successfully\n");
            } else {
                $this->stderr("❌ Failed to publish test message\n");
                return self::EXIT_CODE_ERROR;
            }
            
        } catch (\Exception $e) {
            $this->stderr("Test error: " . $e->getMessage() . "\n");
            return self::EXIT_CODE_ERROR;
        }
        
        return self::EXIT_CODE_NORMAL;
    }
} 