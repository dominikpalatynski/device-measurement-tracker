<?php
namespace app\components;

use Yii;
use yii\base\Component;
use PhpMqtt\Client\MqttClient;
use PhpMqtt\Client\ConnectionSettings;

class MqttComponent extends Component
{
    public $host = 'localhost';
    public $port = 1883;
    public $username = null;
    public $password = null;
    public $clientId;
    private $_client;
    private $_connectionSettings;
    
    public function init()
    {
        parent::init();
        if ($this->clientId === null) {
            $this->clientId = 'yii-mqtt-' . uniqid();
        }
    }
    
    public function getClient()
    {
        if ($this->_client === null) {
            $this->_connectionSettings = (new ConnectionSettings())
                ->setUsername($this->username)
                ->setPassword($this->password)
                ->setKeepAliveInterval(60)
                ->setLastWillQualityOfService(1);
                
            $this->_client = new MqttClient($this->host, $this->port, $this->clientId);
        }
        
        return $this->_client;
    }
    
    public function getConnectionSettings()
    {
        if ($this->_connectionSettings === null) {
            $this->getClient(); // This will initialize the connection settings
        }
        return $this->_connectionSettings;
    }
    
    public function publish($topic, $message, $qos = 0, $retain = false)
    {
        $client = $this->getClient();
        
        if (!$client->isConnected()) {
            $client->connect($this->getConnectionSettings());
        }
        
        $client->publish($topic, $message, $qos, $retain);
        
        return true;
    }
    
    public function subscribe($topic, $callback, $qos = 0)
    {
        $client = $this->getClient();
        
        if (!$client->isConnected()) {
            $client->connect($this->getConnectionSettings());
        }
        
        $client->subscribe($topic, function ($topic, $message) use ($callback) {
            call_user_func($callback, $topic, $message);
        }, $qos);
        
        return $client;
    }
}