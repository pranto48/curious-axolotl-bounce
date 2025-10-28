<?php
// This file contains functions for managing application-specific settings
// stored in the `app_settings` table of the AMPNM Docker application's database.

// Requires getDbConnection() from db_helpers.php
// Requires generateUuid() from db_helpers.php

/**
 * Retrieves an application setting from the database.
 * @param string $key The setting key.
 * @return string|null The setting value, or null if not found.
 */
function getAppSetting($key) {
    $pdo = getDbConnection();
    $stmt = $pdo->prepare("SELECT setting_value FROM `app_settings` WHERE setting_key = ?");
    $stmt->execute([$key]);
    $result = $stmt->fetch(PDO::FETCH_ASSOC);
    return $result['setting_value'] ?? null;
}

/**
 * Updates an application setting in the database. If the setting does not exist, it will be created.
 * @param string $key The setting key.
 * @param string $value The new setting value.
 * @return bool True on success, false on failure.
 */
function updateAppSetting($key, $value) {
    $pdo = getDbConnection();
    $stmt = $pdo->prepare("INSERT INTO `app_settings` (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?, updated_at = CURRENT_TIMESTAMP");
    return $stmt->execute([$key, $value, $value]);
}

/**
 * Retrieves the unique installation ID for this AMPNM instance.
 * If not found, it generates and stores a new one.
 * @return string The installation ID.
 */
function getInstallationId() {
    $installation_id = getAppSetting('installation_id');
    if (empty($installation_id)) {
        $installation_id = generateUuid();
        updateAppSetting('installation_id', $installation_id);
    }
    return $installation_id;
}

/**
 * Retrieves the application's license key from the database.
 * @return string|null The license key, or null if not set.
 */
function getAppLicenseKey() {
    return getAppSetting('app_license_key');
}

/**
 * Sets the application's license key in the database.
 * @param string $licenseKey The license key to set.
 * @return bool True on success, false on failure.
 */
function setAppLicenseKey($licenseKey) {
    return updateAppSetting('app_license_key', $licenseKey);
}

/**
 * Retrieves the timestamp of the last successful license check.
 * @return string|null The timestamp in 'Y-m-d H:i:s' format, or null if never checked.
 */
function getLastLicenseCheck() {
    return getAppSetting('last_license_check');
}

/**
 * Sets the timestamp of the last successful license check.
 * @param string $timestamp The timestamp in 'Y-m-d H:i:s' format.
 * @return bool True on success, false on failure.
 */
function setLastLicenseCheck($timestamp) {
    return updateAppSetting('last_license_check', $timestamp);
}