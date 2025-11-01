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
        // Update openDeviceModal to only handle editing
        MapApp.ui.openDeviceModal = (deviceId) => {
            els.deviceForm.reset();
            document.getElementById('deviceId').value = '';
            const previewWrapper = document.getElementById('icon_preview_wrapper');
            previewWrapper.classList.add('hidden');

            if (deviceId) {
                const node = MapApp.state.nodes.get(deviceId);
                document.getElementById('modalTitle').textContent = 'Edit Item';
                document.getElementById('deviceId').value = node.id;
                document.getElementById('deviceName').value = node.deviceData.name;
                document.getElementById('deviceIp').value = node.deviceData.ip;
                document.getElementById('checkPort').value = node.deviceData.check_port;
                document.getElementById('deviceType').value = node.deviceData.type;
                document.getElementById('icon_url').value = node.deviceData.icon_url || '';
                if (node.deviceData.icon_url) {
                    document.getElementById('icon_preview').src = node.deviceData.icon_url;
                    previewWrapper.classList.remove('hidden');
                }
                document.getElementById('pingInterval').value = node.deviceData.ping_interval;
                document.getElementById('iconSize').value = node.deviceData.icon_size;
                document.getElementById('nameTextSize').value = node.deviceData.name_text_size;
                document.getElementById('warning_latency_threshold').value = node.deviceData.warning_latency_threshold;
                document.getElementById('warning_packetloss_threshold').value = node.deviceData.warning_packetloss_threshold;
                document.getElementById('critical_latency_threshold').value = node.deviceData.critical_latency_threshold;
                document.getElementById('critical_packetloss_threshold').value = node.deviceData.critical_packetloss_threshold;
                document.getElementById('showLivePing').checked = node.deviceData.show_live_ping;
            } else {
                // This branch should ideally not be hit anymore for new device creation
                document.getElementById('modalTitle').textContent = 'Error: No device to edit';
                window.notyf.error('Attempted to open edit modal without a device. This should not happen.');
                return;
            }
            MapApp.ui.toggleDeviceModalFields(document.getElementById('deviceType').value);
            MapApp.ui.els.deviceModal.classList.remove('hidden');
        };

        els.deviceForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const formData = new FormData(els.deviceForm);
            const data = Object.fromEntries(formData.entries());
            const id = data.id;
            delete data.id;
            data.show_live_ping = document.getElementById('showLivePing').checked;

            try {
                if (id) {
                    const updatedDevice = await api.post('update_device', { id, updates: data });
                    const existingNode = state.nodes.get(id);
                    if (existingNode) {
                        let label = updatedDevice.name;
                        if (updatedDevice.show_live_ping && updatedDevice.status === 'online' && updatedDevice.last_avg_time !== null) {
                            label += `\n${updatedDevice.last_avg_time}ms | TTL:${updatedDevice.last_ttl || 'N/A'}`;
                        }

                        const nodeUpdate = {
                            id: updatedDevice.id,
                            label: label,
                            title: MapApp.utils.buildNodeTitle(updatedDevice),
                            deviceData: updatedDevice,
                            font: { ...existingNode.font, size: parseInt(updatedDevice.name_text_size) || 14 },
                        };

                        if (updatedDevice.icon_url) {
                            Object.assign(nodeUpdate, {
                                shape: 'image',
                                image: updatedDevice.icon_url,
                                size: (parseInt(updatedDevice.icon_size) || 50) / 2,
                                color: { border: MapApp.config.statusColorMap[updatedDevice.status] || MapApp.config.statusColorMap.unknown, background: 'transparent' },
                                borderWidth: 3
                            });
                            delete nodeUpdate.icon;
                        } else if (updatedDevice.type === 'box') {
                            Object.assign(nodeUpdate, { shape: 'box' });
                        } else {
                            Object.assign(nodeUpdate, {
                                shape: 'icon',
                                image: null,
                                icon: {
                                    ...(existingNode.icon || {}),
                                    face: "'Font Awesome 6 Free'", weight: "900",
                                    code: MapApp.config.iconMap[updatedDevice.type] || MapApp.config.iconMap.other,
                                    size: parseInt(updatedDevice.icon_size) || 50,
                                    color: MapApp.config.statusColorMap[updatedDevice.status] || MapApp.config.statusColorMap.unknown
                                }
                            });
                        }
                        
                        state.nodes.update(nodeUpdate);

                        if (existingNode.deviceData.ping_interval !== updatedDevice.ping_interval) {
                            if (state.pingIntervals[id]) {
                                clearInterval(state.pingIntervals[id]);
                                delete state.pingIntervals[id];
                            }
                            if (updatedDevice.ping_interval > 0 && updatedDevice.ip) {
                                state.pingIntervals[id] = setInterval(() => deviceManager.pingSingleDevice(id), updatedDevice.ping_interval * 1000);
                            }
                        }
                    }
                    window.notyf.success('Item updated.');
                } else {
                    // This block is now effectively unreachable for new device creation
                    window.notyf.error('Error: Attempted to create device from edit modal. This should not happen.');
                    return;
                }
                closeModal('deviceModal');
            } catch (error) {
                console.error("Failed to save device:", error);
                window.notyf.error(error.message || "An error occurred while saving.");
            }
        });

        document.getElementById('icon_upload').addEventListener('change', async (e) => {
            const file = e.target.files[0];
            const deviceId = document.getElementById('deviceId').value;
            if (!file) return;
            if (!deviceId) {
                window.notyf.error('Please save the item before uploading an icon.');
                e.target.value = '';
                return;
            }
        
            const loader = document.getElementById('icon_upload_loader');
            loader.classList.remove('hidden');
        
            const formData = new FormData();
            formData.append('id', deviceId);
            formData.append('iconFile', file);
        
            try {
                const res = await fetch(`${MapApp.config.API_URL}?action=upload_device_icon`, {
                    method: 'POST',
                    body: formData
                });
                const result = await res.json();
                if (result.success) {
                    document.getElementById('icon_url').value = result.url;
                    const previewImg = document.getElementById('icon_preview');
                    previewImg.src = result.url;
                    document.getElementById('icon_preview_wrapper').classList.remove('hidden');
                    window.notyf.success('Icon uploaded. Press Save to apply changes.');
                } else {
                    throw new Error(result.error || 'Upload failed');
                }
            } catch (error) {
                console.error('Icon upload failed:', error);
                window.notyf.error(error.message);
            } finally {
                loader.classList.add('hidden');
                e.target.value = '';
            }
        });

        els.edgeForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const id = document.getElementById('edgeId').value;
            const connection_type = document.getElementById('connectionType').value;
            await api.post('update_edge', { id, connection_type });
            closeModal('edgeModal');
            state.edges.update({ id, connection_type, label: connection_type });
            window.notyf.success('Connection updated.');
        });

        els.scanForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const subnet = document.getElementById('subnetInput').value;
            if (!subnet) return;
            els.scanInitialMessage.classList.add('hidden');
            els.scanResults.innerHTML = '';
            els.scanLoader.classList.remove('hidden');
            try {
                const result = await api.post('scan_network', { subnet });
                els.scanResults.innerHTML = result.devices.map(device => `<div class="flex items-center justify-between p-2 border-b border-slate-700"><div><div class="font-mono text-white">${device.ip}</div><div class="text-sm text-slate-400">${device.hostname || 'N/A'}</div></div><button class="add-scanned-device-btn px-3 py-1 bg-cyan-600/50 text-cyan-300 rounded-lg hover:bg-cyan-600/80 text-sm" data-ip="${device.ip}" data-name="${device.hostname || device.ip}">Add</button></div>`).join('') || '<p class="text-center text-slate-500 py-4">No devices found.</p>';
            } catch (error) {
                els.scanResults.innerHTML = '<p class="text-center text-red-400 py-4">Scan failed. Ensure nmap is installed.</p>';
            } finally {
                els.scanLoader.classList.add('hidden');
            }
        });

        els.scanResults.addEventListener('click', (e) => {
            if (e.target.classList.contains('add-scanned-device-btn')) {
                const { ip, name } = e.target.dataset;
                closeModal('scanModal');
                // Redirect to createdevice.php with prefill data
                const params = new URLSearchParams();
                if (ip) params.append('ip', ip);
                if (name) params.append('name', name);
                window.location.href = `createdevice.php?${params.toString()}`;
            }
        });

        els.exportBtn.addEventListener('click', () => {
            if (!state.currentMapId) {
                window.notyf.error('No map selected to export.');
                return;
            }
            const mapName = els.mapSelector.options[els.mapSelector.selectedIndex].text;
            const devices = state.nodes.get({ fields: ['id', 'deviceData'] }).map(node => ({
                id: node.id,
                ...node.deviceData
            }));
            const edges = state.edges.get({ fields: ['from', 'to', 'connection_type'] });
            const exportData = { devices, edges };
            const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
            const downloadAnchorNode = document.createElement('a');
            const date = new Date().toISOString().slice(0, 10);
            downloadAnchorNode.setAttribute("href", dataStr);
            downloadAnchorNode.setAttribute("download", `${mapName.replace(/\s+/g, '_')}_export.json`);
            document.body.appendChild(downloadAnchorNode);
            downloadAnchorNode.click();
            downloadAnchorNode.remove();
            window.notyf.success('Map exported successfully.');
        });

        els.importBtn.addEventListener('click', () => els.importFile.click());
        els.importFile.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            if (confirm('This will overwrite the current map. Are you sure?')) {
                const reader = new FileReader();
                reader.onload = async (event) => {
                    try {
                        const data = JSON.parse(event.target.result);
                        await api.post('import_map', { map_id: state.currentMapId, ...data });
                        await mapManager.switchMap(state.currentMapId);
                        window.notyf.success('Map imported successfully.');
                    } catch (err) {
                        window.notyf.error('Failed to import map: ' + err.message);
                    }
                };
                reader.readText(file);
            }
            els.importFile.value = '';
        });

        els.newMapBtn.addEventListener('click', mapManager.createMap);
        els.createFirstMapBtn.addEventListener('click', mapManager.createMap);
        els.renameMapBtn.addEventListener('click', async () => {
            if (!state.currentMapId) {
                window.notyf.error('No map selected to rename.');
                return;
            }
            const selectedOption = els.mapSelector.options[els.mapSelector.selectedIndex];
            const currentName = selectedOption.text;
            const newName = prompt('Enter a new name for the map:', currentName);
        
            if (newName && newName.trim() !== '' && newName !== currentName) {
                try {
                    await api.post('update_map', { id: state.currentMapId, updates: { name: newName } });
                    selectedOption.text = newName;
                    els.currentMapName.textContent = newName;
                    window.notyf.success('Map renamed successfully.');
                } catch (error) {
                    console.error("Failed to rename map:", error);
                    window.notyf.error(error.message || "Could not rename map.");
                }
            }
        });
        els.deleteMapBtn.addEventListener('click', async () => {
            if (confirm(`Delete map "${els.mapSelector.options[els.mapSelector.selectedIndex].text}"?`)) {
                await api.post('delete_map', { id: state.currentMapId });
                const firstMapId = await mapManager.loadMaps();
                await mapManager.switchMap(firstMapId);
                window.notyf.success('Map deleted.');
            }
        });
        // els.addDeviceBtn.addEventListener('click', () => MapApp.ui.openDeviceModal()); // Removed, now handled by <a> tag
        els.cancelBtn.addEventListener('click', () => closeModal('deviceModal'));
        els.addEdgeBtn.addEventListener('click', () => {
            state.network.addEdgeMode();
            window.notyf.info('Click on a node to start a connection.');
        });
        els.cancelEdgeBtn.addEventListener('click', () => closeModal('edgeModal'));
        els.scanNetworkBtn.addEventListener('click', () => openModal('scanModal'));
        els.closeScanModal.addEventListener('click', () => closeModal('scanModal'));
        document.getElementById('deviceType').addEventListener('change', (e) => MapApp.ui.toggleDeviceModalFields(e.target.value));

        // Place Device Modal Logic
        els.placeDeviceBtn.addEventListener('click', async () => {
            openModal('placeDeviceModal');
            els.placeDeviceLoader.classList.remove('hidden');
            els.placeDeviceList.innerHTML = '';
            try {
                const unmappedDevices = await api.get('get_devices', { unmapped: true });
                if (unmappedDevices.length > 0) {
                    els.placeDeviceList.innerHTML = unmappedDevices.map(device => `
                        <div class="flex items-center justify-between p-2 border-b border-slate-700 hover:bg-slate-700/50">
                            <div>
                                <div class="font-medium text-white">${device.name}</div>
                                <div class="text-sm text-slate-400 font-mono">${device.ip || 'No IP'}</div>
                            </div>
                            <button class="place-device-item-btn px-3 py-1 bg-cyan-600/50 text-cyan-300 rounded-lg hover:bg-cyan-600/80 text-sm" data-id="${device.id}">
                                Place
                            </button>
                        </div>
                    `).join('');
                } else {
                    els.placeDeviceList.innerHTML = '<p class="text-center text-slate-500 py-4">No unassigned devices found.</p>';
                }
            } catch (error) {
                console.error('Failed to load unmapped devices:', error);
                els.placeDeviceList.innerHTML = '<p class="text-center text-red-400 py-4">Could not load devices.</p>';
            } finally {
                els.placeDeviceLoader.classList.add('hidden');
            }
        });
        els.closePlaceDeviceModal.addEventListener('click', () => closeModal('placeDeviceModal'));
        els.placeDeviceList.addEventListener('click', async (e) => {
            if (e.target.classList.contains('place-device-item-btn')) {
                const deviceId = e.target.dataset.id;
                e.target.disabled = true;
                e.target.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

                const viewPosition = state.network.getViewPosition();
                const canvasPosition = state.network.canvas.DOMtoCanvas(viewPosition);

                const updatedDevice = await api.post('update_device', {
                    id: deviceId,
                    updates: { map_id: state.currentMapId, x: canvasPosition.x, y: canvasPosition.y }
                });

                // Add the device to the map visually
                const baseNode = {
                    id: updatedDevice.id, label: updatedDevice.name, title: MapApp.utils.buildNodeTitle(updatedDevice),
                    x: updatedDevice.x, y: updatedDevice.y,
                    font: { color: 'white', size: parseInt(updatedDevice.name_text_size) || 14, multi: true },
                    deviceData: updatedDevice
                };
                let visNode;
                if (updatedDevice.icon_url) {
                    visNode = { ...baseNode, shape: 'image', image: updatedDevice.icon_url, size: (parseInt(updatedDevice.icon_size) || 50) / 2, color: { border: MapApp.config.statusColorMap[updatedDevice.status] || MapApp.config.statusColorMap.unknown, background: 'transparent' }, borderWidth: 3 };
                } else if (updatedDevice.type === 'box') {
                    visNode = { ...baseNode, shape: 'box', color: { background: 'rgba(49, 65, 85, 0.5)', border: '#475569' }, margin: 20, level: -1 };
                } else {
                    visNode = { ...baseNode, shape: 'icon', icon: { face: "'Font Awesome 6 Free'", weight: "900", code: MapApp.config.iconMap[updatedDevice.type] || MapApp.config.iconMap.other, size: parseInt(updatedDevice.icon_size) || 50, color: MapApp.config.statusColorMap[updatedDevice.status] || MapApp.config.statusColorMap.unknown } };
                }
                state.nodes.add(visNode);
                
                window.notyf.success(`Device "${updatedDevice.name}" placed on map.`);
                e.target.closest('.flex').remove(); // Remove from list
                if (els.placeDeviceList.children.length === 0) {
                    els.placeDeviceList.innerHTML = '<p class="text-center text-slate-500 py-4">No unassigned devices found.</p>';
                }
            }
        });

        // Map Settings Modal Logic
        els.mapSettingsBtn.addEventListener('click', () => {
            const currentMap = state.maps.find(m => m.id == state.currentMapId);
            if (currentMap) {
                document.getElementById('mapBgColor').value = currentMap.background_color || '#1e293b';
                document.getElementById('mapBgColorHex').value = currentMap.background_color || '#1e293b';
                document.getElementById('mapBgImageUrl').value = currentMap.background_image_url || '';
                openModal('mapSettingsModal');
            }
        });
        els.cancelMapSettingsBtn.addEventListener('click', () => closeModal('mapSettingsModal'));
        document.getElementById('mapBgColor').addEventListener('input', (e) => {
            document.getElementById('mapBgColorHex').value = e.target.value;
        });
        document.getElementById('mapBgColorHex').addEventListener('input', (e) => {
            document.getElementById('mapBgColor').value = e.target.value;
        });
        els.mapSettingsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const updates = {
                background_color: document.getElementById('mapBgColorHex').value,
                background_image_url: document.getElementById('mapBgImageUrl').value
            };
            await api.post('update_map', { id: state.currentMapId, updates });
            await mapManager.loadMaps(); // Reload maps to get fresh data
            await mapManager.switchMap(state.currentMapId); // Re-apply settings
            closeModal('mapSettingsModal');
            window.notyf.success('Map settings saved.');
        });
        els.resetMapBgBtn.addEventListener('click', async () => {
            const updates = { background_color: null, background_image_url: null };
            await api.post('update_map', { id: state.currentMapId, updates });
            await mapManager.loadMaps();
            await mapManager.switchMap(state.currentMapId);
            closeModal('mapSettingsModal');
            window.notyf.success('Map background reset to default.');
        });
        els.mapBgUpload.addEventListener('change', async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            const loader = document.getElementById('mapBgUploadLoader');
            loader.classList.remove('hidden');
            const formData = new FormData();
            formData.append('map_id', state.currentMapId);
            formData.append('backgroundFile', file);
            try {
                const res = await fetch(`${MapApp.config.API_URL}?action=upload_map_background`, { method: 'POST', body: formData });
                const result = await res.json();
                if (result.success) {
                    document.getElementById('mapBgImageUrl').value = result.url;
                    window.notyf.success('Image uploaded. Click Save to apply.');
                } else { throw new Error(result.error); }
            } catch (error) {
                window.notyf.error('Upload failed: ' + error.message);
            } finally {
                loader.classList.add('hidden');
                e.target.value = '';
            }
        });

        // Map Permissions Modal Logic (New)
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

        els.cancelMapPermissionsBtn.addEventListener('click', () => closeModal('mapPermissionsModal'));

        els.mapPermissionsForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const mapId = els.permissionsMapId.value;
            const selectedUserIds = Array.from(els.userPermissionsList.querySelectorAll('input[type="checkbox"]:checked'))
                                        .map(checkbox => checkbox.value);
            
            // Ensure admin user always has access, even if their checkbox is disabled/unchecked
            const adminUser = state.users.find(u => u.role === 'admin'); // Assuming state.users is populated elsewhere or fetched here
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