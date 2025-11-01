function initMap() {
    // Initialize all modules
    MapApp.ui.cacheElements();

    const {
        els
    } = MapApp.ui;
    const {
        api
    } = MapApp;
    const {
        state
    } = MapApp;
    const {
        mapManager
    } = MapApp;
    const {
        deviceManager
    } = MapApp;

    // Add new elements to cache
    els.mapSettingsBtn = document.getElementById('mapSettingsBtn');
    els.mapSettingsModal = document.getElementById('mapSettingsModal');
    els.mapSettingsForm = document.getElementById('mapSettingsForm');
    els.cancelMapSettingsBtn = document.getElementById('cancelMapSettingsBtn');
    els.resetMapBgBtn = document.getElementById('resetMapBgBtn');
    els.mapBgUpload = document.getElementById('mapBgUpload');
    els.placeDeviceBtn = document.getElementById('placeDeviceBtn');
    els.placeDeviceModal = document.getElementById('placeDeviceModal');
    els.closePlaceDeviceModal = document.getElementById('closePlaceDeviceModal');
    els.placeDeviceList = document.getElementById('placeDeviceList');
    els.placeDeviceLoader = document.getElementById('placeDeviceLoader');
    els.mapPermissionsBtn = document.getElementById('mapPermissionsBtn'); // New element
    els.mapPermissionsModal = document.getElementById('mapPermissionsModal'); // New element
    els.mapPermissionsForm = document.getElementById('mapPermissionsForm'); // New element
    els.permissionsMapName = document.getElementById('permissionsMapName'); // New element
    els.permissionsMapId = document.getElementById('permissionsMapId'); // New element
    els.userPermissionsList = document.getElementById('userPermissionsList'); // New element
    els.cancelMapPermissionsBtn = document.getElementById('cancelMapPermissionsBtn'); // New element
    els.saveMapPermissionsBtn = document.getElementById('saveMapPermissionsBtn'); // New element


    // Check if the user is admin (set in footer.php)
    const IS_ADMIN = window.isAdmin;

    // Cleanup function for SPA navigation
    window.cleanup = () => {
        if (state.animationFrameId) {
            cancelAnimationFrame(state.animationFrameId);
            state.animationFrameId = null;
        }
        Object.values(state.pingIntervals).forEach(clearInterval);
        state.pingIntervals = {};
        if (state.globalRefreshIntervalId) {
            clearInterval(state.globalRefreshIntervalId);
            state.globalRefreshIntervalId = null;
        }
        if (state.network) {
            state.network.destroy();
            state.network = null;
        }
        window.cleanup = null;
    };

    // Event Listeners Setup
    if (IS_ADMIN) {
        if (els.mapPermissionsBtn) { // Ensure button exists before adding listener
            els.mapPermissionsBtn.addEventListener('click', async () => {
                if (!state.currentMapId) {
                    window.notyf.error('Please select a map first.');
                    return;
                }
                const currentMap = state.maps.find(m => m.id == state.currentMapId);
                els.permissionsMapName.textContent = currentMap ? currentMap.name : 'Unknown Map';
                els.permissionsMapId.value = state.currentMapId;
                openModal('mapPermissionsModal');
                
                els.userPermissionsList.innerHTML = '<div class="text-center py-4"><div class="loader mx-auto w-4 h-4"></div><span class="ml-2 text-sm text-slate-400">Loading users...</span></div>';
                try {
                    const { all_users, map_user_ids } = await api.get('get_all_users_with_map_permissions', { map_id: state.currentMapId });
                    
                    if (all_users.length === 0) {
                        els.userPermissionsList.innerHTML = '<p class="text-sm text-slate-500">No users found to assign permissions.</p>';
                        return;
                    }

                    els.userPermissionsList.innerHTML = all_users.map(user => {
                        const isChecked = map_user_ids.includes(user.id.toString());
                        return `
                            <label class="flex items-center text-sm font-medium text-slate-400">
                                <input type="checkbox" name="user_id[]" value="${user.id}" class="h-4 w-4 rounded border-slate-500 bg-slate-700 text-cyan-600 focus:ring-cyan-500" ${isChecked ? 'checked' : ''} ${user.role === 'admin' ? 'disabled' : ''}>
                                <span class="ml-2">${user.username} (${user.role}) ${user.role === 'admin' ? '(Admin - Always has access)' : ''}</span>
                            </label>
                        `;
                    }).join('');

                } catch (error) {
                    console.error('Failed to load user map permissions:', error);
                    els.userPermissionsList.innerHTML = '<p class="text-sm text-red-400">Failed to load user permissions.</p>';
                }
            });
        } else {
            console.error('ERROR: mapPermissionsBtn not found, cannot attach event listener.');
        }


        els.cancelMapPermissionsBtn.addEventListener('click', () => closeModal('mapPermissionsModal'));

        els.mapPermissionsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const mapId = els.permissionsMapId.value;
            const selectedUserIds = Array.from(els.userPermissionsList.querySelectorAll('input[type="checkbox"]:checked'))
                                        .map(checkbox => checkbox.value);
            
            // Fetch all users again to ensure we have the admin user's ID for the override
            const { all_users } = await api.get('get_all_users_with_map_permissions', { map_id: mapId });
            const adminUser = all_users.find(u => u.role === 'admin');
            if (adminUser && !selectedUserIds.includes(adminUser.id.toString())) {
                selectedUserIds.push(adminUser.id.toString());
            }

            els.saveMapPermissionsBtn.disabled = true;
            els.saveMapPermissionsBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';

            try {
                const result = await api.post('update_map_user_permissions', { map_id: mapId, user_ids: selectedUserIds });
                if (result.success) {
                    window.notyf.success('Map permissions updated successfully.');
                    closeModal('mapPermissionsModal');
                } else {
                    throw new Error(result.error);
                }
            } catch (error) {
                console.error('Failed to save map permissions:', error);
                window.notyf.error(error.message || 'Failed to save map permissions.');
            } finally {
                els.saveMapPermissionsBtn.disabled = false;
                els.saveMapPermissionsBtn.innerHTML = 'Save Permissions';
            }
        });

        // Add Device Button (opens modal for new device)
        els.addDeviceBtn.addEventListener('click', () => {
            if (!state.currentMapId) {
                window.notyf.error('Please select a map first to add a device.');
                return;
            }
            MapApp.ui.openDeviceModal(null, { map_id: state.currentMapId }); // Pass current map ID
        });

        // Place Existing Device Button
        els.placeDeviceBtn.addEventListener('click', async () => {
            if (!state.currentMapId) {
                window.notyf.error('Please select a map first to place a device.');
                return;
            }
            openModal('placeDeviceModal');
            await populatePlaceDeviceList();
        });

        els.closePlaceDeviceModal.addEventListener('click', () => closeModal('placeDeviceModal'));

        const populatePlaceDeviceList = async () => {
            els.placeDeviceLoader.classList.remove('hidden');
            els.placeDeviceList.innerHTML = '';
            try {
                const unmappedDevices = await api.get('get_devices', { unmapped: true });
                if (unmappedDevices.length === 0) {
                    els.placeDeviceList.innerHTML = '<p class="text-slate-500 text-center py-4">No unmapped devices found in your inventory.</p>';
                } else {
                    els.placeDeviceList.innerHTML = unmappedDevices.map(device => `
                        <div class="flex items-center justify-between p-3 border-b border-slate-700 last:border-b-0 hover:bg-slate-700/50 cursor-pointer" data-device-id="${device.id}" data-device-name="${device.name}" data-device-ip="${device.ip || ''}">
                            <div>
                                <div class="font-medium text-white">${device.name}</div>
                                <div class="text-sm text-slate-400">${device.ip || 'No IP'}</div>
                            </div>
                            <button class="place-device-action-btn px-3 py-1 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700" data-device-id="${device.id}">Place</button>
                        </div>
                    `).join('');

                    els.placeDeviceList.querySelectorAll('.place-device-action-btn').forEach(button => {
                        button.addEventListener('click', async (e) => {
                            const deviceId = e.target.dataset.deviceId;
                            const deviceName = e.target.closest('[data-device-id]').dataset.deviceName;
                            const defaultX = Math.floor(Math.random() * 500) + 50; // Random position
                            const defaultY = Math.floor(Math.random() * 300) + 50;

                            try {
                                await api.post('update_device', { 
                                    id: deviceId, 
                                    updates: { map_id: state.currentMapId, x: defaultX, y: defaultY } 
                                });
                                window.notyf.success(`Device '${deviceName}' placed on the map.`);
                                closeModal('placeDeviceModal');
                                mapManager.switchMap(state.currentMapId); // Refresh map
                            } catch (error) {
                                window.notyf.error(`Failed to place device '${deviceName}'.`);
                                console.error('Error placing device:', error);
                            }
                        });
                    });
                }
            } catch (error) {
                window.notyf.error('Failed to load unmapped devices.');
                console.error('Error loading unmapped devices:', error);
            } finally {
                els.placeDeviceLoader.classList.add('hidden');
            }
        };

    } else {
        // Non-admin user: Disable all modification features
        
        // Disable drag functionality for non-admins
        if (state.network) {
            state.network.setOptions({ interaction: { dragNodes: false } });
        }
        
        // Prevent context menu actions that modify the map
        const contextMenu = document.getElementById('context-menu');
        if (contextMenu) {
            contextMenu.addEventListener('click', (e) => {
                const target = e.target.closest('.context-menu-item');
                if (target && ['edit', 'copy', 'delete', 'edit-edge', 'delete-edge'].includes(target.dataset.action)) {
                    e.preventDefault();
                    window.notyf.error('Read-only mode: Only administrators can modify the map.');
                }
            });
        }
        
        // Override network initialization to disable manipulation buttons
        MapApp.network.initializeMap = () => {
            const container = document.getElementById('network-map');
            const contextMenu = document.getElementById('context-menu');
            MapApp.ui.populateLegend();
            const data = { nodes: MapApp.state.nodes, edges: MapApp.state.edges };
            const options = { 
                physics: false, 
                interaction: { hover: true, dragNodes: false }, // Explicitly disable dragNodes
                edges: { smooth: true, width: 2, font: { color: '#ffffff', size: 12, align: 'top', strokeWidth: 0 } }, 
                manipulation: { enabled: false } // Disable all manipulation buttons
            };
            MapApp.state.network = new vis.Network(container, data, options);
            
            // Event Handlers (only read-only ones remain)
            MapApp.state.network.on("dragEnd", (params) => { 
                // Prevent saving position if dragNodes is somehow bypassed
                if (params.nodes.length > 0) {
                    window.notyf.error('Read-only mode: Cannot move devices.');
                }
            });
            MapApp.state.network.on("doubleClick", (params) => { 
                // Allow double click to view details if implemented, but not edit modal
                if (params.nodes.length > 0) {
                    window.notyf.info('Read-only mode: Cannot edit device details.');
                }
            });

            const closeContextMenu = () => { contextMenu.style.display = 'none'; };
            MapApp.state.network.on("oncontext", (params) => {
                params.event.preventDefault();
                const nodeId = MapApp.state.network.getNodeAt(params.pointer.DOM);
                const edgeId = MapApp.state.network.getEdgeAt(params.pointer.DOM);

                if (nodeId) {
                    const node = MapApp.state.nodes.get(nodeId);
                    // Only show "Check Status" if admin
                    let contextMenuItems = '';
                    if (IS_ADMIN) {
                        contextMenuItems += `<div class="context-menu-item" data-action="ping" data-id="${nodeId}"><i class="fas fa-sync fa-fw mr-2"></i>Check Status</div>`;
                    }
                    contextMenuItems += `<div class="context-menu-item" data-action="read-only-info" style="color: #f59e0b;"><i class="fas fa-info-circle fa-fw mr-2"></i>Read-Only Mode</div>`;
                    
                    contextMenu.innerHTML = contextMenuItems;
                    contextMenu.style.left = `${params.pointer.DOM.x}px`;
                    contextMenu.style.top = `${params.pointer.DOM.y}px`;
                    contextMenu.style.display = 'block';
                    document.addEventListener('click', closeContextMenu, { once: true });
                } else if (edgeId) {
                    contextMenu.innerHTML = `
                        <div class="context-menu-item" data-action="read-only-info" style="color: #f59e0b;"><i class="fas fa-info-circle fa-fw mr-2"></i>Read-Only Mode</div>
                    `;
                    contextMenu.style.left = `${params.pointer.DOM.x}px`;
                    contextMenu.style.top = `${params.pointer.DOM.y}px`;
                    contextMenu.style.display = 'block';
                    document.addEventListener('click', closeContextMenu, { once: true });
                } else { 
                    closeContextMenu(); 
                }
            });
            contextMenu.addEventListener('click', async (e) => {
                const target = e.target.closest('.context-menu-item');
                if (target) {
                    const { action, id } = target.dataset;
                    closeContextMenu();

                    if (action === 'ping') {
                        const icon = document.createElement('i');
                        icon.className = 'fas fa-spinner fa-spin';
                        target.prepend(icon);
                        deviceManager.pingSingleDevice(id).finally(() => icon.remove());
                    } else if (action === 'read-only-info') {
                        window.notyf.error('Read-only mode: Only administrators can modify the map.');
                    } else {
                        window.notyf.error('Read-only mode: Only administrators can modify the map.');
                    }
                }
            });
        };
    }

    // Common event listeners (read-only actions)
    els.refreshStatusBtn.addEventListener('click', async () => {
        els.refreshStatusBtn.disabled = true;
        await deviceManager.performBulkRefresh();
        if (!els.liveRefreshToggle.checked) els.refreshStatusBtn.disabled = false;
    });

    els.liveRefreshToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
            window.notyf.info(`Live status enabled. Updating every ${MapApp.config.REFRESH_INTERVAL_SECONDS} seconds.`);
            els.refreshStatusBtn.disabled = true;
            deviceManager.performBulkRefresh();
            state.globalRefreshIntervalId = setInterval(deviceManager.performBulkRefresh, MapApp.config.REFRESH_INTERVAL_SECONDS * 1000);
        } else {
            if (state.globalRefreshIntervalId) clearInterval(state.globalRefreshIntervalId);
            state.globalRefreshIntervalId = null;
            els.refreshStatusBtn.disabled = false;
            window.notyf.info('Live status disabled.');
        }
    });

    els.mapSelector.addEventListener('change', (e) => mapManager.switchMap(e.target.value));

    // Initial Load
    (async () => {
        els.liveRefreshToggle.checked = false;
        const urlParams = new URLSearchParams(window.location.search);
        const mapToLoad = urlParams.get('map_id');
        const firstMapId = await mapManager.loadMaps();
        const initialMapId = mapToLoad || firstMapId;
        if (initialMapId) {
            els.mapSelector.value = initialMapId;
            await mapManager.switchMap(initialMapId);
            const deviceToEdit = urlParams.get('edit_device_id');
            if (deviceToEdit && state.nodes.get(deviceToEdit) && IS_ADMIN) {
                MapApp.ui.openDeviceModal(deviceToEdit);
                const newUrl = window.location.pathname + `?map_id=${initialMapId}`;
                history.replaceState(null, '', newUrl);
            }
        }
    })();
}