<?php
namespace app\services;

use Yii;
use app\models\Device;
use app\models\Measurement;
use yii\db\ActiveQuery;

class DeviceMeasurementService
{
    /**
     * @var Device
     */
    private $device;

    /**
     * @param string $deviceUuid UUID urządzenia
     * @throws \yii\web\NotFoundHttpException
     */
    public function __construct(string $deviceUuid)
    {
        Yii::info("Looking up device with UUID: {$deviceUuid}", 'api.device-measurement');
        $this->device = Device::findOne(['device_uuid' => $deviceUuid]);
        if (!$this->device) {
            Yii::warning("Device with UUID: {$deviceUuid} not found", 'api.device-measurement');
            throw new \yii\web\NotFoundHttpException("Urządzenie o UUID: {$deviceUuid} nie zostało znalezione");
        }
        Yii::info("Found device: ID={$this->device->id}, Name={$this->device->name}", 'api.device-measurement');
    }

    /**
     * Pobiera wszystkie pomiary dla urządzenia
     * 
     * @param int $limit Limit pomiarów
     * @param string $orderBy Sortowanie (asc/desc)
     * @return array
     */    public function getAllMeasurements(int $limit = 100, string $orderBy = 'desc'): array
    {
        try {
            $query = $this->getBaseQuery();
            $query->limit($limit);
            $query->orderBy(['measured_at' => $orderBy === 'asc' ? SORT_ASC : SORT_DESC]);

            $measurements = $query->all();
            
            return array_map(function($measurement) {
                return [
                    'id' => (int)$measurement->id,
                    'temperature' => (float)$measurement->temperature,
                    'humidity' => (float)$measurement->humidity,
                    'pressure' => (float)$measurement->pressure,
                    'battery_level' => (float)$measurement->battery_level,
                    'measured_at' => date('Y-m-d H:i:s', $measurement->measured_at),
                    'created_at' => date('Y-m-d H:i:s', $measurement->created_at),
                ];
            }, $measurements);
        } catch (\Throwable $e) {
            Yii::error("Error fetching all measurements: " . $e->getMessage() . "\n" . $e->getTraceAsString(), 'api.device-measurement');
            throw $e;
        }
    }/**
     * Pobiera najnowszy pomiar dla urządzenia
     * 
     * @return array|null
     */    public function getLatestMeasurement(): ?array
    {
        Yii::beginProfile('db-fetch-latest', 'api.performance');
        Yii::info("Fetching latest measurement for device ID: {$this->device->id}", 'api.device-measurement');
        
        try {
            $query = $this->getBaseQuery()->orderBy(['measured_at' => SORT_DESC]);
            Yii::info("SQL Query: " . $query->createCommand()->getRawSql(), 'api.device-measurement');
            
            $measurement = $query->one();
            Yii::endProfile('db-fetch-latest', 'api.performance');
            
            if (!$measurement) {
                Yii::info("No measurements found for device ID: {$this->device->id}", 'api.device-measurement');
                return null;
            }
            
            Yii::info("Found measurement ID: {$measurement->id} from " . date('Y-m-d H:i:s', $measurement->measured_at), 'api.device-measurement');
            
            // Make sure we're returning scalar values, not complex objects
            return [
                'id' => (int)$measurement->id,
                'temperature' => (float)$measurement->temperature,
                'humidity' => (float)$measurement->humidity,
                'pressure' => (float)$measurement->pressure,
                'battery_level' => (float)$measurement->battery_level,
                'measured_at' => date('Y-m-d H:i:s', $measurement->measured_at),
                'created_at' => date('Y-m-d H:i:s', $measurement->created_at),
            ];
        } catch (\Throwable $e) {
            Yii::error("Error fetching latest measurement: " . $e->getMessage() . "\n" . $e->getTraceAsString(), 'api.device-measurement');
            throw $e;
        }
    }

    /**
     * Pobiera pomiary z określonego zakresu czasowego
     * 
     * @param int $startTimestamp Początkowy timestamp
     * @param int $endTimestamp Końcowy timestamp
     * @return array
     */
    public function getMeasurementsInTimeRange(int $startTimestamp, int $endTimestamp): array
    {
        $query = $this->getBaseQuery();
        $query->andWhere(['between', 'measured_at', $startTimestamp, $endTimestamp]);
        $query->orderBy(['measured_at' => SORT_ASC]);

        $measurements = $query->all();
        
        return array_map(function($measurement) {
            return [
                'id' => $measurement->id,
                'temperature' => $measurement->temperature,
                'humidity' => $measurement->humidity,
                'pressure' => $measurement->pressure,
                'battery_level' => $measurement->battery_level,
                'measured_at' => date('Y-m-d H:i:s', $measurement->measured_at),
                'created_at' => date('Y-m-d H:i:s', $measurement->created_at),
            ];
        }, $measurements);
    }

    /**
     * Pobiera statystyki pomiarów
     * 
     * @return array
     */
    public function getMeasurementStats(): array
    {
        $query = $this->getBaseQuery();
        
        return [
            'total_measurements' => $query->count(),
            'avg_temperature' => $query->average('temperature'),
            'avg_humidity' => $query->average('humidity'),
            'avg_pressure' => $query->average('pressure'),
            'min_temperature' => $query->min('temperature'),
            'max_temperature' => $query->max('temperature'),
            'min_humidity' => $query->min('humidity'),
            'max_humidity' => $query->max('humidity'),
            'min_pressure' => $query->min('pressure'),
            'max_pressure' => $query->max('pressure'),
        ];
    }

    /**
     * Tworzy podstawowe zapytanie dla pomiarów
     * 
     * @return ActiveQuery
     */
    private function getBaseQuery(): ActiveQuery
    {
        return Measurement::find()
            ->where(['device_id' => $this->device->id]);
    }
}