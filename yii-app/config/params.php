<?php

return [
    'adminEmail' => 'admin@example.com',
    'senderEmail' => 'noreply@example.com',
    'senderName' => 'Example.com mailer',
    // MQTT Configuration for debugging
    'mqtt' => [
        'debug' => true,
        'connection_timeout' => 10,
        'keep_alive' => 60,
    ],
    // JWT Configuration
    'jwtSecretKey' => 'your-super-secret-jwt-key-change-this-in-production',
    'jwtExpiration' => 3600, // 1 hour in seconds
    // User configuration
    'user.passwordResetTokenExpire' => 3600, // 1 hour
];
