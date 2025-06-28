# InfluxDB Configuration for Device Measurement Tracker

This directory contains the configuration files for InfluxDB integration, which is used for storing high-frequency electrical measurement data.

## Configuration

The InfluxDB service uses environment variables and sensible defaults that work with the Docker Compose setup.

## Setup Instructions

### 1. Environment Variables (Optional)

You can override the default settings using environment variables:

```bash
export INFLUXDB_URL="http://localhost:8086"
export INFLUXDB_TOKEN="mytoken"
export INFLUXDB_ORG="myorg"
```

### 2. Docker Compose Setup

The configuration is already set up to work with the Docker Compose InfluxDB service defined in `docker-compose.yml`:

```yaml
influxdb2:
  image: influxdb:2
  ports:
    - 8086:8086
  environment:
    DOCKER_INFLUXDB_INIT_MODE: setup
    DOCKER_INFLUXDB_INIT_USERNAME: admin
    DOCKER_INFLUXDB_INIT_PASSWORD: password
    DOCKER_INFLUXDB_INIT_ADMIN_TOKEN: mytoken
    DOCKER_INFLUXDB_INIT_ORG: myorg
    DOCKER_INFLUXDB_INIT_BUCKET: bucket
```

### 3. Create Additional InfluxDB Buckets

The default bucket `bucket` is automatically created. You may want to create additional buckets:
- `bucket` - Default bucket for raw waveform data (auto-created)
- `electrical_archive` - Archived data (1 year retention)  
- `electrical_metadata` - Metadata and summaries (30 day retention)

### 4. Start Docker Services

Start the InfluxDB service using Docker Compose:

```bash
docker-compose up -d influxdb2
```

### 5. Install PHP Dependencies

The InfluxDB service requires the InfluxDB PHP client:

```bash
cd yii-app
composer require influxdata/influxdb-client-php
```

## Usage

### Basic Usage

```php
require_once __DIR__ . '/services/InfluxDBService.php';

// Initialize with defaults and environment variables
$client = new ElectricalMeasurementInfluxClient();

// Test connection
$testResults = $client->testConnection();
if (!$testResults['connectivity']) {
    die('InfluxDB connection failed');
}

// Write measurement data
$result = $client->writeMeasurement($measurementData);
```

### Full Example

See `examples/influxdb_usage_example.php` for a complete usage example with:
- Connection testing
- Data writing and batching
- Querying with Flux
- Performance monitoring
- Error handling

## Data Format

The service expects measurement data in this format:

```php
$measurementData = [
    'dataSeriesId' => 'UNIQUE_ID',
    'conditionId' => 'normal|fault',
    'faultId' => 'fault_type_or_none',
    'data_payload' => [
        'w' => [80 power samples],      // Power (W)
        'udc' => [80 voltage samples],  // DC Voltage (V)
        'uc' => [80 voltage samples],   // AC Voltage Phase C (V)
        'ub' => [80 voltage samples],   // AC Voltage Phase B (V)
        'ua' => [80 voltage samples],   // AC Voltage Phase A (V)
        'ib' => [80 current samples],   // AC Current Phase B (A)
        'ic' => [80 current samples],   // AC Current Phase C (A)
        'idc' => [80 current samples]   // DC Current (A)
    ]
];
```

## Configuration Options

### Write Options
- `batch_size`: Number of points to batch together (default: 1000)
- `flush_interval`: How often to flush batches in ms (default: 5000)
- `max_retries`: Maximum retry attempts for failed writes (default: 10)

### Compression
- `enabled`: Enable gzip compression (default: true)
- `level`: Compression level 1-9 (default: 9 for maximum compression)

### Performance
- `enable_monitoring`: Track write statistics (default: true)  
- `memory_limit_mb`: Memory limit for batching (default: 512)
- `max_points_per_batch`: Safety limit for batch size (default: 5000)

### Retention Policies
- `raw_data_hours`: How long to keep raw waveforms (default: 24 hours)
- `archive_days`: How long to keep archived data (default: 365 days)
- `metadata_days`: How long to keep metadata (default: 30 days)

## Monitoring

The client provides built-in performance monitoring:

```php
$stats = $client->getWriteStatistics();
print_r($stats);
```

This returns metrics like:
- Total writes and success rate
- Data points written
- Write performance (writes/sec, points/sec)
- Session runtime

## Troubleshooting

### Connection Issues
1. Verify InfluxDB is running: `curl http://localhost:8086/health`
2. Check token has write permissions to the configured buckets
3. Verify organization name matches your InfluxDB setup

### Performance Issues
1. Adjust batch size for your data volume
2. Enable compression for large payloads
3. Monitor memory usage with large batches
4. Use appropriate retention policies

### Data Issues
1. Ensure all 8 channels have exactly 80 samples each
2. Verify dataSeriesId is unique for each measurement
3. Check that numeric values are properly formatted

## Security

- Store InfluxDB tokens securely (use environment variables in production)
- Use SSL/TLS for remote InfluxDB connections (`verify_ssl: true`)
- Limit token permissions to only required buckets and operations
- Monitor for failed write attempts in logs 