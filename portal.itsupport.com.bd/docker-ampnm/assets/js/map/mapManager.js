window.MapApp = window.MapApp || {};

MapApp.mapManager = {
    createMap: async () => {
        const name = prompt("Enter a name for the new map:");
        console.log("Attempting to create map with name:", name); // Added log
        if (name) { 
            try {
                const response = await MapApp.api.post('create_map', { name }); 
                console.log("Create map API response:", response); // Added log
                if (response.success) {
                    await MapApp.mapManager.loadMaps(); 
                    MapApp.ui.els.mapSelector.value = response.map.id; 
                    await MapApp.mapManager.switchMap(response.map.id); 
                    window.notyf.success(response.message);
                } else {
                    window.notyf.error(response.error || 'Failed to create map.');
                }
            } catch (error) {
                console.error("Error creating map:", error);
                window.notyf.error('An unexpected error occurred while creating the map.');
            }
        } else if (name === null) { // User cancelled the prompt
            window.notyf.info('Map creation cancelled.');
        } else { // User entered an empty name
            window.notyf.error('Map name cannot be empty.');
        }
    },

    loadMaps: async () => {
        const maps = await MapApp.api.get('get_maps');
        MapApp.state.maps = maps;
        MapApp.ui.els.mapSelector.innerHTML = '';
        let defaultMapId = null;

        if (maps.length > 0) {
            maps.forEach(map => { 
                const option = document.createElement('option'); 
                option.value = map.id; 
                option.textContent = map.name; 
                MapApp.ui.els.mapSelector.appendChild(option); 
                if (map.is_default == 1) { // Changed to explicitly check for 1
                    defaultMapId = map.id;
                }
            });
            MapApp.ui.els.mapContainer.classList.remove('hidden'); 
            MapApp.ui.els.noMapsContainer.classList.add('hidden'); 
            return defaultMapId || maps[0].id; // Return default map ID, or first map if no default
        } else { 
            MapApp.ui.els.mapContainer.classList.add('hidden'); 
            MapApp.ui.els.noMapsContainer.classList.remove('hidden'); 
            return null; 
        }
    },

    switchMap: async (mapId) => {
        if (MapApp.state.animationFrameId) { 
            cancelAnimationFrame(MapApp.state.animationFrameId); 
            MapApp.state.animationFrameId = null; 
        }
        if (!mapId) { 
            if (MapApp.state.network) MapApp.state.network.destroy(); 
            MapApp.state.network = null; 
            MapApp.state.nodes.clear(); 
            MapApp.state.edges.clear(); 
            MapApp.ui.els.mapContainer.classList.add('hidden'); 
            MapApp.ui.els.noMapsContainer.classList.remove('hidden'); 
            return; 
        }
        
        MapApp.state.currentMapId = mapId; 
        const currentMap = MapApp.state.maps.find(m => m.id == mapId);
        if (currentMap) {
            MapApp.ui.els.currentMapName.textContent = currentMap.name;
            const mapEl = document.getElementById('network-map');
            mapEl.style.backgroundColor = currentMap.background_color || '';
            mapEl.style.backgroundImage = currentMap.background_image_url ? `url(${currentMap.background_image_url})` : '';
            mapEl.style.backgroundSize = 'cover';
            mapEl.style.backgroundPosition = 'center';
        }
        
        const [deviceData, edgeData] = await Promise.all([
            MapApp.api.get('get_devices', { map_id: mapId }), 
            MapApp.api.get('get_edges', { map_id: mapId })
        ]);
        
        const visNodes = deviceData.map(d => {
            let label = d.name;
            if (d.show_live_ping && d.status === 'online' && d.last_avg_time !== null) {
                label += `\n${d.last_avg_time}ms | TTL:${d.last_ttl || 'N/A'}`;
            }

            const baseNode = {
                id: d.id, label: label, title: MapApp.utils.buildNodeTitle(d),
                x: d.x, y: d.y,
                font: { color: 'white', size: parseInt(d.name_text_size) || 14, multi: true },
                deviceData: d
            };

            if (d.icon_url) {
                return {
                    ...baseNode,
                    shape: 'image',
                    image: d.icon_url,
                    size: (parseInt(d.icon_size) || 50) / 2, // vis.js size is radius
                    color: { border: MapApp.config.statusColorMap[d.status] || MapApp.config.statusColorMap.unknown, background: 'transparent' },
                    borderWidth: 3
                };
            }
            
            if (d.type === 'box') {
                return { ...baseNode, shape: 'box', color: { background: 'rgba(49, 65, 85, 0.5)', border: '#475569' }, margin: 20, level: -1 };
            }

            return { ...baseNode, shape: 'icon', icon: { face: "'Font Awesome 6 Free'", weight: "900", code: MapApp.config.iconMap[d.type] || MapApp.config.iconMap.other, size: parseInt(d.icon_size) || 50, color: MapApp.config.statusColorMap[d.status] || MapApp.config.statusColorMap.unknown } };
        });
        MapApp.state.nodes.clear(); 
        MapApp.state.nodes.add(visNodes);

        const visEdges = edgeData.map(e => ({ id: e.id, from: e.source_id, to: e.target_id, connection_type: e.connection_type, label: e.connection_type }));
        MapApp.state.edges.clear(); 
        MapApp.state.edges.add(visEdges);
        
        MapApp.deviceManager.setupAutoPing(deviceData);
        if (!MapApp.state.network) MapApp.network.initializeMap();
        if (!MapApp.state.animationFrameId) MapApp.ui.updateAndAnimateEdges();
    },

    copyDevice: async (deviceId) => {
        const nodeToCopy = MapApp.state.nodes.get(deviceId);
        if (!nodeToCopy) return;

        const originalDevice = nodeToCopy.deviceData;
        const position = MapApp.state.network.getPositions([deviceId])[deviceId];

        const newDeviceData = {
            ...originalDevice,
            name: `Copy of ${originalDevice.name}`,
            ip: '',
            x: position.x + 50,
            y: position.y + 50,
            map_id: MapApp.state.currentMapId,
            status: 'unknown',
            last_seen: null,
            last_avg_time: null,
            last_ttl: null,
        };
        
        delete newDeviceData.id;
        delete newDeviceData.created_at;
        delete newDeviceData.updated_at;

        try {
            const createdDevice = await MapApp.api.post('create_device', newDeviceData);
            window.notyf.success(`Device "${originalDevice.name}" copied.`);
            
            const visNode = {
                id: createdDevice.id,
                label: createdDevice.name,
                title: MapApp.utils.buildNodeTitle(createdDevice),
                x: createdDevice.x,
                y: createdDevice.y,
                shape: 'icon',
                icon: { face: "'Font Awesome 6 Free'", weight: "900", code: MapApp.config.iconMap[createdDevice.type] || MapApp.config.iconMap.other, size: parseInt(createdDevice.icon_size) || 50, color: MapApp.config.statusColorMap[createdDevice.status] || MapApp.config.statusColorMap.unknown },
                font: { color: 'white', size: parseInt(createdDevice.name_text_size) || 14, multi: true },
                deviceData: createdDevice
            };
            if (createdDevice.type === 'box') {
                Object.assign(visNode, {
                    shape: 'box',
                    color: { background: 'rgba(49, 65, 85, 0.5)', border: '#475569' },
                    margin: 20,
                    level: -1
                });
            }
            MapApp.state.nodes.add(visNode);
        } catch (error) {
            console.error("Failed to copy device:", error);
            window.notyf.error("Could not copy the device.");
        }
    },

    exportMap: () => {
        if (!MapApp.state.currentMapId) {
            window.notyf.error('No map selected to export.');
            return;
        }

        const nodesToExport = MapApp.state.nodes.get().map(node => ({
            // Include all deviceData properties, plus current x, y
            deviceData: node.deviceData,
            x: node.x,
            y: node.y,
            // Also include the vis.js ID for internal mapping during import
            id: node.id 
        }));

        const edgesToExport = MapApp.state.edges.get().map(edge => ({
            from: edge.from,
            to: edge.to,
            connection_type: edge.connection_type || 'cat5'
        }));

        const exportData = {
            map_id: MapApp.state.currentMapId,
            nodes: nodesToExport,
            edges: edgesToExport
        };

        const jsonString = JSON.stringify(exportData, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        const currentMap = MapApp.state.maps.find(m => m.id == MapApp.state.currentMapId);
        const mapName = currentMap ? currentMap.name.replace(/[^a-z0-9]/gi, '_').toLowerCase() : 'network_map';
        a.download = `${mapName}_export_${new Date().toISOString().slice(0, 10)}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        window.notyf.success('Map exported successfully!');
    },

    importMapFromFile: async (event) => {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const rawMapData = JSON.parse(e.target.result);
                if (!rawMapData.nodes || !rawMapData.edges) {
                    throw new Error('Invalid map file format. Expected "nodes" and "edges" arrays.');
                }

                if (confirm('Are you sure you want to import this map? This will overwrite existing devices and connections on the current map.')) {
                    // Extract actual device data from rawMapData.nodes
                    const devicesToImport = rawMapData.nodes.map(node => ({
                        ...node.deviceData, // Copy existing deviceData properties
                        // DO NOT include node.id here, as new IDs will be generated by the backend
                        x: node.x,   // Ensure latest positions are used
                        y: node.y,    // Ensure latest positions are used
                        // Store the old ID for mapping edges later
                        old_id: node.id 
                    }));

                    // Extract relevant edge data, using old_id for mapping
                    const edgesToImport = rawMapData.edges.map(edge => ({
                        from: edge.from, // These are old IDs, will be mapped by backend
                        to: edge.to,     // These are old IDs, will be mapped by backend
                        connection_type: edge.connection_type || 'cat5'
                    }));

                    const result = await MapApp.api.post('import_map', { 
                        map_id: MapApp.state.currentMapId, 
                        devices: devicesToImport,
                        edges: edgesToImport
                    });
                    if (result.success) {
                        window.notyf.success(result.message);
                        MapApp.mapManager.switchMap(MapApp.state.currentMapId); // Reload map
                    } else {
                        throw new Error(result.error);
                    }
                }
            } catch (err) {
                window.notyf.error('Failed to import map: ' + err.message);
                console.error('Import error:', err);
            } finally {
                MapApp.ui.els.importFile.value = ''; // Clear file input
            }
        };
        reader.readAsText(file);
    },
};