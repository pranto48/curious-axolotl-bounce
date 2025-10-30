<?php
// This file is included by api.php and assumes $pdo, $action, and $input are available.

// Ensure only admin can perform these actions
if ($_SESSION['role'] !== 'admin') {
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
}