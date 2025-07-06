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
    protected $measurementService;
    
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
    public function actionSubscribe($topic = 'sensor/+/raw')
    {
        $this->stdout("Starting MQTT subscription service...\n");
        $this->stdout("Subscribing to topic: {$topic}\n");
        
        try {
            $client = Yii::$app->mqtt->subscribe($topic, function ($topic, $message) {
                $this->processRealTimeDataMessage($topic, $message);
            }, 1);
            
            $client->loop(true);
            
            return self::EXIT_CODE_NORMAL;
        } catch (\Exception $e) {
            $this->stderr("Error in MQTT subscription: " . $e->getMessage() . "\n");
            return self::EXIT_CODE_ERROR;
        }
    }

    /**
     * Process device registration message from MQTT
     */
    protected function processRealTimeDataMessage($topic, $message)
    {
        try {
            $this->stdout("Processing real time data message...\n");
            $this->measurementService->processRealTimeDataMqttMessage($topic, $message);
        } catch (\Exception $e) {
            $this->stderr("Error processing device real time data: " . $e->getMessage() . "\n");
        }
    }

} 