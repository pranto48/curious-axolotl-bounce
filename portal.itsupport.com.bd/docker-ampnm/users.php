<?php
require_once 'includes/auth_check.php';
include 'header.php';

$is_admin = $_SESSION['role'] === 'admin';

if (!$is_admin) {
    echo '<main id="app"><div class="container mx-auto px-4 py-8"><div class="bg-red-500/20 border border-red-500/30 text-red-300 text-sm rounded-lg p-4 text-center">Forbidden: Only admin users can manage users.</div></div></main>';
    include 'footer.php';
    exit;
}
?>

<main id="app">
    <div class="container mx-auto px-4 py-8">
        <h1 class="text-3xl font-bold text-white mb-6">User Management</h1>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <!-- Create User Form -->
            <div class="md:col-span-1">
                <div class="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-6">
                    <h2 class="text-xl font-semibold text-white mb-4">Create New User</h2>
                    <form id="createUserForm" class="space-y-4">
                        <div>
                            <label for="new_username" class="block text-sm font-medium text-slate-300 mb-1">Username</label>
                            <input type="text" id="new_username" name="username" required class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500">
                        </div>
                        <div>
                            <label for="new_password" class="block text-sm font-medium text-slate-300 mb-1">Password</label>
                            <input type="password" id="new_password" name="password" required class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500">
                        </div>
                        <div>
                            <label for="new_role" class="block text-sm font-medium text-slate-300 mb-1">Role</label>
                            <select id="new_role" name="role" class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500">
                                <option value="basic">Basic User (View Only)</option>
                                <option value="admin">Admin (Full Access)</option>
                            </select>
                        </div>
                        <button type="submit" class="w-full px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
                            <i class="fas fa-user-plus mr-2"></i>Create User
                        </button>
                    </form>
                </div>
            </div>

            <!-- User List -->
            <div class="md:col-span-2">
                <div class="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-6">
                    <h2 class="text-xl font-semibold text-white mb-4">Existing Users</h2>
                    <div class="overflow-x-auto">
                        <table class="min-w-full">
                            <thead class="border-b border-slate-700">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Username</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Role</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Created At</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="usersTableBody">
                                <!-- User rows will be inserted here by JavaScript -->
                            </tbody>
                        </table>
                        <div id="usersLoader" class="text-center py-8"><div class="loader mx-auto"></div></div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Edit User Modal -->
    <div id="editUserModal" class="modal-backdrop hidden">
        <div class="modal-panel bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] flex flex-col">
            <h2 id="editModalTitle" class="text-xl font-semibold text-white mb-4 flex-shrink-0">Edit User</h2>
            <form id="editUserForm" class="flex flex-col flex-grow min-h-0">
                <input type="hidden" id="edit_user_id" name="id">
                <div class="flex-grow overflow-y-auto space-y-4 p-1 -m-1">
                    <div>
                        <label for="edit_username" class="block text-sm font-medium text-slate-400 mb-1">Username</label>
                        <input type="text" id="edit_username" name="username" class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500" required>
                    </div>
                    <div>
                        <label for="edit_password" class="block text-sm font-medium text-slate-400 mb-1">New Password (Leave blank to keep current)</label>
                        <input type="password" id="edit_password" name="password" class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500">
                    </div>
                    <div>
                        <label for="edit_role" class="block text-sm font-medium text-slate-400 mb-1">Role</label>
                        <select id="edit_role" name="role" class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500">
                            <option value="basic">Basic User (View Only)</option>
                            <option value="admin">Admin (Full Access)</option>
                        </select>
                    </div>

                    <fieldset class="border border-slate-600 rounded-lg p-4">
                        <legend class="text-sm font-medium text-slate-400 px-2">Map Permissions</legend>
                        <div id="mapPermissionsList" class="space-y-2 max-h-48 overflow-y-auto">
                            <!-- Map checkboxes will be loaded here by JS -->
                            <div class="text-center py-4"><div class="loader mx-auto w-4 h-4"></div><span class="ml-2 text-sm text-slate-400">Loading maps...</span></div>
                        </div>
                    </fieldset>
                </div>
                <div class="flex justify-end gap-4 mt-6 flex-shrink-0">
                    <button type="button" id="cancelEditUserBtn" class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600">Cancel</button>
                    <button type="submit" id="saveEditUserBtn" class="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">Save Changes</button>
                </div>
            </form>
        </div>
    </div>
</main>

<?php include 'footer.php'; ?>