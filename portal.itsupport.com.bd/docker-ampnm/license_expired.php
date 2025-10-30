<?php
require_once __DIR__ . '/includes/bootstrap.php';

// If license is somehow active, redirect to index
if (isset($_SESSION['license_status']) && ($_SESSION['license_status'] === 'active' || $_SESSION['license_status'] === 'free')) {
    header('Location: index.php');
    exit;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>License Expired - AMPNM</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body class="bg-slate-900 flex items-center justify-center min-h-screen">
    <div class="w-full max-w-md">
        <div class="text-center mb-8">
            <i class="fas fa-exclamation-triangle text-red-500 text-6xl"></i>
            <h1 class="text-3xl font-bold text-white mt-4">License Invalid</h1>
            <p class="text-slate-400 mt-2">The application is currently disabled due to an invalid license.</p>
        </div>
        <div class="bg-slate-800/50 border border-slate-700 rounded-lg shadow-xl p-8 space-y-6 text-center">
            <p class="text-red-300 text-lg">
                Reason: <?= htmlspecialchars($_SESSION['license_message'] ?? 'Your license is expired, revoked, or invalid.') ?>
            </p>
            <p class="text-slate-300">
                Please ensure your license key is correct and active on the IT Support BD Portal.
            </p>
            <a href="license_setup.php" class="w-full inline-block px-6 py-3 bg-yellow-600 text-white font-semibold rounded-lg hover:bg-yellow-700 focus:ring-2 focus:ring-yellow-500 focus:outline-none">
                <i class="fas fa-key mr-2"></i>Re-enter License Key
            </a>
            <a href="https://portal.itsupport.com.bd/products.php" target="_blank" class="w-full inline-block px-6 py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 focus:ring-2 focus:ring-cyan-500 focus:outline-none mt-4">
                <i class="fas fa-shopping-cart mr-2"></i>Purchase New License
            </a>
            <a href="logout.php" class="w-full inline-block px-6 py-3 bg-slate-700 text-slate-300 font-semibold rounded-lg hover:bg-slate-600 focus:ring-2 focus:ring-slate-500 focus:outline-none mt-4">
                <i class="fas fa-sign-out-alt mr-2"></i>Logout
            </a>
        </div>
    </div>
</body>
</html>