<?php
require_once 'includes/auth_check.php';
include 'header.php';
?>

<main id="app">
    <div class="container mx-auto px-4 py-8">
        <div class="flex items-center justify-between mb-6">
            <h1 class="text-3xl font-bold text-white">Dashboard</h1>
            <div class="flex items-center gap-2">
                <span class="text-slate-400">Internet Status:</span>
                <span id="internetStatusBadge" class="px-3 py-1 rounded-full text-sm font-semibold bg-slate-600 text-slate-300">Checking...</span>
                <button id="refreshInternetStatusBtn" class="px-3 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600" title="Refresh Internet Status"><i class="fas fa-sync-alt"></i></button>
            </div>
        </div>

        <!-- Dashboard Widgets -->
        <div id="dashboardLoader" class="text-center py-16"><div class="loader mx-auto"></div></div>
        <div id="dashboard-widgets" class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 hidden">
            <div class="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-5">
                <h2 class="text-lg font-semibold text-white mb-2">Total Devices</h2>
                <p id="totalDevicesText" class="text-4xl font-bold text-cyan-400">
                    <span class="mr-1">0</span>
                    <span class="text-base text-slate-400">devices</span>
                </p>
            </div>
            <div class="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-5">
                <h2 class="text-lg font-semibold text-white mb-2">Online</h2>
                <p id="onlineCount" class="text-4xl font-bold text-green-400">0</p>
            </div>
            <div class="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-5">
                <h2 class="text-lg font-semibold text-white mb-2">Warning</h2>
                <p id="warningCount" class="text-4xl font-bold text-yellow-400">0</p>
            </div>
            <div class="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-5">
                <h2 class="text-lg font-semibold text-white mb-2">Critical / Offline</h2>
                <p id="criticalCount" class="text-4xl font-bold text-red-400">0</p>
            </div>
        </div>

        <!-- Status Chart -->
        <div class="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-6 mt-8 hidden" id="statusChartContainer">
            <h2 class="text-xl font-semibold text-white mb-4">Device Status Overview</h2>
            <div class="h-64">
                <canvas id="statusChart"></canvas>
            </div>
        </div>

        <!-- Recent Activity -->
        <div class="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-6 mt-8">
            <h2 class="text-xl font-semibold text-white mb-4">Recent Activity</h2>
            <div id="recentActivityList" class="space-y-3">
                <!-- Activity items will be loaded here by JS -->
            </div>
            <div id="noRecentActivityMessage" class="text-center py-8 hidden">
                <i class="fas fa-bell text-slate-600 text-4xl mb-4"></i>
                <p class="text-slate-500">No recent activity to display.</p>
            </div>
        </div>

        <!-- Manual Ping Test -->
        <div class="bg-slate-800 border border-slate-700 rounded-lg shadow-xl p-6 mt-8">
            <h2 class="text-xl font-semibold text-white mb-4">Manual Ping Test</h2>
            <form id="pingForm" class="flex flex-col sm:flex-row gap-4 mb-4">
                <input type="text" id="pingHostInput" placeholder="Enter host or IP (e.g., google.com)" class="flex-1 bg-slate-900 border border-slate-600 rounded-lg px-4 py-2 focus:ring-2 focus:ring-cyan-500" required>
                <button type="submit" id="pingButton" class="px-6 py-2 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700">
                    <i class="fas fa-bolt mr-2"></i>Ping
                </button>
            </form>
            <div id="pingResultContainer" class="bg-slate-900 border border-slate-700 rounded-lg p-4 font-mono text-sm text-slate-300 overflow-x-auto hidden">
                <pre id="pingResultPre"></pre>
            </div>
        </div>
    </div>
</main>

<?php include 'footer.php'; ?>