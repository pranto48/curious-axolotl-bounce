<?php
// This file is included by api.php and assumes $pdo, $action, and $input are available.
$current_user_id = $_SESSION['user_id'];

// Enforce admin-only access for all notification management actions
$notificationModificationActions = ['get_smtp_settings', 'save_smtp_settings', 'get_device_subscriptions', 'save_device_subscription', 'delete_device_subscription', 'get_all_devices_for_subscriptions', 'get_all_device_subscriptions'];

if (in_array($action, $notificationModificationActions) && ($_SESSION['role'] !== 'admin')) {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden: Only admin users can manage notifications.']);
    exit;
}

switch ($action) {
    case 'get_smtp_settings':
        $stmt = $pdo->prepare("SELECT host, port, username, password, encryption, from_email, from_name FROM smtp_settings WHERE user_id = ?");
        $stmt->execute([$current_user_id]);
        $settings = $stmt->fetch(PDO::FETCH_ASSOC);
        // Mask password for security, or don't send it at all if not needed by frontend
        if ($settings && isset($settings['password'])) {
            $settings['password'] = '********'; // Mask password
        }
        echo json_encode($settings ?: []);
        break;

    case 'save_smtp_settings':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $host = $input['host'] ?? '';
            $port = $input['port'] ?? '';
            $username = $input['username'] ?? '';
            $password = $input['password'] ?? ''; // This might be masked, handle carefully
            $encryption = $input['encryption'] ?? 'tls';
            $from_email = $input['from_email'] ?? '';
            $from_name = $input['from_name'] ?? null;

            if (empty($host) || empty($port) || empty($username) || empty($from_email)) {
                http_response_code(400);
                echo json_encode(['error' => 'Host, Port, Username, and From Email are required.']);
                exit;
            }

            // Check if settings already exist for this user
            $stmt = $pdo->prepare("SELECT id, password FROM smtp_settings WHERE user_id = ?");
            $stmt->execute([$current_user_id]);
            $existingSettings = $stmt->fetch(PDO::FETCH_ASSOC);

            if ($existingSettings) {
                // If password is '********', it means it wasn't changed, so keep the old one
                if ($password === '********') {
                    $password = $existingSettings['password'];
                }
                $sql = "UPDATE smtp_settings SET host = ?, port = ?, username = ?, password = ?, encryption = ?, from_email = ?, from_name = ?, updated_at = CURRENT_TIMESTAMP WHERE user_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$host, $port, $username, $password, $encryption, $from_email, $from_name, $current_user_id]);
            } else {
                $sql = "INSERT INTO smtp_settings (user_id, host, port, username, password, encryption, from_email, from_name) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$current_user_id, $host, $port, $username, $password, $encryption, $from_email, $from_name]);
            }
            echo json_encode(['success' => true, 'message' => 'SMTP settings saved successfully.']);
        }
        break;

    case 'get_all_devices_for_subscriptions':
        // Get all devices for the current user, including their map name
        $stmt = $pdo->prepare("SELECT d.id, d.name, d.ip, m.name as map_name FROM devices d LEFT JOIN maps m ON d.map_id = m.id WHERE d.user_id = ? ORDER BY d.name ASC");
        $stmt->execute([$current_user_id]);
        $devices = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($devices);
        break;

    case 'get_device_subscriptions':
        $device_id = $_GET['device_id'] ?? null;
        if (!$device_id) {
            http_response_code(400);
            echo json_encode(['error' => 'Device ID is required.']);
            exit;
        }
        $stmt = $pdo->prepare("SELECT id, recipient_email, notify_on_online, notify_on_offline, notify_on_warning, notify_on_critical FROM device_email_subscriptions WHERE user_id = ? AND device_id = ? ORDER BY recipient_email ASC");
        $stmt->execute([$current_user_id, $device_id]);
        $subscriptions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($subscriptions);
        break;

    case 'get_all_device_subscriptions': // NEW ACTION
        $search_term = $_GET['search'] ?? '';
        $sql = "
            SELECT 
                des.id, 
                des.recipient_email, 
                des.notify_on_online, 
                des.notify_on_offline, 
                des.notify_on_warning, 
                des.notify_on_critical,
                d.id as device_id,
                d.name as device_name,
                d.ip as device_ip,
                m.name as map_name
            FROM 
                device_email_subscriptions des
            JOIN 
                devices d ON des.device_id = d.id
            LEFT JOIN
                maps m ON d.map_id = m.id
            WHERE 
                des.user_id = ?
        ";
        $params = [$current_user_id];

        if (!empty($search_term)) {
            $sql .= " AND (des.recipient_email LIKE ? OR d.name LIKE ? OR d.ip LIKE ? OR m.name LIKE ?)";
            $params[] = "%{$search_term}%";
            $params[] = "%{$search_term}%";
            $params[] = "%{$search_term}%";
            $params[] = "%{$search_term}%";
        }
        $sql .= " ORDER BY d.name ASC, des.recipient_email ASC";

        $stmt = $pdo->prepare($sql);
        $stmt->execute($params);
        $subscriptions = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($subscriptions);
        break;

    case 'save_device_subscription':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $id = $input['id'] ?? null; // For updating existing subscription
            $device_id = $input['device_id'] ?? null;
            $recipient_email = $input['recipient_email'] ?? '';
            $notify_on_online = $input['notify_on_online'] ?? false;
            $notify_on_offline = $input['notify_on_offline'] ?? false;
            $notify_on_warning = $input['notify_on_warning'] ?? false;
            $notify_on_critical = $input['notify_on_critical'] ?? false;

            if (!$device_id || empty($recipient_email)) {
                http_response_code(400);
                echo json_encode(['error' => 'Device ID and Recipient Email are required.']);
                exit;
            }

            if ($id) {
                // Update existing subscription
                $sql = "UPDATE device_email_subscriptions SET recipient_email = ?, notify_on_online = ?, notify_on_offline = ?, notify_on_warning = ?, notify_on_critical = ? WHERE id = ? AND user_id = ? AND device_id = ?";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$recipient_email, $notify_on_online, $notify_on_offline, $notify_on_warning, $notify_on_critical, $id, $current_user_id, $device_id]);
                echo json_encode(['success' => true, 'message' => 'Subscription updated successfully.']);
            } else {
                // Create new subscription
                $sql = "INSERT INTO device_email_subscriptions (user_id, device_id, recipient_email, notify_on_online, notify_on_offline, notify_on_warning, notify_on_critical) VALUES (?, ?, ?, ?, ?, ?, ?)";
                $stmt = $pdo->prepare($sql);
                $stmt->execute([$current_user_id, $device_id, $recipient_email, $notify_on_online, $notify_on_offline, $notify_on_warning, $notify_on_critical]);
                echo json_encode(['success' => true, 'message' => 'Subscription created successfully.', 'id' => $pdo->lastInsertId()]);
            }
        }
        break;

    case 'delete_device_subscription':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $id = $input['id'] ?? null;
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'Subscription ID is required.']);
                exit;
            }
            $stmt = $pdo->prepare("DELETE FROM device_email_subscriptions WHERE id = ? AND user_id = ?");
            $stmt->execute([$id, $current_user_id]);
            echo json_encode(['success' => true, 'message' => 'Subscription deleted successfully.']);
        }
        break;
}
?>