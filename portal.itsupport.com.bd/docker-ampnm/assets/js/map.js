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

    // --- Fullscreen Functionality ---
    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            els.mapWrapper.requestFullscreen().catch(err => {
                window.notyf.error(`Error attempting to enable fullscreen mode: ${err.message} (${err.name})`);
            });
        } else {
            document.exitFullscreen();
        }
    };
    els.fullscreenBtn.addEventListener('click', toggleFullscreen);

    // --- Map Settings Functionality ---
    const openMapSettingsModal = () => {
        if (!state.currentMapId) {
            window.notyf.error('Please select a map first.');
            return;
        }
        const currentMap = state.maps.find(m => m.id == state.currentMapId);
        if (currentMap) {
            els.mapBgColor.value = currentMap.background_color || '#1e293b';
            els.mapBgColorHex.value = currentMap.background_color || '#1e293b';
            els.mapBgImageUrl.value = currentMap.background_image_url || '';
            els.mapBgUpload.value = ''; // Clear file input
            els.mapBgUploadLoader.classList.add('hidden');
        }
        openModal('mapSettingsModal');
    };
    if (IS_ADMIN) {
        els.mapSettingsBtn.addEventListener('click', openMapSettingsModal);

        // Sync color picker and hex input
        els.mapBgColor.addEventListener('input', (e) => {
            els.mapBgColorHex.value = e.target.value;
        });
        els.mapBgColorHex.addEventListener('input', (e) => {
            els.mapBgColor.value = e.target.value;
        });

        // Preview uploaded image (not actually uploading yet)
        els.mapBgUpload.addEventListener('change', (e) => {
            if (e.target.files.length > 0) {
                const file = e.target.files[0];
                const reader = new FileReader();
                reader.onload = (event) => {
                    // Temporarily set the image URL input to the data URL for preview
                    els.mapBgImageUrl.value = event.target.result;
                    // Apply to map immediately for preview
                    const mapEl = document.getElementById('network-map');
                    mapEl.style.backgroundImage = `url(${event.target.result})`;
                    mapEl.style.backgroundSize = 'cover';
                    mapEl.style.backgroundPosition = 'center';
                };
                reader.readAsDataURL(file);
            } else {
                // If no file, revert to current map's image or none
                const currentMap = state.maps.find(m => m.id == state.currentMapId);
                els.mapBgImageUrl.value = currentMap.background_image_url || '';
                const mapEl = document.getElementById('network-map');
                mapEl.style.backgroundImage = currentMap.background_image_url ? `url(${currentMap.background_image_url})` : '';
            }
        });

        els.mapSettingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const mapId = state.currentMapId;
            const backgroundColor = els.mapBgColorHex.value;
            let backgroundImageURL = els.mapBgImageUrl.value;

            els.mapSettingsForm.querySelector('button[type="submit"]').disabled = true;
            els.mapSettingsForm.querySelector('button[type="submit"]').innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';

            try {
                if (els.mapBgUpload.files.length > 0) {
                    els.mapBgUploadLoader.classList.remove('hidden');
                    const uploadResult = await uploadMapBackground(mapId, els.mapBgUpload.files[0]);
                    if (uploadResult.success) {
                        backgroundImageURL = uploadResult.url;
                        window.notyf.success('Background image uploaded.');
                    } else {
                        throw new Error(uploadResult.error || 'Failed to upload background image.');
                    }
                }

                const result = await api.post('update_map', {
                    id: mapId,
                    updates: {
                        background_color: backgroundColor,
                        background_image_url: backgroundImageURL
                    }
                });

                if (result.success) {
                    window.notyf.success('Map settings updated successfully.');
                    closeModal('mapSettingsModal');
                    mapManager.switchMap(mapId); // Reload map to apply changes
                } else {
                    throw new Error(result.error || 'Failed to update map settings.');
                }
            } catch (error) {
                window.notyf.error(error.message || 'An unexpected error occurred while saving map settings.');
                console.error('Map settings save error:', error);
            } finally {
                els.mapSettingsForm.querySelector('button[type="submit"]').disabled = false;
                els.mapSettingsForm.querySelector('button[type="submit"]').innerHTML = 'Save Changes';
                els.mapBgUploadLoader.classList.add('hidden');
            }
        });

        els.resetMapBgBtn.addEventListener('click', async () => {
            if (!confirm('Are you sure you want to reset map background to default?')) return;
            try {
                await api.post('update_map', {
                    id: state.currentMapId,
                    updates: {
                        background_color: null,
                        background_image_url: null
                    }
                });
                window.notyf.success('Map background reset to default.');
                closeModal('mapSettingsModal');
                mapManager.switchMap(state.currentMapId); // Reload map
            } catch (error) {
                window.notyf.error('Failed to reset map background.');
                console.error('Reset map background error:', error);
            }
        });

        els.cancelMapSettingsBtn.addEventListener('click', () => {
            closeModal('mapSettingsModal');
            mapManager.switchMap(state.currentMapId); // Revert any temporary preview changes
        });
    }

    const uploadMapBackground = async (mapId, file) => {
        const formData = new FormData();
        formData.append('map_id', mapId);
        formData.append('backgroundFile', file);

        try {
            const response = await fetch(`${MapApp.config.API_URL}?action=upload_map_background`, {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('Map background upload API error:', error);
            return { success: false, error: 'Network error during upload.' };
        }
    };

    // Event Listeners Setup
    if (IS_ADMIN) {
        // Rename Map
        els.renameMapBtn.addEventListener('click', async () => {
            if (!state.currentMapId) {
                window.notyf.error('Please select a map to rename.');
                return;
            }
            const currentMap = state.maps.find(m => m.id == state.currentMapId);
            const newName = prompt(`Rename map "${currentMap.name}":`, currentMap.name);
            if (newName && newName.trim() !== currentMap.name) {
                try {
                    const result = await api.post('update_map', { id: state.currentMapId, updates: { name: newName.trim() } });
                    if (result.success) {
                        window.notyf.success(`Map renamed to "${newName.trim()}".`);
                        await mapManager.loadMaps(); // Reload maps to update selector
                        els.mapSelector.value = state.currentMapId; // Keep current map selected
                        els.currentMapName.textContent = newName.trim(); // Update current map name display
                    } else {
                        window.notyf.error(result.error || 'Failed to rename map.');
                    }
                } catch (error) {
                    console.error('Error renaming map:', error);
                    window.notyf.error('An unexpected error occurred while renaming the map.');
                }
            } else if (newName === null) {
                window.notyf.info('Map rename cancelled.');
            }
        });

        // Delete Map
        els.deleteMapBtn.addEventListener('click', async () => {
            if (!state.currentMapId) {
                window.notyf.error('Please select a map to delete.');
                return;
            }
            const currentMap = state.maps.find(m => m.id == state.currentMapId);
            if (confirm(`Are you sure you want to delete the map "${currentMap.name}"? This action cannot be undone and will delete all devices and connections on this map.`)) {
                try {
                    const result = await api.post('delete_map', { id: state.currentMapId });
                    if (result.success) {
                        window.notyf.success(`Map "${currentMap.name}" deleted.`);
                        const newFirstMapId = await mapManager.loadMaps(); // Reload maps and get new first map
                        await mapManager.switchMap(newFirstMapId); // Switch to new first map or show no maps
                    } else {
                        window.notyf.error(result.error || 'Failed to delete map.');
                    }
                } catch (error) {
                    console.error('Error deleting map:', error);
                    window.notyf.error('An unexpected error occurred while deleting the map.');
                }
            }
        });

        // Scan Network Button
        els.scanNetworkBtn.addEventListener('click', () => {
            if (!state.currentMapId) {
                window.notyf.error('Please select a map first to scan the network.');
                return;
            }
            openModal('scanModal');
            els.scanResults.innerHTML = ''; // Clear previous results
            els.scanInitialMessage.classList.add('hidden');
            els.scanLoader.classList.add('hidden');
        });

        els.closeScanModal.addEventListener('click', () => closeModal('scanModal'));

        els.scanForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const subnet = els.subnetInput.value.trim();
            if (!subnet) {
                window.notyf.error('Please enter a subnet to scan.');
                return;
            }

            els.startScanBtn.disabled = true;
            els.startScanBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Scanning...';
            els.scanInitialMessage.classList.add('hidden');
            els.scanResults.innerHTML = '';
            els.scanLoader.classList.remove('hidden');

            try {
                const result = await api.post('scan_network', { subnet });
                if (result.devices && result.devices.length > 0) {
                    els.scanResults.innerHTML = result.devices.map(device => `
                        <div class="flex items-center justify-between p-3 border-b border-slate-700 last:border-b-0 hover:bg-slate-700/50">
                            <div>
                                <div class="font-medium text-white">${device.hostname || 'Unknown Host'}</div>
                                <div class="text-sm text-slate-400 font-mono">${device.ip}</div>
                            </div>
                            <button class="place-scanned-device-btn px-3 py-1 bg-cyan-600 text-white rounded-lg hover:bg-cyan-700" 
                                data-ip="${device.ip}" data-hostname="${device.hostname || 'Discovered Device'}">
                                Place on Map
                            </button>
                        </div>
                    `).join('');
                    window.notyf.success(`Found ${result.devices.length} devices.`);
                } else {
                    els.scanResults.innerHTML = '<p class="text-slate-500 text-center py-4">No devices found on the specified subnet.</p>';
                    window.notyf.info('No devices found.');
                }
            } catch (error) {
                console.error('Network scan failed:', error);
                els.scanResults.innerHTML = `<p class="text-red-400 text-center py-4">Scan failed: ${error.message || 'An unexpected error occurred.'}</p>`;
                window.notyf.error('Network scan failed.');
            } finally {
                els.scanLoader.classList.add('hidden');
                els.startScanBtn.disabled = false;
                els.startScanBtn.innerHTML = '<i class="fas fa-search mr-2"></i>Start Scan';
            }
        });

        // Event listener for placing scanned devices
        els.scanResults.addEventListener('click', async (e) => {
            const button = e.target.closest('.place-scanned-device-btn');
            if (!button) return;

            const ip = button.dataset.ip;
            const name = button.dataset.hostname;
            const defaultX = Math.floor(Math.random() * 500) - 250; // Random position around center
            const defaultY = Math.floor(Math.random() * 300) - 150;

            button.disabled = true;
            button.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Placing...';

            try {
                const newDevice = {
                    name: name,
                    ip: ip,
                    type: 'server', // Default type for scanned devices
                    map_id: state.currentMapId,
                    x: defaultX,
                    y: defaultY,
                    status: 'unknown',
                    icon_size: 50,
                    name_text_size: 14,
                    show_live_ping: false
                };
                const result = await api.post('create_device', newDevice);
                if (result.success && result.device.id) { // Check for success and device ID
                    window.notyf.success(`Device '${name}' (${ip}) placed on map.`);
                    mapManager.switchMap(state.currentMapId); // Refresh map
                    button.closest('div').remove(); // Remove from scan results list
                } else {
                    throw new Error(result.error || 'Failed to create device on map.');
                }
            } catch (error) {
                window.notyf.error(`Failed to place device '${name}': ${error.message}`);
                console.error('Error placing scanned device:', error);
                button.disabled = false;
                button.innerHTML = 'Place on Map';
            }
        });


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

        // Removed els.addDeviceBtn.addEventListener as it now links to createdevice.php

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
                const unmappedDevices = await api.get('get_unmapped_devices');
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

        // Device Form Submission (for editing existing devices only)
        els.deviceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(els.deviceForm);
            const data = Object.fromEntries(formData.entries());
            data.show_live_ping = document.getElementById('showLivePing').checked;
            const id = data.id;
            delete data.id; // Remove ID from data for updates, it's in the URL param

            // Convert empty strings to null for optional numeric fields
            const numericFields = ['ping_interval', 'icon_size', 'name_text_size', 'warning_latency_threshold', 'warning_packetloss_threshold', 'critical_latency_threshold', 'critical_packetloss_threshold'];
            for (const key in data) {
                if (numericFields.includes(key) && data[key] === '') {
                    data[key] = null;
                } else if (key === 'ip' && data[key] === '') {
                    data[key] = null;
                } else if (key === 'check_port' && data[key] === '') {
                    data[key] = null;
                } else if (key === 'icon_url' && data[key] === '') {
                    data[key] = null;
                } else if (key === 'map_id' && data[key] === '') {
                    data[key] = null;
                }
            }

            els.saveBtn.disabled = true;
            els.saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';

            try {
                await api.post('update_device', { id, updates: data });
                window.notyf.success('Device updated.');
                
                closeModal('deviceModal');
                mapManager.switchMap(state.currentMapId); // Refresh map to show changes
            } catch (error) {
                window.notyf.error('Failed to save device.');
                console.error(error);
            } finally {
                els.saveBtn.disabled = false;
                els.saveBtn.innerHTML = 'Save';
            }
        });

        els.cancelBtn.addEventListener('click', () => closeModal('deviceModal'));

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

    // Export/Import Buttons
    if (IS_ADMIN) {
        els.exportBtn.addEventListener('click', mapManager.exportMap);
        els.importBtn.addEventListener('click', () => els.importFile.click());
        els.importFile.addEventListener('change', mapManager.importMapFromFile);
    }

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