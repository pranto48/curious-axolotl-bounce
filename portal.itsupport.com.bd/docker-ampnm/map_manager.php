<?php
require_once 'includes/auth_check.php';
include 'header.php';

$is_admin = $_SESSION['role'] === 'admin';

if (!$is_admin) {
    echo '<main id="app"><div class="container mx-auto px-4 py-8"><div class="bg-red-500/20 border border-red-500/30 text-red-300 text-sm rounded-lg p-4 text-center">Forbidden: Only admin users can manage maps.</div></div></main>';
    include 'footer.php';
    exit;
}
?>

<main id="app">
    <div class="container mx-auto px-4 py-8">
        <h1 class="text-3xl font-bold text-white mb-6">Map Management</h1>

        <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
            <!-- Create Map Form -->
            <div class="md:col-span-1">
                <div class="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-6">
                    <h2 class="text-xl font-semibold text-white mb-4">Create New Map</h2>
                    <form id="createMapForm" class="space-y-4">
                        <div>
                            <label for="new_map_name" class="block text-sm font-medium text-slate-300 mb-1">Map Name</label>
                            <input type="text" id="new_map_name" name="name" required class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500">
                        </div>
                        <div>
                            <label for="new_map_type" class="block text-sm font-medium text-slate-300 mb-1">Map Type</label>
                            <select id="new_map_type" name="type" class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500">
                                <option value="lan">LAN</option>
                                <option value="datacenter">Data Center</option>
                                <option value="wan">WAN</option>
                                <option value="cloud">Cloud</option>
                                <option value="other">Other</option>
                            </select>
                        </div>
                        <button type="submit" class="w-full px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
                            <i class="fas fa-plus mr-2"></i>Create Map
                        </button>
                    </form>
                </div>
            </div>

            <!-- Map List -->
            <div class="md:col-span-2">
                <div class="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-6">
                    <h2 class="text-xl font-semibold text-white mb-4">Existing Maps</h2>
                    <div class="overflow-x-auto">
                        <table class="min-w-full">
                            <thead class="border-b border-slate-700">
                                <tr>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Name</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Type</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Devices</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Last Modified</th>
                                    <th class="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Actions</th>
                                </tr>
                            </thead>
                            <tbody id="mapsTableBody">
                                <!-- Map rows will be inserted here by JavaScript -->
                            </tbody>
                        </table>
                        <div id="mapsLoader" class="text-center py-8"><div class="loader mx-auto"></div></div>
                    </div>
                </div>
            </div>
        </div>
    </div>

    <!-- Edit Map Modal -->
    <div id="editMapModal" class="modal-backdrop hidden">
        <div class="modal-panel bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] flex flex-col">
            <h2 id="editMapModalTitle" class="text-xl font-semibold text-white mb-4 flex-shrink-0">Edit Map</h2>
            <form id="editMapForm" class="flex flex-col flex-grow min-h-0">
                <input type="hidden" id="edit_map_id" name="id">
                <div class="flex-grow overflow-y-auto space-y-4 p-1 -m-1">
                    <div>
                        <label for="edit_map_name" class="block text-sm font-medium text-slate-400 mb-1">Map Name</label>
                        <input type="text" id="edit_map_name" name="name" class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500" required>
                    </div>
                    <div>
                        <label for="edit_map_type" class="block text-sm font-medium text-slate-400 mb-1">Map Type</label>
                        <select id="edit_map_type" name="type" class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500">
                            <option value="lan">LAN</option>
                            <option value="datacenter">Data Center</option>
                            <option value="wan">WAN</option>
                            <option value="cloud">Cloud</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                    <fieldset class="border border-slate-600 rounded-lg p-4">
                        <legend class="text-sm font-medium text-slate-400 px-2">Map Appearance</legend>
                        <div class="space-y-3">
                            <div>
                                <label for="edit_map_bg_color" class="block text-sm font-medium text-slate-400 mb-1">Background Color</label>
                                <div class="flex items-center gap-2">
                                    <input type="color" id="edit_map_bg_color" name="background_color" class="p-1 h-10 w-14 block bg-slate-900 border border-slate-600 cursor-pointer rounded-lg">
                                    <input type="text" id="edit_map_bg_color_hex" name="background_color_hex" class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500">
                                </div>
                            </div>
                            <div>
                                <label for="edit_map_bg_image_url" class="block text-sm font-medium text-slate-400 mb-1">Background Image URL</label>
                                <input type="text" id="edit_map_bg_image_url" name="background_image_url" placeholder="Leave blank for no image" class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500">
                            </div>
                            <div class="text-center text-slate-500 text-sm">OR</div>
                            <div>
                                <label for="edit_map_bg_upload" class="block text-sm font-medium text-slate-400 mb-1">Upload Background Image</label>
                                <input type="file" id="edit_map_bg_upload" accept="image/*" class="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-600/20 file:text-cyan-300 hover:file:bg-cyan-600/40">
                                <div id="edit_map_bg_upload_loader" class="hidden mt-2"><div class="loader inline-block w-4 h-4"></div><span class="ml-2 text-sm">Uploading...</span></div>
                            </div>
                            <div id="edit_map_bg_preview_wrapper" class="hidden mt-2 text-center">
                                <img id="edit_map_bg_preview" src="" alt="Background Preview" class="max-w-full h-16 mx-auto bg-slate-700 p-1 rounded">
                            </div>
                            <button type="button" id="resetMapBgBtnModal" class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 w-full">Reset Background</button>
                        </div>
                    </fieldset>
                    <fieldset class="border border-slate-600 rounded-lg p-4">
                        <legend class="text-sm font-medium text-slate-400 px-2">Map Permissions</legend>
                        <div id="mapPermissionsListModal" class="space-y-2 max-h-48 overflow-y-auto">
                            <!-- User checkboxes will be loaded here by JS -->
                            <div class="text-center py-4"><div class="loader mx-auto w-4 h-4"></div><span class="ml-2 text-sm text-slate-400">Loading users...</span></div>
                        </div>
                    </fieldset>
                </div>
                <div class="flex justify-end gap-4 mt-6 flex-shrink-0">
                    <button type="button" id="cancelEditMapBtn" class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600">Cancel</button>
                    <button type="submit" id="saveEditMapBtn" class="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">Save Changes</button>
                </div>
            </form>
        </div>
    </div>
</main>

<?php include 'footer.php'; ?>