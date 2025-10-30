<?php
// Include the main bootstrap file which handles DB checks and starts the session.
require_once __DIR__ . '/bootstrap.php';
// Include config.php to make license-related functions available
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/license_manager.php'; // Ensure license manager is included for verification logic

// If the user is not logged in, redirect to the login page.
if (!isset($_SESSION['user_id'])) {
    header('Location: login.php');
    exit;
}

// Determine if the user is an admin
$_SESSION['is_admin'] = ($_SESSION['username'] === 'admin');

// --- External License Validation ---
// This application's license key is now retrieved dynamically from the database.
// The external verification service URL is defined in config.php (LICENSE_API_URL)

// Initialize session variables if they don't exist
if (!isset($_SESSION['can_add_device'])) $_SESSION['can_add_device'] = false;
if (!isset($_SESSION['license_message'])) $_SESSION['license_message'] = 'License status unknown.';
if (!isset($_SESSION['license_status'])) $_SESSION['license_status'] = 'unknown'; // Use license_status for primary status
if (!isset($_SESSION['license_max_devices'])) $_SESSION['license_max_devices'] = 0;
if (!isset($_SESSION['current_device_count'])) $_SESSION['current_device_count'] = 0;
if (!isset($_SESSION['license_expires_at'])) $_SESSION['license_expires_at'] = null;

// Retrieve the application license key dynamically
$app_license_key = getAppLicenseKey();
$installation_id = getInstallationId(); // Retrieve the installation ID

error_log("DEBUG: auth_check.php - Retrieved app_license_key: " . (empty($app_license_key) ? 'EMPTY' : 'PRESENT') . ", Installation ID: " . (empty($installation_id) ? 'EMPTY' : $installation_id));

if (!$app_license_key) {
    $_SESSION['license_message'] = 'Application license key not configured.';
    $_SESSION['license_status'] = 'unconfigured';
    // Redirect to license setup if key is missing
    if (basename($_SERVER['PHP_SELF']) !== 'license_setup.php') {
        header('Location: license_setup.php');
        exit;
    }
}

if (!$installation_id) {
    $_SESSION['license_message'] = 'Application installation ID not found. Please re-run database setup.';
    $_SESSION['license_status'] = 'disabled';
    header('Location: database_setup.php'); // Redirect to setup to ensure ID is generated
    exit;
}

// --- License Verification Logic ---
// Trigger verification if the key is present and the session cache is old/missing.
if ($app_license_key && (!isset($_SESSION['license_last_verified']) || (time() - $_SESSION['license_last_verified'] > LICENSE_VERIFICATION_INTERVAL))) {
    verifyLicenseWithPortal();
}

// --- Enforce License Status ---
$non_active_statuses = ['expired', 'revoked', 'in_use', 'invalid', 'not_found', 'error', 'disabled'];
$current_license_status = $_SESSION['license_status'] ?? 'unknown';

if (in_array($current_license_status, $non_active_statuses)) {
    // If the license is explicitly non-active, redirect to the expired page.
    $current_page = basename($_SERVER['PHP_SELF']);
    if ($current_page !== 'license_setup.php' && $current_page !== 'license_expired.php' && $current_page !== 'login.php') {
        header('Location: license_expired.php');
        exit;
    }
}

// Store current device count in session for easy access (updated during verification, but we ensure it's available)
if (isset($_SESSION['user_id'])) {
    $pdo = getDbConnection();
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM `devices` WHERE user_id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $_SESSION['current_device_count'] = $stmt->fetchColumn();
} else {
    $_SESSION['current_device_count'] = 0;
}

// Set can_add_device flag
$max_devices = $_SESSION['license_max_devices'] ?? 0;
$current_devices = $_SESSION['current_device_count'] ?? 0;
$_SESSION['can_add_device'] = ($current_license_status === 'active' || $current_license_status === 'free') && ($max_devices === 0 || $current_devices < $max_devices);

?>