<?php
require_once 'includes/bootstrap.php'; // Includes config.php and starts session

$message = '';

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $license_key = trim($_POST['license_key'] ?? '');

    if (empty($license_key)) {
        $message = '<div class="bg-red-500/20 border border-red-500/30 text-red-300 text-sm rounded-lg p-3 text-center mb-4">Please enter your license key.</div>';
    } else {
        // Save the license key
        if (updateAppSetting('app_license_key', $license_key)) {
            // Redirect to login page. License verification will happen after successful login.
            header('Location: login.php?license_saved=true');
            exit;
        } else {
            $message = '<div class="bg-red-500/20 border border-red-500/30 text-red-300 text-sm rounded-lg p-3 text-center mb-4">Failed to save license key. Please try again.</div>';
        }
    }
}

// Ensure installation_id is generated if not already
$installation_id = getAppSetting('installation_id');
if (empty($installation_id)) {
    // This function is defined in license_manager.php, which is included by auth_check.php
    // For license_setup_page.php, we need to ensure it's available.
    // If license_manager.php is not yet included, define a local generateUuid.
    if (!function_exists('generateUuid')) {
        function generateUuid() {
            $data = random_bytes(16);
            $data[6] = chr(ord($data[6]) & 0x0f | 0x40); // set version to 0100
            $data[8] = chr(ord(ord($data[8]) & 0x3f | 0x80)); // set bits 6-7 to 10
            return vsprintf('%s%s-%s-%s-%s-%s%s%s', str_split(bin2hex($data), 4));
        }
    }
    $new_uuid = generateUuid();
    updateAppSetting('installation_id', $new_uuid);
    $installation_id = $new_uuid;
}

?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>License Setup - AMPNM</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body class="bg-slate-900 flex items-center justify-center min-h-screen">
    <div class="w-full max-w-md">
        <div class="text-center mb-8">
            <i class="fas fa-key text-cyan-400 text-6xl"></i>
            <h1 class="text-3xl font-bold text-white mt-4">AMPNM License Setup</h1>
            <p class="text-slate-400">Please enter your license key to activate the application.</p>
        </div>
        <form method="POST" action="license_setup_page.php" class="bg-slate-800/50 border border-slate-700 rounded-lg shadow-xl p-8 space-y-6">
            <?= $message ?>
            <div>
                <label for="license_key" class="block text-sm font-medium text-slate-300 mb-2">License Key</label>
                <input type="text" name="license_key" id="license_key" required
                       class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500 focus:border-transparent"
                       placeholder="AMPNM-XXXX-XXXX-XXXX-XXXX">
            </div>
            <div class="text-xs text-slate-500 text-center">
                Your unique installation ID: <span class="font-mono text-slate-400 break-all"><?= htmlspecialchars($installation_id) ?></span>
            </div>
            <button type="submit"
                    class="w-full px-6 py-3 bg-cyan-600 text-white font-semibold rounded-lg hover:bg-cyan-700 focus:ring-2 focus:ring-cyan-500 focus:outline-none">
                Activate License
            </button>
        </form>
        <p class="text-center text-slate-500 text-sm mt-4">
            Need a license? Visit our portal: <a href="<?= htmlspecialchars(LICENSE_API_URL) ?>" target="_blank" class="text-cyan-400 hover:underline">IT Support BD Portal</a>
        </p>
    </div>
</body>
</html>