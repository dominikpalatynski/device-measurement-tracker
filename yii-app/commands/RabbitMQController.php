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
} 