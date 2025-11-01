<?php
// This file is included by api.php and assumes $pdo, $action, and $input are available.

// Ensure only admin can perform these actions
if (in_array($action, ['get_users', 'create_user', 'delete_user', 'update_user']) && $_SESSION['role'] !== 'admin') {
    http_response_code(403);
    echo json_encode(['error' => 'Forbidden: Only admin can manage users.']);
    exit;
}

switch ($action) {
    case 'get_users':
        $stmt = $pdo->query("SELECT id, username, role, created_at FROM users ORDER BY username ASC");
        $users = $stmt->fetchAll(PDO::FETCH_ASSOC);
        echo json_encode($users);
        break;

    case 'create_user':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $username = $input['username'] ?? '';
            $password = $input['password'] ?? '';
            $role = $input['role'] ?? 'basic'; // Default to basic

            if (empty($username) || empty($password)) {
                http_response_code(400);
                echo json_encode(['error' => 'Username and password are required.']);
                exit;
            }
            
            // Sanitize role input
            if (!in_array($role, ['admin', 'basic'])) {
                $role = 'basic';
            }

            // Check if username already exists
            $stmt = $pdo->prepare("SELECT id FROM users WHERE username = ?");
            $stmt->execute([$username]);
            if ($stmt->fetch()) {
                http_response_code(409);
                echo json_encode(['error' => 'Username already exists.']);
                exit;
            }

            $hashed_password = password_hash($password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)");
            $stmt->execute([$username, $hashed_password, $role]);
            
            echo json_encode(['success' => true, 'message' => 'User created successfully.']);
        }
        break;

    case 'update_user':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $id = $input['id'] ?? null;
            $username = $input['username'] ?? '';
            $password = $input['password'] ?? null; // Optional, can be empty
            $role = $input['role'] ?? 'basic';

            if (!$id || empty($username)) {
                http_response_code(400);
                echo json_encode(['error' => 'User ID and username are required.']);
                exit;
            }

            // Sanitize role input
            if (!in_array($role, ['admin', 'basic'])) {
                $role = 'basic';
            }

            // Prevent changing the primary admin's role or deleting them
            $stmt = $pdo->prepare("SELECT username FROM users WHERE id = ?");
            $stmt->execute([$id]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($user && $user['username'] === 'admin' && $role !== 'admin') {
                http_response_code(403);
                echo json_encode(['error' => 'Cannot change the role of the primary admin user.']);
                exit;
            }

            $sql = "UPDATE users SET username = ?, role = ?, updated_at = CURRENT_TIMESTAMP";
            $params = [$username, $role];

            if (!empty($password)) {
                $hashed_password = password_hash($password, PASSWORD_DEFAULT);
                $sql .= ", password = ?";
                $params[] = $hashed_password;
            }

            $sql .= " WHERE id = ?";
            $params[] = $id;

            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            echo json_encode(['success' => true, 'message' => 'User updated successfully.']);
        }
        break;

    case 'delete_user':
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $id = $input['id'] ?? null;
            if (!$id) {
                http_response_code(400);
                echo json_encode(['error' => 'User ID is required.']);
                exit;
            }

            // Prevent admin from deleting themselves or the primary admin
            $stmt = $pdo->prepare("SELECT username FROM users WHERE id = ?");
            $stmt->execute([$id]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);
            if ($user && $user['username'] === 'admin') {
                http_response_code(403);
                echo json_encode(['error' => 'Cannot delete the primary admin user.']);
                exit;
            }

            $stmt = $pdo->prepare("DELETE FROM users WHERE id = ?");
            $stmt->execute([$id]);
            echo json_encode(['success' => true, 'message' => 'User deleted successfully.']);
        }
        break;

    case 'change_my_password': // NEW ACTION
        if ($_SERVER['REQUEST_METHOD'] === 'POST') {
            $current_user_id = $_SESSION['user_id'];
            $current_password = $input['current_password'] ?? '';
            $new_password = $input['new_password'] ?? '';

            if (empty($current_password) || empty($new_password)) {
                http_response_code(400);
                echo json_encode(['error' => 'Current and new passwords are required.']);
                exit;
            }
            if (strlen($new_password) < 6) {
                http_response_code(400);
                echo json_encode(['error' => 'New password must be at least 6 characters long.']);
                exit;
            }

            // Verify current password
            $stmt = $pdo->prepare("SELECT password FROM users WHERE id = ?");
            $stmt->execute([$current_user_id]);
            $user = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$user || !password_verify($current_password, $user['password'])) {
                http_response_code(401);
                echo json_encode(['error' => 'Invalid current password.']);
                exit;
            }

            // Update password
            $hashed_password = password_hash($new_password, PASSWORD_DEFAULT);
            $stmt = $pdo->prepare("UPDATE users SET password = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
            $stmt->execute([$hashed_password, $current_user_id]);

            echo json_encode(['success' => true, 'message' => 'Password changed successfully.']);
        }
        break;
}
?>