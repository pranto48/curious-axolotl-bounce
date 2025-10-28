<?php
// Include the main bootstrap file which handles DB checks and starts the session.
require_once __DIR__ . '/bootstrap.php';

// Include the license manager before any other authentication checks
// This ensures the license is validated before accessing any protected content.
require_once __DIR__ . '/license_manager.php';

// If the user is not logged in, redirect to the login page.
if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}
?>