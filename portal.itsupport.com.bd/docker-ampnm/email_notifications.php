<?php
require_once 'includes/auth_check.php';
include 'header.php';
?>

<main id="app">
    <div class="container mx-auto px-4 py-8">
        <h1 class="text-3xl font-bold text-white mb-6">Email Notifications</h1>

        <!-- SMTP Settings Card -->
        <div class="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-6 mb-8">
            <h2 class="text-xl font-semibold text-white mb-4">SMTP Server Settings</h2>
            <form id="smtpSettingsForm" class="space-y-4">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label for="smtpHost" class="block text-sm font-medium text-slate-400 mb-1">SMTP Host</label>
                        <input type="text" id="smtpHost" name="host" required class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500">
                    </div>
                    <div>
                        <label for="smtpPort" class="block text-sm font-medium text-slate-400 mb-1">Port</label>
                        <input type="number" id="smtpPort" name="port" required class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500">
                    </div>
                    <div>
                        <label for="smtpUsername" class="block text-sm font-medium text-slate-400 mb-1">Username</label>
                        <input type="text" id="smtpUsername" name="username" required class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500">
                    </div>
                    <div>
                        <label for="smtpPassword" class="block text-sm font-medium text-slate-400 mb-1">Password</label>
                        <input type="password" id="smtpPassword" name="password" placeholder="Leave blank to keep current" class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500">
                    </div>
                    <div>
                        <label for="smtpEncryption" class="block text-sm font-medium text-slate-400 mb-1">Encryption</label>
                        <select id="smtpEncryption" name="encryption" class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500">
                            <option value="none">None</option>
                            <option value="ssl">SSL</option>
                            <option value="tls">TLS</option>
                        </select>
                    </div>
                    <div>
                        <label for="smtpFromEmail" class="block text-sm font-medium text-slate-400 mb-1">From Email Address</label>
                        <input type="email" id="smtpFromEmail" name="from_email" required class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500">
                    </div>
                    <div class="md:col-span-2">
                        <label for="smtpFromName" class="block text-sm font-medium text-slate-400 mb-1">From Name (Optional)</label>
                        <input type="text" id="smtpFromName" name="from_name" class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500">
                    </div>
                </div>
                <div class="flex justify-end">
                    <button type="submit" id="saveSmtpBtn" class="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
                        <i class="fas fa-save mr-2"></i>Save Settings
                    </button>
                </div>
            </form>
            <div id="smtpLoader" class="text-center py-4 hidden"><div class="loader mx-auto"></div></div>
        </div>

        <!-- Device Subscriptions Card -->
        <div class="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-6">
            <div class="flex items-center justify-between mb-4">
                <h2 class="text-xl font-semibold text-white">Device Email Subscriptions</h2>
                <button id="addSubscriptionBtn" class="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
                    <i class="fas fa-plus mr-2"></i>Add Subscription
                </button>
            </div>
            <div class="mb-4">
                <input type="search" id="subscriptionSearchInput" placeholder="Search by device, map, or recipient..." class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500">
            </div>

            <div id="subscriptionsList" class="mt-6">
                <div id="subscriptionsTableBody" class="overflow-x-auto">
                    <table class="min-w-full">
                        <thead class="border-b border-slate-700">
                            <tr>
                                <th class="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Device</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Map</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Recipient</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Triggers</th>
                                <th class="px-6 py-3 text-left text-xs font-medium text-slate-400 uppercase">Actions</th>
                            </tr>
                        </thead>
                        <tbody id="subscriptionsTable">
                            <!-- Subscriptions will be loaded here by JS -->
                        </tbody>
                    </table>
                </div>
                <div id="subscriptionsLoader" class="text-center py-8"><div class="loader mx-auto"></div></div>
                <div id="noSubscriptionsMessage" class="text-center py-8 hidden">
                    <i class="fas fa-bell-slash text-slate-600 text-4xl mb-4"></i>
                    <p class="text-slate-500">No subscriptions found.</p>
                </div>
            </div>
        </div>
    </div>

    <!-- Subscription Editor Modal -->
    <div id="subscriptionEditorModal" class="modal-backdrop hidden">
        <div class="modal-panel bg-slate-800 rounded-lg shadow-xl p-6 w-full max-w-md max-h-[90vh] flex flex-col">
            <h2 id="subscriptionEditorModalTitle" class="text-xl font-semibold text-white mb-4 flex-shrink-0">Add/Edit Subscription</h2>
            <form id="subscriptionEditorForm" class="flex flex-col flex-grow min-h-0">
                <input type="hidden" id="editorSubscriptionId" name="id">
                <div class="flex-grow overflow-y-auto space-y-4 p-1 -m-1">
                    <div>
                        <label for="editorDeviceSelect" class="block text-sm font-medium text-slate-400 mb-1">Select Device</label>
                        <select id="editorDeviceSelect" name="device_id" class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500" required>
                            <option value="">-- Select a device --</option>
                            <!-- Devices will be populated by JS -->
                        </select>
                    </div>
                    <div>
                        <label for="editorRecipientEmail" class="block text-sm font-medium text-slate-400 mb-1">Recipient Email</label>
                        <input type="email" id="editorRecipientEmail" name="recipient_email" required class="w-full bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500">
                    </div>
                    <div class="grid grid-cols-2 gap-4">
                        <label class="flex items-center text-sm font-medium text-slate-400">
                            <input type="checkbox" id="editorNotifyOnline" name="notify_on_online" class="h-4 w-4 rounded border-slate-500 bg-slate-700 text-cyan-600 focus:ring-cyan-500">
                            <span class="ml-2">Notify on Online</span>
                        </label>
                        <label class="flex items-center text-sm font-medium text-slate-400">
                            <input type="checkbox" id="editorNotifyOffline" name="notify_on_offline" class="h-4 w-4 rounded border-slate-500 bg-slate-700 text-cyan-600 focus:ring-cyan-500">
                            <span class="ml-2">Notify on Offline</span>
                        </label>
                        <label class="flex items-center text-sm font-medium text-slate-400">
                            <input type="checkbox" id="editorNotifyWarning" name="notify_on_warning" class="h-4 w-4 rounded border-slate-500 bg-slate-700 text-cyan-600 focus:ring-cyan-500">
                            <span class="ml-2">Notify on Warning</span>
                        </label>
                        <label class="flex items-center text-sm font-medium text-slate-400">
                            <input type="checkbox" id="editorNotifyCritical" name="notify_on_critical" class="h-4 w-4 rounded border-slate-500 bg-slate-700 text-cyan-600 focus:ring-cyan-500">
                            <span class="ml-2">Notify on Critical</span>
                        </label>
                    </div>
                </div>
                <div class="flex justify-end gap-4 mt-6 flex-shrink-0">
                    <button type="button" id="cancelEditorBtn" class="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600">Cancel</button>
                    <button type="submit" id="saveEditorBtn" class="px-4 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">Save Subscription</button>
                </div>
            </form>
        </div>
    </div>
</main>

<?php include 'footer.php'; ?>