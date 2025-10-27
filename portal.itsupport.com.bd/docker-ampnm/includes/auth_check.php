<?php
// Include the main bootstrap file which handles DB checks and starts the session.
require_once __DIR__ . '/bootstrap.php';

// If the user is not logged in, redirect to the login page.
if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}
?>