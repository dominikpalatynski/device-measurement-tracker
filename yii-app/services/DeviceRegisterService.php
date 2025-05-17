<?php

namespace app\services;

use Yii;
use app\models\Device;
use app\models\VerificationToken;
use yii\base\Component;
use yii\helpers\Json;
use yii\web\ServerErrorHttpException;

class DeviceRegisterService extends Component
{
    /**
     * Przetwarza wiadomość MQTT dotyczącą rejestracji urządzenia
     * 
     * @param string $topic Temat MQTT
     * @param string $payload Zawartość wiadomości MQTT
     * @return bool|Device Zwraca obiekt Device w przypadku sukcesu lub false w przypadku błędu
     */
    public function processDeviceRegisterMqttMessage($topic, $payload)
    {
        try {
            echo "\033[32m[MQTT] Processing device registration message: $payload\033[0m\n";
            
            Yii::info([
                'topic' => $topic,
                'payload' => $payload,
                'decoded' => Json::decode($payload)
            ], 'mqtt-debug');

            // Sprawdzenie czy temat jest poprawny
            if ($topic !== 'device/register') {
                echo "\033[31m[MQTT] Error: Invalid topic. Expected 'device/register', got '$topic'\033[0m\n";
                Yii::error("Invalid topic for device registration: $topic", 'mqtt');
                return false;
            }

            // Parsowanie payloadu
            $data = Json::decode($payload);
            
            if (!isset($data['token'])) {
                echo "\033[31m[MQTT] Error: Missing token in payload\033[0m\n";
                Yii::error("Missing token in device registration payload: $payload", 'mqtt');
                return false;
            }

            // Znajdź token weryfikacyjny
            $token = VerificationToken::findOne(['token' => $data['token']]);
            
            if (!$token) {
                echo "\033[31m[MQTT] Error: Invalid verification token\033[0m\n";
                Yii::error("Invalid verification token: {$data['token']}", 'mqtt');
                return false;
            }

            // Sprawdź czy token nie wygasł
            if ($token->expiration_date < time()) {
                $this->sendMqttResponse('error', 'Verification token has expired', $token->token);
                echo "\033[31m[MQTT] Error: Verification token has expired\033[0m\n";
                Yii::error("Expired verification token: {$data['token']}", 'mqtt');
                return false;
            }

            // Sprawdź czy token nie został już użyty
            if ($token->used) {
                $this->sendMqttResponse('error', 'Token has already been used', $token->token);
                echo "\033[31m[MQTT] Error: Token has already been used\033[0m\n";
                Yii::error("Token already used: {$data['token']}", 'mqtt');
                return false;
            }

            // Znajdź urządzenie
            $device = Device::findOne($token->device_id);
            
            if (!$device) {
                $this->sendMqttResponse('error', 'Device not found for token', $token->token);
                echo "\033[31m[MQTT] Error: Device not found for token\033[0m\n";
                Yii::error("Device not found for token: {$data['token']}", 'mqtt');
                return false;
            }

            // Aktualizuj status urządzenia
            $device->status = Device::STATUS_ACTIVE;
            $device->last_seen_at = time();
            $device->updated_at = time();
            
            if (!$device->save()) {
                $this->sendMqttResponse('error', 'Failed to update device status', $token->token);
                echo "\033[31m[MQTT] Error: Failed to update device status\033[0m\n";
                Yii::error("Failed to update device status: " . Json::encode($device->errors), 'mqtt');
                return false;
            }

            // Oznacz token jako użyty
            $token->used = true;
            $token->updated_at = time();
            $token->save();

            // Wyślij odpowiedź o sukcesie
            $this->sendMqttResponse('success', 'Device registered successfully', $token->token, $device->device_uuid);

            echo "\033[32m[MQTT] Successfully processed device registration for device: {$device->device_uuid}\033[0m\n";
            return $device;

        } catch (\Exception $e) {
            echo "\033[31m[MQTT] Error: " . $e->getMessage() . "\033[0m\n";
            Yii::error("Error processing device registration message: " . $e->getMessage(), 'mqtt');
            return false;
        }
    }

    /**
     * Wysyła odpowiedź MQTT na temat odpowiedzi
     * 
     * @param string $status Status odpowiedzi ('success' lub 'error')
     * @param string $message Wiadomość odpowiedzi
     * @param string|null $token Token weryfikacyjny
     */
    protected function sendMqttResponse($status, $message, $token = null, $deviceUuid = null)
    {
        $responseTopic = 'device/register/response';
        if ($token) {
            $responseTopic .= '/' . $token;
        }

        $response = [
            'status' => $status,
            'message' => $message,
            'timestamp' => time(),
            'device_uuid' => $deviceUuid
        ];

        if ($token) {
            $response['token'] = $token;
        }

        $payload = Json::encode($response);
        
        Yii::$app->mqtt->publish($responseTopic, $payload, 1);
        echo "\033[32m[MQTT] Response sent to topic $responseTopic: $payload\033[0m\n";
        Yii::info("MQTT response sent to topic $responseTopic: $payload", 'mqtt');
    }
}
