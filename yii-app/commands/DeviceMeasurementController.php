<?php
namespace app\commands;

use Yii;
use yii\console\Controller;
use app\handlers\DeviceMeasurementHandler;

class DeviceMeasurementController extends Controller
{
    /**
     * Wyświetla wszystkie pomiary dla urządzenia
     * 
     * @param string $deviceUuid UUID urządzenia
     * @param int $limit Limit pomiarów
     */
    public function actionList($deviceUuid, $limit = 10)
    {
        try {
            $handler = new DeviceMeasurementHandler($deviceUuid);
            $measurements = $handler->getAllMeasurements($limit);

            $this->stdout("Pomiary dla urządzenia {$deviceUuid}:\n");
            foreach ($measurements as $measurement) {
                $this->stdout("----------------------------------------\n");
                $this->stdout("ID: {$measurement['id']}\n");
                $this->stdout("Temperatura: {$measurement['temperature']}°C\n");
                $this->stdout("Wilgotność: {$measurement['humidity']}%\n");
                $this->stdout("Ciśnienie: {$measurement['pressure']} hPa\n");
                $this->stdout("Poziom baterii: {$measurement['battery_level']}%\n");
                $this->stdout("Zmierzono: {$measurement['measured_at']}\n");
            }
        } catch (\Exception $e) {
            $this->stderr("Błąd: " . $e->getMessage() . "\n");
        }
    }

    /**
     * Wyświetla najnowszy pomiar dla urządzenia
     * 
     * @param string $deviceUuid UUID urządzenia
     */
    public function actionLatest($deviceUuid)
    {
        try {
            $handler = new DeviceMeasurementHandler($deviceUuid);
            $measurement = $handler->getLatestMeasurement();

            if (!$measurement) {
                $this->stdout("Brak pomiarów dla urządzenia {$deviceUuid}\n");
                return;
            }

            $this->stdout("Najnowszy pomiar dla urządzenia {$deviceUuid}:\n");
            $this->stdout("----------------------------------------\n");
            $this->stdout("ID: {$measurement['id']}\n");
            $this->stdout("Temperatura: {$measurement['temperature']}°C\n");
            $this->stdout("Wilgotność: {$measurement['humidity']}%\n");
            $this->stdout("Ciśnienie: {$measurement['pressure']} hPa\n");
            $this->stdout("Poziom baterii: {$measurement['battery_level']}%\n");
            $this->stdout("Zmierzono: {$measurement['measured_at']}\n");
        } catch (\Exception $e) {
            $this->stderr("Błąd: " . $e->getMessage() . "\n");
        }
    }

    /**
     * Wyświetla statystyki pomiarów dla urządzenia
     * 
     * @param string $deviceUuid UUID urządzenia
     */
    public function actionStats($deviceUuid)
    {
        try {
            $handler = new DeviceMeasurementHandler($deviceUuid);
            $stats = $handler->getMeasurementStats();

            $this->stdout("Statystyki pomiarów dla urządzenia {$deviceUuid}:\n");
            $this->stdout("----------------------------------------\n");
            $this->stdout("Liczba pomiarów: {$stats['total_measurements']}\n");
            $this->stdout("Średnia temperatura: {$stats['avg_temperature']}°C\n");
            $this->stdout("Min temperatura: {$stats['min_temperature']}°C\n");
            $this->stdout("Max temperatura: {$stats['max_temperature']}°C\n");
            $this->stdout("Średnia wilgotność: {$stats['avg_humidity']}%\n");
            $this->stdout("Min wilgotność: {$stats['min_humidity']}%\n");
            $this->stdout("Max wilgotność: {$stats['max_humidity']}%\n");
            $this->stdout("Średnie ciśnienie: {$stats['avg_pressure']} hPa\n");
            $this->stdout("Min ciśnienie: {$stats['min_pressure']} hPa\n");
            $this->stdout("Max ciśnienie: {$stats['max_pressure']} hPa\n");
        } catch (\Exception $e) {
            $this->stderr("Błąd: " . $e->getMessage() . "\n");
        }
    }
} 