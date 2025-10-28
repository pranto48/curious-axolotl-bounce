<?php
// This file is included by auth_check.php and assumes session is started and config.php is loaded.

// Define how often to re-verify the license with the portal (in seconds)
define('LICENSE_VERIFICATION_INTERVAL', 300); // 5 minutes

// Function to generate a UUID (Universally Unique Identifier)
function generateUuid() {
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // set version to 0100
    $data[8] = chr(ord(ord($data[8]) & 0x3f | 0x80)); // set bits 6-7 to 10
    return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
}

/**
 * Performs the actual license verification with the portal API.
 * Caches results in session.
 */
function verifyLicenseWithPortal() {
    // Only attempt verification if a user is logged in to the AMPNM app
    if (!isset($_SESSION['user_id'])) {
        $_SESSION['license_status'] = 'unverified_login_required';
        $_SESSION['license_message'] = 'Please log in to verify your license.';
        $_SESSION['license_max_devices'] = 0;
        $_SESSION['license_expires_at'] = null;
        error_log("LICENSE_ERROR: License verification skipped. User not logged in.");
        return;
    }

    // Check if we need to re-verify (based on interval)
    if (isset($_SESSION['license_last_verified']) && (time() - $_SESSION['license_last_verified'] < LICENSE_VERIFICATION_INTERVAL)) {
        return; // Use cached data
    }

    $app_license_key = getAppSetting('app_license_key');
    $installation_id = getAppSetting('installation_id');
    $user_id = $_SESSION['user_id']; // Now guaranteed to be set

    error_log("DEBUG: License verification attempt. User ID: {$user_id}, Installation ID: {$installation_id}, License Key: " . (empty($app_license_key) ? 'EMPTY' : 'PRESENT'));

    // If no license key or installation ID, mark as invalid and return
    if (empty($app_license_key) || empty($installation_id)) {
        $_SESSION['license_status'] = 'unconfigured';
        $_SESSION['license_message'] = 'License key or installation ID is missing/unconfigured.';
        $_SESSION['license_max_devices'] = 0;
        $_SESSION['license_expires_at'] = null;
        $_SESSION['license_last_verified'] = time();
        error_log("LICENSE_ERROR: License verification aborted. License key or installation ID is empty in Docker app's settings.");
        return;
    }

    // Get current device count for the user
    $pdo = getDbConnection();
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM `devices` WHERE user_id = ?");
    $stmt->execute([$user_id]);
    $current_device_count = $stmt->fetchColumn();

    $post_data = [
        'app_license_key' => $app_license_key,
        'user_id' => $user_id,
        'current_device_count' => $current_device_count,
        'installation_id' => $installation_id
    ];

    $license_api_url = LICENSE_API_URL; // Get the URL from config.php

    // --- DNS Resolution Check ---
    $parsed_url = parse_url($license_api_url);
    $hostname = $parsed_url['host'] ?? null;
    $resolved_ip = null;

    if ($hostname) {
        $resolved_ip = gethostbyname($hostname);
        if ($resolved_ip === $hostname) { // gethostbyname returns hostname itself on failure
            $_SESSION['license_status'] = 'error';
            $_SESSION['license_message'] = "DNS resolution failed for license server: '{$hostname}'. Check network configuration.";
            $_SESSION['license_max_devices'] = 0;
            $_SESSION['license_expires_at'] = null;
            $_SESSION['license_last_verified'] = time();
            error_log("LICENSE_ERROR: DNS resolution failed for {$hostname}.");
            return;
        }
        error_log("DEBUG: DNS resolved {$hostname} to {$resolved_ip}.");
    } else {
        error_log("DEBUG: Could not parse hostname from LICENSE_API_URL: {$license_api_url}");
    }

    $ch = curl_init($license_api_url);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($post_data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10); // 10 second timeout
    
    // --- TEMPORARY DEBUGGING: Disable SSL verification and enable verbose output ---
    curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, false);
    curl_setopt($ch, CURLOPT_SSL_VERIFYHOST, false);
    curl_setopt($ch, CURLOPT_VERBOSE, true); // This will output verbose cURL info to stderr/error_log
    // --- END TEMPORARY DEBUGGING ---

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_errno = curl_errno($ch);
    $curl_error = curl_error($ch);
    curl_close($ch);

    error_log("DEBUG: cURL request sent to " . $license_api_url . " with payload: " . json_encode($post_data));
    error_log("DEBUG: cURL response from portal: HTTP Code: {$http_code}, cURL Error No: {$curl_errno}, cURL Error: {$curl_error}, Response Body: " . ($response === false ? 'FALSE' : $response));

    if ($response === false) {
        error_log("LICENSE_ERROR: License server unreachable. cURL error: {$curl_error} (Error No: {$curl_errno})");
        $_SESSION['license_status'] = 'error';
        $_SESSION['license_message'] = "Could not connect to license server. cURL Error ({$curl_errno}): {$curl_error}. Check network or try again later.";
        $_SESSION['license_max_devices'] = 0;
        $_SESSION['license_expires_at'] = null;
        $_SESSION['license_last_verified'] = time();
        return;
    }

    $result = json_decode($response, true);

    if ($http_code !== 200 || !isset($result['success'])) {
        error_log("LICENSE_ERROR: License server returned an unexpected/invalid response (HTTP $http_code). Response: " . ($response ?? 'Empty response.'));
        $_SESSION['license_status'] = 'error';
        $_SESSION['license_message'] = 'License server returned an unexpected response. ' . ($result['message'] ?? 'Unknown error.');
        $_SESSION['license_max_devices'] = 0;
        $_SESSION['license_expires_at'] = null;
        $_SESSION['license_last_verified'] = time();
        return;
    }

    if ($result['success']) {
        $_SESSION['license_status'] = 'active';
        $_SESSION['license_message'] = $result['message'] ?? 'License is active.';
        $_SESSION['license_max_devices'] = $result['max_devices'] ?? 1;
        $_SESSION['license_expires_at'] = $result['expires_at'] ?? null; // Portal should return this
        error_log("LICENSE_INFO: License verification successful. Status: active, Max Devices: {$result['max_devices']}.");
    } else {
        $_SESSION['license_status'] = $result['actual_status'] ?? 'invalid';
        $_SESSION['license_message'] = $result['message'] ?? 'License is invalid.';
        $_SESSION['license_max_devices'] = 0;
        $_SESSION['license_expires_at'] = null;

        // Log specific error based on actual_status
        switch ($_SESSION['license_status']) {
            case 'not_found':
                error_log("LICENSE_ERROR: License key '{$app_license_key}' not found on portal.");
                break;
            case 'expired':
                error_log("LICENSE_ERROR: License key '{$app_license_key}' has expired.");
                break;
            case 'revoked':
                error_log("LICENSE_ERROR: License key '{$app_license_key}' has been revoked by admin.");
                break;
            case 'in_use':
                error_log("LICENSE_ERROR: License key '{$app_license_key}' is currently in use by another server (Installation ID: {$installation_id}).");
                break;
            case 'invalid_request':
                error_log("LICENSE_ERROR: Invalid request sent to license server. Missing data in payload.");
                break;
            case 'error':
                error_log("LICENSE_ERROR: An internal error occurred on the license server during verification.");
                break;
            default:
                error_log("LICENSE_ERROR: License key '{$app_license_key}' is invalid for an unknown reason. Status: {$_SESSION['license_status']}.");
                break;
        }
    }
    $_SESSION['license_last_verified'] = time();
}

// --- Main License Manager Logic ---

// 1. Ensure installation_id exists
$installation_id = getAppSetting('installation_id');
if (empty($installation_id)) {
    $new_uuid = generateUuid();
    updateAppSetting('installation_id', $new_uuid);
    // Reload to ensure it's set for this request
    $installation_id = $new_uuid;
}

// 2. Check if license key is configured
$app_license_key = getAppSetting('app_license_key');

// If license key is not set, redirect to setup page
if (empty($app_license_key)) {
    // Only redirect if not already on the setup page to prevent infinite loops
    if (basename($_SERVER['PHP_SELF']) !== 'license_setup_page.php') {
        header('Location: license_setup_page.php');
        exit;
    }
} else {
    // If license key is set, verify it (only if user is logged in)
    verifyLicenseWithPortal();
}

// Store current device count in session for easy access
if (isset($_SESSION['user_id'])) {
    $pdo = getDbConnection();
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM `devices` WHERE user_id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $_SESSION['current_device_count'] = $stmt->fetchColumn();
} else {
    $_SESSION['current_device_count'] = 0;
}

?>