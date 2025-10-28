<?php
// This is the new central bootstrap file.
// It handles basic setup like loading functions and checking database integrity.

// Include config first to get DB constants
require_once __DIR__ . '/../config.php';

// Include helper functions
require_once __DIR__ . '/db_helpers.php'; // For getDbConnection() and generateUuid()
require_once __DIR__ . '/functions.php'; // For AMPNM-specific functions (e.g., ping, parse output)
require_once __DIR__ . '/app_settings.php'; // For getAppSetting(), updateAppSetting(), etc.

// This script should not run on the setup page itself to avoid a redirect loop.
if (basename($_SERVER['PHP_SELF']) !== 'database_setup.php') {
    try {
        $pdo = getDbConnection(); // Use the new getDbConnection from db_helpers.php
        // A simple query to check if the main 'users' table exists.
        // If this fails, we assume the database has not been initialized.
        $pdo->query("SELECT 1 FROM `users` LIMIT 1");
    } catch (PDOException $e) {
        // Check for the specific "table not found" error.
        if (strpos($e->getMessage(), 'Base table or view not found') !== false) {
            // The database is connected, but tables are missing. Redirect to setup.
            header('Location: database_setup.php');
            exit;
        } else {
            // A different, more serious database error occurred.
            die("A critical database error occurred: " . $e->getMessage());
        }
    }
}

// Start session management after DB check.
// This ensures sessions are available on all pages that include this bootstrap.
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}