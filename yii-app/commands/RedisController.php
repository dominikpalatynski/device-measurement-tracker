<?php
namespace app\commands;

use Yii;
use yii\console\Controller;
use app\services\RedisService;
use app\services\MeasurementService;

class RedisController extends Controller
{
    private $redisService;
    private $measurementService;
    public function __construct($id, $module, $config = [])
    {
        $this->redisService = new RedisService();
        $this->measurementService = new MeasurementService();
        parent::__construct($id, $module, $config);
    }
    
    public function actionConsume()
    {
        $message = $this->redisService->popMqttMessage();
        if ($message) {
            $this->stdout("Processing message: " . json_encode($message) . "\n");
            $this->measurementService->processRealTimeDataMqttMessage($message['topic'], $message['payload']);
        }
        return self::EXIT_CODE_NORMAL;
    }
    
    public function actionDaemon()
    {
        $this->stdout("Starting Redis consumer daemon (blocking mode)...\n");
        $processedCount = 0;
        
        while (true) {
            try {
                // Use blocking pop - waits until message is available (no CPU waste!)
                $result = $this->redisService->blockingPopMqttMessage(1); // 1 second timeout
                
                if ($result) {
                    $processedCount++;
                    $this->stdout("[" . date('Y-m-d H:i:s') . "] Processing message #{$processedCount}: " . json_encode($result) . "\n");
                    $this->measurementService->processRealTimeDataMqttMessage($result['topic'], $result['payload']);
                } else {
                    // Timeout reached, just continue (no message available)
                    $this->stdout(".");
                }
                
            } catch (\Exception $e) {
                $this->stderr("Error processing message: " . $e->getMessage() . "\n");
                sleep(1); // Wait before retrying on error
            }
        }
    }
}