<?php
// Debug script to check PHP errors and shutdown conditions
// Save as debug-server.php in your yii-app folder

// Check for registered shutdown functions
$shutdownFunctions = [];
$allFunctions = get_defined_functions();
$userFunctions = $allFunctions['user'];

echo "PHP Version: " . phpversion() . "\n";
echo "PHP Memory Limit: " . ini_get('memory_limit') . "\n";
echo "PHP Max Execution Time: " . ini_get('max_execution_time') . "\n";
echo "PHP Error Reporting: " . ini_get('error_reporting') . "\n";
echo "PHP Display Errors: " . ini_get('display_errors') . "\n";
echo "PHP Error Log: " . ini_get('error_log') . "\n\n";

// Register a custom error handler to log everything
set_error_handler(function($errno, $errstr, $errfile, $errline) {
    echo "ERROR DETECTED: [$errno] $errstr in $errfile on line $errline\n";
    return false; // Let PHP's internal error handler also handle it
});

// Register a custom exception handler
set_exception_handler(function($exception) {
    echo "UNCAUGHT EXCEPTION: " . $exception->getMessage() . "\n";
    echo $exception->getTraceAsString() . "\n";
});

// Register a shutdown function
register_shutdown_function(function() {
    $error = error_get_last();
    if ($error !== null && ($error['type'] & (E_ERROR | E_PARSE | E_CORE_ERROR | E_COMPILE_ERROR | E_USER_ERROR))) {
        echo "FATAL ERROR DETECTED: " . $error['message'] . " in " . $error['file'] . " on line " . $error['line'] . "\n";
    }
});

// Check for common PHP extensions
$requiredExtensions = ['json', 'pdo', 'pdo_mysql', 'mbstring', 'ctype', 'fileinfo', 'dom'];
echo "Checking required PHP extensions:\n";
foreach ($requiredExtensions as $ext) {
    echo "- $ext: " . (extension_loaded($ext) ? "Loaded" : "NOT LOADED") . "\n";
}
echo "\n";

// Attempt to create a PDO connection
try {
    echo "Testing database connection with PDO:\n";
    $dsn = 'mysql:host=127.0.0.1;dbname=iot_monitoring';
    $username = 'iot_user';
    $password = 'iot_password';
    
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ];
    
    $pdo = new PDO($dsn, $username, $password, $options);
    echo "Database connection successful!\n";
    
    // Test a query
    $stmt = $pdo->query("SELECT 1 as test, NOW() as current_time");
    $result = $stmt->fetch();
    echo "Query result: " . json_encode($result) . "\n";
    
    // Test the device table
    $stmt = $pdo->query("SELECT COUNT(*) as count FROM device");
    $result = $stmt->fetch();
    echo "Device count: " . $result['count'] . "\n\n";
} catch (PDOException $e) {
    echo "Database connection failed: " . $e->getMessage() . "\n\n";
}

// Test JSON encoding/decoding
$testObj = ['name' => 'test', 'value' => 123, 'null_value' => null];
echo "Testing JSON encoding:\n";
try {
    $json = json_encode($testObj);
    echo "Encoded: $json\n";
    $decoded = json_decode($json, true);
    echo "Decoded back: " . print_r($decoded, true) . "\n\n";
} catch (Exception $e) {
    echo "JSON test failed: " . $e->getMessage() . "\n\n";
}

// Memory test
try {
    echo "Testing memory allocation:\n";
    $startMemory = memory_get_usage();
    $testArray = [];
    for ($i = 0; $i < 10000; $i++) {
        $testArray[] = "Test string $i for memory allocation testing";
    }
    $endMemory = memory_get_usage();
    echo "Memory used: " . ($endMemory - $startMemory) . " bytes\n\n";
    unset($testArray);
} catch (Exception $e) {
    echo "Memory test failed: " . $e->getMessage() . "\n\n";
}

echo "Debug script completed.\n";
