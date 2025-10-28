<?php
// Database configuration using environment variables for Docker compatibility
// Forcing 127.0.0.1 as the host to resolve connection issues in the Docker environment.
define('DB_SERVER', '127.0.0.1');
define('DB_USERNAME', getenv('DB_USER') ?: 'root');
define('DB_PASSWORD', getenv('DB_PASSWORD') ?: '');
define('DB_NAME', getenv('DB_NAME') ?: 'network_monitor');

// License System Configuration
define('LICENSE_API_URL', getenv('LICENSE_API_URL') ?: 'http://localhost:8080/verify_license.php'); // Default to local portal if not set
define('APP_LICENSE_KEY_ENV', getenv('APP_LICENSE_KEY') ?: ''); // This is the key from docker-compose.yml, might be empty

// getDbConnection() is now in includes/db_helpers.php