window.MapApp = window.MapApp || {};

MapApp.ui = {
    // DOM Elements
    els: {},

    // Cache DOM elements
    cacheElements: () => {
        MapApp.ui.els = {
            mapWrapper: document.getElementById('network-map-wrapper'),
            mapSelector: document.getElementById('mapSelector'),
            newMapBtn: document.getElementById('newMapBtn'),
            renameMapBtn: document.getElementById('renameMapBtn'),
            deleteMapBtn: document.getElementById('deleteMapBtn'),
            mapContainer: document.getElementById('map-container'),
            noMapsContainer: document.getElementById('no-maps'),
            createFirstMapBtn: document.getElementById('createFirstMapBtn'),
            currentMapName: document.getElementById('currentMapName'),
            scanNetworkBtn: document.getElementById('scanNetworkBtn'),
            refreshStatusBtn: document.getElementById('refreshStatusBtn'),
            liveRefreshToggle: document.getElementById('liveRefreshToggle'),
            addDeviceBtn: document.getElementById('addDeviceBtn'), // Now an <a> tag
            addEdgeBtn: document.getElementById('addEdgeBtn'),
            fullscreenBtn: document.getElementById('fullscreenBtn'),
            exportBtn: document.getElementById('exportBtn'),
            importBtn: document.getElementById('importBtn'),
            importFile: document.getElementById('importFile'),
            // deviceModal: document.getElementById('deviceModal'), // Removed - now uses editdevice.php
            // deviceForm: document.getElementById('deviceForm'), // Removed
            // cancelBtn: document.getElementById('cancelBtn'), // Removed
            edgeModal: document.getElementById('edgeModal'),
            edgeForm: document.getElementById('edgeForm'),
            cancelEdgeBtn: document.getElementById('cancelEdgeBtn'),
            scanModal: document.getElementById('scanModal'),
            closeScanModal: document.getElementById('closeScanModal'),
            scanForm: document.getElementById('scanForm'),
            scanLoader: document.getElementById('scanLoader'),
            scanResults: document.getElementById('scanResults'),
            scanInitialMessage: document.getElementById('scanInitialMessage'),
            placeDeviceBtn: document.getElementById('placeDeviceBtn'),
            placeDeviceModal: document.getElementById('placeDeviceModal'),
            closePlaceDeviceModal: document.getElementById('closePlaceDeviceModal'),
            placeDeviceList: document.getElementById('placeDeviceList'),
            placeDeviceLoader: document.getElementById('placeDeviceLoader'),
            mapPermissionsBtn: document.getElementById('mapPermissionsBtn'),
            mapPermissionsModal: document.getElementById('mapPermissionsModal'),
            mapPermissionsForm: document.getElementById('mapPermissionsForm'),
            permissionsMapName: document.getElementById('permissionsMapName'),
            permissionsMapId: document.getElementById('permissionsMapId'),
            userPermissionsList: document.getElementById('userPermissionsList'),
            cancelMapPermissionsBtn: document.getElementById('cancelMapPermissionsBtn'),
            saveMapPermissionsBtn: document.getElementById('saveMapPermissionsBtn'),
            // New map settings elements
            mapSettingsBtn: document.getElementById('mapSettingsBtn'),
            mapSettingsModal: document.getElementById('mapSettingsModal'),
            mapSettingsForm: document.getElementById('mapSettingsForm'),
            cancelMapSettingsBtn: document.getElementById('cancelMapSettingsBtn'),
            resetMapBgBtn: document.getElementById('resetMapBgBtn'),
            mapBgColor: document.getElementById('mapBgColor'),
            mapBgColorHex: document.getElementById('mapBgColorHex'),
            mapBgImageUrl: document.getElementById('mapBgImageUrl'),
            mapBgUpload: document.getElementById('mapBgUpload'),
            mapBgUploadLoader: document.getElementById('mapBgUploadLoader'),
        };
    },

    populateLegend: () => {
        const legendContainer = document.getElementById('status-legend');
        if (!legendContainer) return;
        const statusOrder = ['online', 'warning', 'critical', 'offline', 'unknown'];
        legendContainer.innerHTML = statusOrder.map(status => {
            const color = MapApp.config.statusColorMap[status];
            const label = status.charAt(0).toUpperCase() + status.slice(1);
            return `<div class="legend-item"><div class="legend-dot" style="background-color: ${color};"></div><span>${label}</span></div>`;
        }).join('');
    },

    // Removed toggleDeviceModalFields as it's no longer used for a modal
    // Removed openDeviceModal as it's no longer used for a modal

    openEdgeModal: (edgeId) => {
        const edge = MapApp.state.edges.get(edgeId);
        document.getElementById('edgeId').value = edge.id;
        document.getElementById('connectionType').value = edge.connection_type || 'cat5';
        MapApp.ui.els.edgeModal.classList.remove('hidden');
    },

    updateAndAnimateEdges: () => {
        MapApp.state.tick++;
        const animatedDashes = [4 - (MapApp.state.tick % 12), 8, MapApp.state.tick % 12];
        const updates = [];
        const allEdges = MapApp.state.edges.get();
        if (MapApp.state.nodes.length > 0 && allEdges.length > 0) {
            const deviceStatusMap = new Map(MapApp.state.nodes.get({ fields: ['id', 'deviceData'] }).map(d => [d.id, d.deviceData.status]));
            allEdges.forEach(edge => {
                const sourceStatus = deviceStatusMap.get(edge.from);
                const targetStatus = deviceStatusMap.get(edge.to);
                const isOffline = sourceStatus === 'offline' || targetStatus === 'offline';
                const isActive = sourceStatus === 'online' && targetStatus === 'online';
                const color = isOffline ? MapApp.config.statusColorMap.offline : (MapApp.config.edgeColorMap[edge.connection_type] || MapApp.config.edgeColorMap.cat5);
                let dashes = false;
                if (isActive) { dashes = animatedDashes; } 
                else if (edge.connection_type === 'wifi' || edge.connection_type === 'radio') { dashes = [5, 5]; }
                updates.push({ id: edge.id, color, dashes });
            });
        }
        if (updates.length > 0) MapApp.state.edges.update(updates);
        MapApp.state.animationFrameId = requestAnimationFrame(MapApp.ui.updateAndAnimateEdges);
    }
};