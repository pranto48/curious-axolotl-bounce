<?php
require_once 'includes/auth_check.php';
include 'header.php';

$is_admin = $_SESSION['is_admin'] ?? false;
$device_id = $_GET['id'] ?? null;

if (!$is_admin) {
    echo '<main id="app"><div class="container mx-auto px-4 py-8"><div class="bg-red-500/20 border border-red-500/30 text-red-300 text-sm rounded-lg p-4 text-center">Forbidden: Only admin users can edit devices.</div></div></main>';
    include 'footer.php';
    exit;
}

if (!$device_id) {
    echo '<main id="app"><div class="container mx-auto px-4 py-8"><div class="bg-red-500/20 border border-red-500/30 text-red-300 text-sm rounded-lg p-4 text-center">Error: Device ID is missing.</div></div></main>';
    include 'footer.php';
    exit;
}
?>

<main id="app">
    <div class="container mx-auto px-4 py-8">
        <h1 class="text-3xl font-bold text-white mb-6">Edit Device</h1>

        <div class="max-w-md mx-auto bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-6">
            <form id="editDeviceForm" class="space-y-4">
                <input type="hidden" id="deviceId" name="id" value="<?= htmlspecialchars($device_id) ?>">
                <div>
                    <label for="deviceName" class="block text-sm font-medium text-slate-400 mb-1">Name</label>
                    <input type="text" id="deviceName" name="name" placeholder="Device Name" class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500" required>
                </div>
                <div>
                    <label for="deviceIp" class="block text-sm font-medium text-slate-400 mb-1">IP Address (Optional)</label>
                    <input type="text" id="deviceIp" name="ip" placeholder="IP Address (e.g., 192.168.1.1)" class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500">
                </div>
                <div>
                    <label for="deviceDescription" class="block text-sm font-medium text-slate-400 mb-1">Description (Optional)</label>
                    <textarea id="deviceDescription" name="description" rows="2" placeholder="Optional notes about the device" class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500"></textarea>
                </div>
                <div>
                    <label for="checkPort" class="block text-sm font-medium text-slate-400 mb-1">Service Port (Optional)</label>
                    <input type="number" id="checkPort" name="check_port" placeholder="e.g., 80 for HTTP" class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500">
                    <p class="text-xs text-slate-500 mt-1">If set, status is based on this port. If empty, it will use ICMP (ping).</p>
                </div>
                <div>
                    <label for="deviceType" class="block text-sm font-medium text-slate-400 mb-1">Type (Default Icon)</label>
                    <select id="deviceType" name="type" class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500">
                        <option value="box">Box (Group)</option>
                        <option value="camera">CC Camera</option>
                        <option value="cloud">Cloud</option>
                        <option value="database">Database</option>
                        <option value="firewall">Firewall</option>
                        <option value="ipphone">IP Phone</option>
                        <option value="laptop">Laptop/PC</option>
                        <option value="mobile">Mobile Phone</option>
                        <option value="nas">NAS</option>
                        <option value="rack">Networking Rack</option>
                        <option value="printer">Printer</option>
                        <option value="punchdevice">Punch Device</option>
                        <option value="radio-tower">Radio Tower</option>
                        <option value="router">Router</option>
                        <option value="server">Server</option>
                        <option value="switch">Switch</option>
                        <option value="tablet">Tablet</option>
                        <option value="wifi-router">WiFi Router</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div>
                    <label for="deviceMap" class="block text-sm font-medium text-slate-400 mb-1">Map Assignment (Optional)</label>
                    <select id="deviceMap" name="map_id" class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500">
                        <option value="">-- No Map --</option>
                        <!-- Maps will be populated by JS -->
                    </select>
                </div>
                <fieldset class="border border-slate-600 rounded-lg p-4">
                    <legend class="text-sm font-medium text-slate-400 px-2">Custom Icon</legend>
                    <div class="space-y-3">
                        <div>
                            <label for="icon_url" class="block text-sm font-medium text-slate-400 mb-1">Icon URL</label>
                            <input type="text" id="icon_url" name="icon_url" placeholder="Leave blank to use default icon" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm">
                        </div>
                        <div class="text-center text-slate-500 text-sm">OR</div>
                        <div>
                            <label for="icon_upload" class="block text-sm font-medium text-slate-400 mb-1">Upload Icon</label>
                            <input type="file" id="icon_upload" name="icon_upload" accept="image/*" class="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-cyan-600/20 file:text-cyan-300 hover:file:bg-cyan-600/40">
                            <div id="icon_upload_loader" class="hidden mt-2"><div class="loader inline-block w-4 h-4"></div><span class="ml-2 text-sm">Uploading...</span></div>
                        </div>
                        <div id="icon_preview_wrapper" class="hidden mt-2 text-center">
                            <img id="icon_preview" src="" alt="Icon Preview" class="max-w-full h-16 mx-auto bg-slate-700 p-1 rounded">
                        </div>
                    </div>
                </fieldset>
                <div>
                    <label for="pingInterval" class="block text-sm font-medium text-slate-400 mb-1">Ping Interval (seconds)</label>
                    <input type="number" id="pingInterval" name="ping_interval" placeholder="e.g., 60 (optional)" class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500">
                </div>
                <fieldset id="thresholdsWrapper" class="border border-slate-600 rounded-lg p-4">
                    <legend class="text-sm font-medium text-slate-400 px-2">Status Thresholds (optional)</legend>
                    <div class="grid grid-cols-2 gap-4">
                        <div>
                            <label for="warning_latency_threshold" class="block text-xs text-slate-400 mb-1">Warn Latency (ms)</label>
                            <input type="number" id="warning_latency_threshold" name="warning_latency_threshold" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm">
                        </div>
                        <div>
                            <label for="warning_packetloss_threshold" class="block text-xs text-slate-400 mb-1">Warn Packet Loss (%)</label>
                            <input type="number" id="warning_packetloss_threshold" name="warning_packetloss_threshold" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm">
                        </div>
                        <div>
                            <label for="critical_latency_threshold" class="block text-xs text-slate-400 mb-1">Critical Latency (ms)</label>
                            <input type="number" id="critical_latency_threshold" name="critical_latency_threshold" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm">
                        </div>
                        <div>
                            <label for="critical_packetloss_threshold" class="block text-xs text-slate-400 mb-1">Critical Packet Loss (%)</label>
                            <input type="number" id="critical_packetloss_threshold" name="critical_packetloss_threshold" class="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm">
                        </div>
                    </div>
                </fieldset>
                <div>
                    <label for="iconSize" class="block text-sm font-medium text-slate-400 mb-1">Icon Size</label>
                    <input type="number" id="iconSize" name="icon_size" placeholder="e.g., 50" value="50" class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500">
                </div>
                <div>
                    <label for="nameTextSize" class="block text-sm font-medium text-slate-400 mb-1">Name Text Size</label>
                    <input type="number" id="nameTextSize" name="name_text_size" placeholder="e.g., 14" value="14" class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500">
                </div>
                <div>
                    <label for="showLivePing" class="flex items-center text-sm font-medium text-slate-400">
                        <input type="checkbox" id="showLivePing" name="show_live_ping" class="h-4 w-4 rounded border-slate-500 bg-slate-700 text-cyan-600 focus:ring-cyan-500">
                        <span class="ml-2">Show live ping status on map</span>
                    </label>
                </div>
                <div class="flex justify-end gap-4 mt-6">
                    <a href="devices.php" class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600">Cancel</a>
                    <button type="submit" id="saveDeviceBtn" class="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
                        <i class="fas fa-save mr-2"></i>Save Changes
                    </button>
                </div>
            </form>
        </div>
    </div>
</main>

<?php include 'footer.php'; ?>