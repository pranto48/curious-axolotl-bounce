<?php
require_once 'includes/auth_check.php';
include 'header.php';

$is_admin = $_SESSION['role'] === 'admin';
$current_user_id = $_SESSION['user_id'];
$current_username = $_SESSION['username'];
$current_role = $_SESSION['role'];
?>

<main id="app">
    <div class="container mx-auto px-4 py-8">
        <h1 class="text-3xl font-bold text-white mb-6">My Profile</h1>

        <div class="max-w-md mx-auto bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-6">
            <h2 class="text-xl font-semibold text-white mb-4">User Information</h2>
            <div class="space-y-3 mb-6">
                <div class="flex justify-between items-center border-b border-slate-700 pb-2">
                    <span class="text-slate-400">Username:</span>
                    <span class="text-white font-medium"><?= htmlspecialchars($current_username) ?></span>
                </div>
                <div class="flex justify-between items-center border-b border-slate-700 pb-2">
                    <span class="text-slate-400">Role:</span>
                    <span class="text-white font-medium capitalize"><?= htmlspecialchars($current_role) ?></span>
                </div>
            </div>

            <h2 class="text-xl font-semibold text-white mb-4">Change Password</h2>
            <form id="changePasswordForm" class="space-y-4">
                <div>
                    <label for="current_password" class="block text-sm font-medium text-slate-300 mb-1">Current Password</label>
                    <input type="password" id="current_password" name="current_password" required class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500">
                </div>
                <div>
                    <label for="new_password" class="block text-sm font-medium text-slate-300 mb-1">New Password</label>
                    <input type="password" id="new_password" name="new_password" required class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500">
                </div>
                <div>
                    <label for="confirm_new_password" class="block text-sm font-medium text-slate-300 mb-1">Confirm New Password</label>
                    <input type="password" id="confirm_new_password" name="confirm_new_password" required class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500">
                </div>
                <button type="submit" id="savePasswordBtn" class="w-full px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
                    <i class="fas fa-key mr-2"></i>Change Password
                </button>
            </form>
        </div>
    </div>
</main>

<?php include 'footer.php'; ?>