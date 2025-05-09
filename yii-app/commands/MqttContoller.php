<?php
namespace app\commands;

use Yii;
use yii\console\Controller;
use app\services\MeasurementService;

class MqttController extends Controller
{
    /**
     * @var MeasurementService
     */
    private $measurementService;
    
    public function __construct($id, $module, MeasurementService $measurementService, $config = [])
    {
        $this->measurementService = $measurementService;
        parent::__construct($id, $module, $config);
    }
    
    /**
     * Subscribe to device measurement topics
     * 
     * @param string $topic Default subscription topic
     * @return int Exit code
     */
    public function actionSubscribe($topic = 'devices/+/measurements')
    {
        $this->stdout("Starting MQTT subscription service...\n");
        $this->stdout("Subscribing to topic: {$topic}\n");
        
        try {
            $client = Yii::$app->mqtt->subscribe($topic, function ($topic, $message) {
                $this->stdout("Received message on topic {$topic}: {$message}\n");
                
                $result = $this->measurementService->processMqttMessage($topic, $message);
                
                if ($result) {
                    $this->stdout("Successfully processed measurement from device {$result->device->device_uuid}\n");
                } else {
                    $this->stderr("Failed to process measurement\n");
                }
            }, 1);
            
            // Keep the process running
            $client->loop(true);
            
            return self::EXIT_CODE_NORMAL;
        } catch (\Exception $e) {
            $this->stderr("Error in MQTT subscription: " . $e->getMessage() . "\n");
            return self::EXIT_CODE_ERROR;
        }
    }
    
    /**
     * Send a test message (useful for development)
     * 
     * @param string $deviceId
     * @return int Exit code
     */
    public function actionSendTestMessage($deviceId = 'test-device-001')
    {
        $topic = "devices/{$deviceId}/measurements";
        $message = json_encode([
            'deviceId' => $deviceId,
            'temperature' => rand(180, 300) / 10,
            'humidity' => rand(300, 800) / 10,
            'pressure' => rand(9800, 10200) / 10,
            'batteryLevel' => rand(30, 100),
            'timestamp' => time()
        ]);
        
        try {
            Yii::$app->mqtt->publish($topic, $message, 1);
            $this->stdout("Test message sent successfully to topic: {$topic}\n");
            return self::EXIT_CODE_NORMAL;
        } catch (\Exception $e) {
            $this->stderr("Error sending test message: " . $e->getMessage() . "\n");
            return self::EXIT_CODE_ERROR;
        }
    }
}