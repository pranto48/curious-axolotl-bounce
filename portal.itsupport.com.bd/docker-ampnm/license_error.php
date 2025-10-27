<?php
// This page is displayed when a license issue is detected.
// It does NOT require auth_check.php to avoid redirect loops.
require_once 'includes/bootstrap.php'; // Only bootstrap, no auth check

$license_status = $_SESSION['license_status'] ?? 'unknown';
$license_message = $_SESSION['license_message'] ?? 'An unknown license error occurred.';

// Clear session license data to prevent stale messages on subsequent visits
// unless the user explicitly navigates back to a protected page.
// For now, we'll keep it to display the message.
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>License Error - AMPNM</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body class="bg-slate-900 flex items-center justify-center min-h-screen">
    <div class="w-full max-w-md">
        <div class="text-center mb-8">
            <i class="fas fa-exclamation-triangle text-red-500 text-6xl"></i>
            <h1 class="text-3xl font-bold text-white mt-4">License Error</h1>
            <p class="text-slate-400">Your AMPNM application encountered a license issue.</p>
        </div>
        <div class="bg-slate-800/50 border border-slate-700 rounded-lg shadow-xl p-8 space-y-6">
            <div class="bg-red-500/20 border border-red-500/30 text-red-300 text-sm rounded-lg p-3 text-center">
                <p class="font-bold mb-2">Status: <?= htmlspecialchars(ucfirst(str_replace('_', ' ', $license_status))) ?></p>
                <p><?= htmlspecialchars($license_message) ?></p>
            </div>
            <p class="text-slate-400 text-center">
                Please ensure your license key is valid and your AMPNM Docker application can connect to the license portal.
            </p>
            <div class="text-center">
                <a href="index.php" class="px-6 py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                    <i class="fas fa-home mr-2"></i>Go to Dashboard
                </a>
                <?php if (isset($_SESSION['user_id'])): ?>
                    <a href="logout.php" class="px-6 py-3 bg-slate-700 text-slate-300 font-semibold rounded-lg hover:bg-slate-600 focus:ring-2 focus:ring-slate-500 focus:outline-none mt-4 block">
                        <i class="fas fa-sign-out-alt mr-2"></i>Logout
                    </a>
                <?php endif; ?>
            </div>
        </div>
    </div>
</body>
</html>