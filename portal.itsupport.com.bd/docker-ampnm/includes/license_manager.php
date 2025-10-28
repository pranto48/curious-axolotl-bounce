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
    // Check if we need to re-verify (based on interval)
    if (isset($_SESSION['license_last_verified']) && (time() - $_SESSION['license_last_verified'] < LICENSE_VERIFICATION_INTERVAL)) {
        return; // Use cached data
    }

    $app_license_key = getAppSetting('app_license_key');
    $installation_id = getAppSetting('installation_id');
    $user_id = $_SESSION['user_id'] ?? null; // Assuming user_id is available in session

    // If no license key or installation ID, mark as invalid and return
    if (empty($app_license_key) || empty($installation_id) || empty($user_id)) {
        $_SESSION['license_status'] = 'unconfigured';
        $_SESSION['license_message'] = 'License key or installation ID is missing/unconfigured.';
        $_SESSION['license_max_devices'] = 0;
        $_SESSION['license_expires_at'] = null;
        $_SESSION['license_last_verified'] = time();
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

    $ch = curl_init(LICENSE_API_URL);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($post_data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10); // 10 second timeout

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    curl_close($ch);

    if ($response === false) {
        error_log("License verification cURL error: " . $curl_error);
        $_SESSION['license_status'] = 'error';
        $_SESSION['license_message'] = 'Could not connect to license server. Please check network or try again later.';
        $_SESSION['license_max_devices'] = 0;
        $_SESSION['license_expires_at'] = null;
        $_SESSION['license_last_verified'] = time();
        return;
    }

    $result = json_decode($response, true);

    if ($http_code !== 200 || !isset($result['success'])) {
        error_log("License verification API error (HTTP $http_code): " . ($result['message'] ?? $response));
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
    } else {
        $_SESSION['license_status'] = $result['actual_status'] ?? 'invalid';
        $_SESSION['license_message'] = $result['message'] ?? 'License is invalid.';
        $_SESSION['license_max_devices'] = 0;
        $_SESSION['license_expires_at'] = null;
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
    // If license key is set, verify it
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