<?php
require_once __DIR__ . '/includes/bootstrap.php';

// If license is somehow active, redirect to index
if (isset($_SESSION['license_status']) && ($_SESSION['license_status'] === 'active' || $_SESSION['license_status'] === 'free')) {
    header('Location: index.php');
    exit;
}

$license_status = $_SESSION['license_status'] ?? 'unknown';
$license_message = $_SESSION['license_message'] ?? 'Your license is expired, revoked, or invalid.';
$expires_at = $_SESSION['license_expires_at'] ?? null;
$last_successful_verification = $_SESSION['last_successful_verification'] ?? null;

$display_title = "License Invalid";
$display_icon = '<i class="fas fa-exclamation-triangle text-red-500 text-6xl"></i>';
$display_reason = htmlspecialchars($license_message);
$additional_info = '';

switch ($license_status) {
    case 'locally_expired':
        $display_title = "License Expired (Offline)";
        $display_icon = '<i class="fas fa-calendar-times text-red-500 text-6xl"></i>';
        $display_reason = "Your license expired locally on " . date('Y-m-d', strtotime($expires_at)) . ". The application could not connect to the license portal for re-verification.";
        $additional_info = '<p class="text-slate-300 mt-2">Please check your network connection or contact support if the issue persists.</p>';
        break;
    case 'unreachable':
    case 'unreachable_long_term':
        $display_title = "License Portal Unreachable";
        $display_icon = '<i class="fas fa-cloud-offline text-orange-500 text-6xl"></i>';
        $display_reason = "The application could not connect to the license verification server. " . htmlspecialchars($license_message);
        if ($last_successful_verification) {
            $additional_info .= '<p class="text-slate-300 mt-2">Last successful verification: ' . date('Y-m-d H:i', strtotime($last_successful_verification)) . '</p>';
        }
        $additional_info .= '<p class="text-slate-300 mt-2">Please check your network connection and DNS settings.</p>';
        break;
    case 'expired':
        $display_title = "License Expired";
        $display_icon = '<i class="fas fa-calendar-times text-red-500 text-6xl"></i>';
        break;
    case 'revoked':
        $display_title = "License Revoked";
        $display_icon = '<i class="fas fa-ban text-red-500 text-6xl"></i>';
        break;
    case 'in_use':
        $display_title = "License In Use";
        $display_icon = '<i class="fas fa-server text-red-500 text-6xl"></i>';
        break;
    case 'unconfigured':
        $display_title = "License Unconfigured";
        $display_icon = '<i class="fas fa-exclamation-circle text-yellow-500 text-6xl"></i>';
        break;
    case 'invalid':
    case 'not_found':
    case 'error':
    default:
        // Default values are already set
        break;
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?= htmlspecialchars($display_title) ?> - AMPNM</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body class="bg-slate-900 flex items-center justify-center min-h-screen">
    <div class="w-full max-w-md">
        <div class="text-center mb-8">
            <?= $display_icon ?>
            <h1 class="text-3xl font-bold text-white mt-4"><?= htmlspecialchars($display_title) ?></h1>
            <p class="text-slate-400 mt-2">The application is currently disabled due to an invalid license.</p>
        </div>
        <div class="bg-slate-800/50 border border-slate-700 rounded-lg shadow-xl p-8 space-y-6 text-center">
            <p class="text-red-300 text-lg">
                Reason: <?= $display_reason ?>
            </p>
            <?= $additional_info ?>
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