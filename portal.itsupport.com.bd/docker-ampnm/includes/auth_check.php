<?php
// Include the main bootstrap file which handles DB checks and starts the session.
require_once __DIR__ . '/bootstrap.php';

// If the user is not logged in, redirect to the login page.
if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}

// Include the license manager AFTER the user is authenticated.
// This ensures $_SESSION['user_id'] is available for license verification.
require_once __DIR__ . '/license_manager.php';
?>