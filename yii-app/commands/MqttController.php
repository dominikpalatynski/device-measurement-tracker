<?php
namespace app\commands;

use Yii;
use yii\console\Controller;
use app\components\MqttComponent;
use app\services\MeasurementService;

class MqttController extends Controller
{
    /**
     * @var MeasurementService
     */
    private $measurementService;
    
    public function __construct($id, $module, $config = [])
    {
        // Create the measurement service
        $this->measurementService = new MeasurementService();
        
        parent::__construct($id, $module, $config);
    }
    
    /**
     * Subscribe to device measurement topics
     * 
     * @param string $topic Default subscription topic
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
            
            // Dodajemy subskrypcję na topic predykcji
            $client->subscribe('predictions/+/measurements', function ($topic, $message) {
                $this->processPredictionMessage($topic, $message);
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
     * Process prediction message from MQTT
     */
    protected function processPredictionMessage($topic, $message)
    {
        try {
            $data = json_decode($message, true);
            if (!$data) {
                echo "\033[31m[MQTT] Error: Invalid JSON in prediction message\033[0m\n";
                return;
            }

            // Wyciągamy ID urządzenia z topicu (format: predictions/{device_id}/measurements)
            preg_match('/predictions\/(\d+)\/measurements/', $topic, $matches);
            $deviceId = $matches[1] ?? 'unknown';

            echo "\033[36m[MQTT] Otrzymano predykcję dla urządzenia ID: {$deviceId}\033[0m\n";
            echo "\033[36m[MQTT] Temperatura: {$data['temperature']}°C\033[0m\n";
            echo "\033[36m[MQTT] Wilgotność: {$data['humidity']}%\033[0m\n";
            echo "\033[36m[MQTT] Ciśnienie: {$data['pressure']} hPa\033[0m\n";
            echo "\033[36m[MQTT] Poziom baterii: {$data['batteryLevel']}%\033[0m\n";
            echo "\033[36m[MQTT] Timestamp: " . date('Y-m-d H:i:s', $data['timestamp']) . "\033[0m\n";
            echo "\033[36m[MQTT] ----------------------------------------\033[0m\n";

        } catch (\Exception $e) {
            echo "\033[31m[MQTT] Error processing prediction: " . $e->getMessage() . "\033[0m\n";
        }
    }
    
    /**
     * Send a test message (useful for development)
     * 
     * @param string $deviceId
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