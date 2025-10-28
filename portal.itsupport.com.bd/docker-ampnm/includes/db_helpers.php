<?php
// This file contains helper functions for database interaction and UUID generation
// specific to the AMPNM Docker application.

// Function to get database connection (defined in config.php)
// This function is now moved here from config.php
function getDbConnection() {
    static $pdo = null;

    // If a connection exists, check if it's still alive.
    if ($pdo !== null) {
        try {
            $pdo->query("SELECT 1");
        } catch (PDOException $e) {
            // Error code 2006 is "MySQL server has gone away".
            // If that's the case, nullify the connection to force a reconnect.
            if (isset($e->errorInfo[1]) && $e->errorInfo[1] == 2006) {
                $pdo = null;
            } else {
                // For other errors, we can re-throw them.
                throw $e;
            }
        }
    }

    // If no connection exists (or it was lost), create a new one.
    if ($pdo === null) {
        try {
            $dsn = "mysql:host=" . DB_SERVER . ";dbname=" . DB_NAME . ";charset=utf8mb4";
            $options = [
                PDO::ATTR_ERRMODE            => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES   => false,
            ];
            $pdo = new PDO($dsn, DB_USERNAME, DB_PASSWORD, $options);
        } catch(PDOException $e) {
            // For a real application, you would log this error and show a generic message.
            // For this local tool, dying is acceptable to immediately see the problem.
            die("ERROR: Could not connect to the database. " . $e->getMessage());
        }
    }
    
    return $pdo;
}

// Function to generate a UUID (Universally Unique Identifier)
function generateUuid() {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // set version to 0100
    $data[8] = chr(ord(ord($data[8]) & 0x3f | 0x80)); // set bits 6-7 to 10
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}