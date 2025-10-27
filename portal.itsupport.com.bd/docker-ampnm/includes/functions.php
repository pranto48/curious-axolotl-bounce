<?php
require_once __DIR__ . '/../config.php';

// Function to check a TCP port on a host
function checkPortStatus($host, $port, $timeout = 1) {
    $startTime = microtime(true);
    // The '@' suppresses warnings on connection failure, which we handle ourselves.
    $socket = @fsockopen($host, $port, $errno, $errstr, $timeout);
    $endTime = microtime(true);

    if ($socket) {
        fclose($socket);
        return [
            'success' => true,
            'time' => round(($endTime - $startTime) * 1000, 2), // time in ms
            'output' => "Successfully connected to $host on port $port."
        ];
    } else {
        return [
            'success' => false,
            'time' => 0,
            'output' => "Connection failed: $errstr (Error no: $errno)"
        ];
    }
}

// Function to execute ping command more efficiently
function executePing($host, $count = 4) {
    // Basic validation and sanitization for the host
    if (empty($host) || !preg_match('/^[a-zA-Z0-9\.\-]+$/', $host)) {
        return ['output' => 'Invalid host provided.', 'return_code' => -1, 'success' => false];
    }
    
    // Escape the host to prevent command injection
    $escaped_host = escapeshellarg($host);
    
    // Determine the correct ping command based on the OS, with timeouts
    if (stristr(PHP_OS, 'WIN')) {
        // Windows: -n for count, -w for timeout in ms
        $command = "ping -n $count -w 1000 $escaped_host";
    } else {
        // Linux/Mac: -c for count, -W for timeout in seconds
        $command = "ping -c $count -W 1 $escaped_host";
    }
    
    $output_array = [];
    $return_code = -1;
    
    // Use exec to get both output and return code in one call
    @exec($command . ' 2>&1', $output_array, $return_code);
    
    $output = implode("\n", $output_array);
    
    // Determine success more reliably. Return code 0 is good, but we also check for 100% packet loss.
    $success = ($return_code === 0 && strpos($output, '100% packet loss') === false && strpos($output, 'Lost = ' . $count) === false);

    return [
        'output' => $output,
        'return_code' => $return_code,
        'success' => $success
    ];
}

// Function to parse ping output from different OS
function parsePingOutput($output) {
    $packetLoss = 100;
    $avgTime = 0;
    $minTime = 0;
    $maxTime = 0;
    $ttl = null;
    
    // Regex for Windows
    if (preg_match('/Lost = \d+ \((\d+)% loss\)/', $output, $matches)) {
        $packetLoss = (int)$matches[1];
    }
    if (preg_match('/Minimum = (\d+)ms, Maximum = (\d+)ms, Average = (\d+)ms/', $output, $matches)) {
        $minTime = (float)$matches[1];
        $maxTime = (float)$matches[2];
        $avgTime = (float)$matches[3];
    }
    if (preg_match('/TTL=(\d+)/', $output, $matches)) {
        $ttl = (int)$matches[1];
    }
    
    // Regex for Linux/Mac
    if (preg_match('/(\d+)% packet loss/', $output, $matches)) {
        $packetLoss = (int)$matches[1];
    }
    if (preg_match('/rtt min\/avg\/max\/mdev = ([\d.]+)\/([\d.]+)\/([\d.]+)\/([\d.]+) ms/', $output, $matches)) {
        $minTime = (float)$matches[1];
        $avgTime = (float)$matches[2];
        $maxTime = (float)$matches[3];
    }
    if (preg_match('/ttl=(\d+)/', $output, $matches)) {
        $ttl = (int)$matches[1];
    }
    
    return [
        'packet_loss' => $packetLoss,
        'avg_time' => $avgTime,
        'min_time' => $minTime,
        'max_time' => $maxTime,
        'ttl' => $ttl
    ];
}

// Function to save a ping result to the database
function savePingResult($pdo, $host, $pingResult) {
    $parsed = parsePingOutput($pingResult['output']);
    $success = $pingResult['success'];

    $sql = "INSERT INTO ping_results (host, packet_loss, avg_time, min_time, max_time, success, output) VALUES (?, ?, ?, ?, ?, ?, ?)";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([
        $host,
        $parsed['packet_loss'],
        $parsed['avg_time'],
        $parsed['min_time'],
        $parsed['max_time'],
        $success,
        $pingResult['output']
    ]);
}

// Function to ping a single device and return structured data
function pingDevice($ip) {
    $pingResult = executePing($ip, 1); // Ping once for speed
    $parsedResult = parsePingOutput($pingResult['output']);
    $alive = $pingResult['success'];

    return [
        'ip' => $ip,
        'alive' => $alive,
        'time' => $alive ? $parsedResult['avg_time'] : null,
        'timestamp' => date('c'), // ISO 8601 format
        'error' => !$alive ? 'Host unreachable or timed out' : null
    ];
}

// Function to scan the network for devices using nmap
function scanNetwork($subnet) {
    // NOTE: This function requires 'nmap' to be installed on the server.
    // The web server user (e.g., www-data) may need permissions to run it.
    if (empty($subnet) || !preg_match('/^[a-zA-Z0-9\.\/]+$/', $subnet)) {
        // Default to a common local subnet if none is provided or if input is invalid
        $subnet = '192.168.1.0/24';
    }

    // Escape the subnet to prevent command injection
    $escaped_subnet = escapeshellarg($subnet);
    
    // Use nmap for a discovery scan (-sn: ping scan, -oG -: greppable output)
    $command = "nmap -sn $escaped_subnet -oG -";
    $output = @shell_exec($command);

    if (empty($output)) {
        return []; // nmap might not be installed or failed to run
    }

    $results = [];
    $lines = explode("\n", $output);
    foreach ($lines as $line) {
        if (strpos($line, 'Host:') === 0 && strpos($line, 'Status: Up') !== false) {
            $parts = preg_split('/\s+/', $line);
            $ip = $parts[1];
            $hostname = (isset($parts[2]) && $parts[2] !== '') ? trim($parts[2], '()') : null;
            
            $results[] = [
                'ip' => $ip,
                'hostname' => $hostname,
                'mac' => null, // nmap -sn doesn't always provide MAC, a privileged scan is needed
                'vendor' => null,
                'alive' => true
            ];
        }
    }
    return $results;
}

// Function to check if host is reachable via HTTP
function checkHttpConnectivity($host) {
    if (empty($host) || filter_var($host, FILTER_VALIDATE_IP) === false) {
        return ['success' => false, 'http_code' => 0, 'error' => 'Invalid IP address'];
    }
    $url = "http://$host";
    $ch = curl_init($url);
    curl_setopt($ch, CURLOPT_TIMEOUT, 2); // Reduced timeout for faster checks
    curl_setopt($ch, CURLOPT_CONNECTTIMEOUT, 2);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_FOLLOWLOCATION, true);
    curl_setopt($ch, CURLOPT_MAXREDIRS, 2);
    
    curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $error = curl_error($ch);
    curl_close($ch);
    
    return [
        'success' => ($httpCode >= 200 && $httpCode < 400),
        'http_code' => $httpCode,
        'error' => $error
    ];
}

// --- License Management Functions for AMPNM App ---

/**
 * Generates a unique installation ID and stores it persistently.
 * If an ID already exists, it retrieves it.
 * @return string The unique installation ID.
 */
function getInstallationId() {
    $id_file = __DIR__ . '/../.installation_id';
    if (file_exists($id_file)) {
        return trim(file_get_contents($id_file));
    }

    // Generate a UUID
    $data = random_bytes(16);
    $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // set version to 0100
    $data[8] = chr(ord(ord($data[8]) & 0x3f | 0x80)); // set bits 6-7 to 10
    $uuid = vsprintf('%s%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));

    file_put_contents($id_file, $uuid);
    return $uuid;
}

/**
 * Checks the AMPNM application's license with the external license portal.
 * Updates session variables with license status and details.
 * Redirects to license_error.php if the license is invalid.
 */
function checkAmpnmLicense() {
    // Only check if on a page that requires auth and not the error page itself
    if (basename($_SERVER['PHP_SELF']) === 'license_error.php') {
        return;
    }

    if (empty(APP_LICENSE_KEY) || empty(LICENSE_API_URL)) {
        $_SESSION['license_status'] = 'unconfigured';
        $_SESSION['license_message'] = 'License key or API URL is not configured. Please check your docker-compose.yml.';
        header('Location: license_error.php');
        exit;
    }

    $pdo = getDbConnection();
    $stmt = $pdo->prepare("SELECT COUNT(*) FROM `devices` WHERE user_id = ?");
    $stmt->execute([$_SESSION['user_id']]);
    $current_device_count = $stmt->fetchColumn();

    $post_data = [
        'app_license_key' => APP_LICENSE_KEY,
        'user_id' => $_SESSION['user_id'], // AMPNM's internal user ID
        'current_device_count' => $current_device_count,
        'installation_id' => AMPNM_INSTALLATION_ID
    ];

    $ch = curl_init(LICENSE_API_URL);
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_POST, true);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($post_data));
    curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
    curl_setopt($ch, CURLOPT_TIMEOUT, 10); // 10 second timeout for API call

    $response = curl_exec($ch);
    $http_code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curl_error = curl_error($ch);
    curl_close($ch);

    if ($response === false || $http_code !== 200) {
        $_SESSION['license_status'] = 'api_error';
        $_SESSION['license_message'] = 'Could not connect to license server or received an invalid response. HTTP Code: ' . $http_code . '. cURL Error: ' . $curl_error;
        header('Location: license_error.php');
        exit;
    }

    $license_response = json_decode($response, true);

    if (!$license_response || !isset($license_response['success'])) {
        $_SESSION['license_status'] = 'invalid_response';
        $_SESSION['license_message'] = 'Invalid response from license server. Please contact support.';
        header('Location: license_error.php');
        exit;
    }

    $_SESSION['license_status'] = $license_response['actual_status'] ?? ($license_response['success'] ? 'active' : 'invalid');
    $_SESSION['license_message'] = $license_response['message'] ?? 'Unknown license status.';
    $_SESSION['license_max_devices'] = $license_response['max_devices'] ?? 0;

    if (!$license_response['success']) {
        header('Location: license_error.php');
        exit;
    }
}