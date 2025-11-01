<?php
require_once 'includes/bootstrap.php';

// If user is already logged in, redirect to dashboard
if (isset($_SESSION['user_id'])) {
    header('Location: index.php');
    exit;
}

$error_message = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $username = $_POST['username'] ?? '';
    $password = $_POST['password'] ?? '';

    if (empty($username) || empty($password)) {
        $error_message = 'Please enter both username and password.';
    } else {
        $pdo = getDbConnection();
        $stmt = $pdo->prepare("SELECT id, password FROM users WHERE username = ?");
        $stmt->execute([$username]);
        $user = $stmt->fetch(PDO::FETCH_ASSOC);

        if ($user && password_verify($password, $user['password'])) {
            // Password is correct, start session
            $_SESSION['user_id'] = $user['id'];
            $_SESSION['username'] = $username;
            header('Location: index.php');
            exit;
        } else {
            $error_message = 'Invalid username or password.';
        }
    }
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Login - AMPNM</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body class="bg-slate-900 flex items-center justify-center min-h-screen">
    <div class="w-full max-w-md">
        <div class="text-center mb-8">
            <i class="fas fa-shield-halved text-cyan-300 text-6xl"></i>
            <h1 class="text-3xl font-bold text-cyan-500 mt-4">AMPNM</h1>
            <p class="text-cyan-100">Please sign in to continue</p>
        </div>
        <form method="POST" action="login.php" class="bg-slate-800 border border-cyan-700 rounded-lg shadow-xl p-8 space-y-6">
            <?php if ($error_message): ?>
                <div class="bg-red-500/20 border border-red-500/30 text-red-300 text-sm rounded-lg p-3 text-center">
                    <?= htmlspecialchars($error_message) ?>
                </div>
            <?php endif; ?>
            <div>
                <label for="username" class="block text-sm font-medium text-cyan-200 mb-2">Username</label>
                <input type="text" name="username" id="username" required
                       class="w-full bg-slate-700 border border-cyan-500 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                       placeholder="admin">
            </div>
            <div>
                <label for="password" class="block text-sm font-medium text-cyan-200 mb-2">Password</label>
                <input type="password" name="password" id="password" required
                       class="w-full bg-slate-700 border border-cyan-500 text-white rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                       placeholder="password">
            </div>
            <button type="submit"
                    class="w-full px-6 py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                Sign In
            </button>
        </form>
    </div>
</body>
</html>