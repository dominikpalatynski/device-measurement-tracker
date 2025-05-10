<?php
namespace app\handlers;

use Yii;
use app\models\Device;
use app\models\Measurement;
use yii\db\ActiveQuery;

class DeviceMeasurementHandler
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
        $this->device = Device::findOne(['device_uuid' => $deviceUuid]);
        if (!$this->device) {
            throw new \yii\web\NotFoundHttpException("Urządzenie o UUID: {$deviceUuid} nie zostało znalezione");
        }
    }

    /**
     * Pobiera wszystkie pomiary dla urządzenia
     * 
     * @param int $limit Limit pomiarów
     * @param string $orderBy Sortowanie (asc/desc)
     * @return array
     */
    public function getAllMeasurements(int $limit = 100, string $orderBy = 'desc'): array
    {
        $query = $this->getBaseQuery();
        $query->limit($limit);
        $query->orderBy(['measured_at' => $orderBy === 'asc' ? SORT_ASC : SORT_DESC]);

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
     * Pobiera najnowszy pomiar dla urządzenia
     * 
     * @return array|null
     */
    public function getLatestMeasurement(): ?array
    {
        $measurement = $this->getBaseQuery()
            ->orderBy(['measured_at' => SORT_DESC])
            ->one();

        if (!$measurement) {
            return null;
        }

        return [
            'id' => $measurement->id,
            'temperature' => $measurement->temperature,
            'humidity' => $measurement->humidity,
            'pressure' => $measurement->pressure,
            'battery_level' => $measurement->battery_level,
            'measured_at' => date('Y-m-d H:i:s', $measurement->measured_at),
            'created_at' => date('Y-m-d H:i:s', $measurement->created_at),
        ];
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