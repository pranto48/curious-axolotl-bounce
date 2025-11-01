window.MapApp = window.MapApp || {};

MapApp.network = {
    initializeMap: () => {
        const container = document.getElementById('network-map');
        const contextMenu = document.getElementById('context-menu');
        MapApp.ui.populateLegend();
        const data = { nodes: MapApp.state.nodes, edges: MapApp.state.edges };
        
        const IS_ADMIN = window.isAdmin; // Get admin status from global variable

        const options = { 
            physics: false, 
            interaction: { hover: true, dragNodes: IS_ADMIN }, // Only allow dragNodes for admin
            edges: { smooth: true, width: 2, font: { color: '#ffffff', size: 12, align: 'top', strokeWidth: 0 } }, 
            manipulation: { 
                enabled: IS_ADMIN, // Only enable manipulation buttons for admin
                addEdge: async (edgeData, callback) => { 
                    const newEdge = await MapApp.api.post('create_edge', { source_id: edgeData.from, target_id: edgeData.to, map_id: MapApp.state.currentMapId, connection_type: 'cat5' }); 
                    edgeData.id = newEdge.id; edgeData.label = 'cat5'; callback(edgeData); 
                    window.notyf.success('Connection added.');
                }
            } 
        };
        MapApp.state.network = new vis.Network(container, data, options);
        
        // Event Handlers
        MapApp.state.network.on("dragEnd", async (params) => { 
            if (IS_ADMIN && params.nodes.length > 0) { // Only save position if admin
                const nodeId = params.nodes[0]; 
                const position = MapApp.state.network.getPositions([nodeId])[nodeId]; 
                await MapApp.api.post('update_device', { id: nodeId, updates: { x: position.x, y: position.y } }); 
            } else if (!IS_ADMIN && params.nodes.length > 0) {
                window.notyf.error('Read-only mode: Cannot move devices.');
                // Revert node position if not admin
                const node = MapApp.state.nodes.get(params.nodes[0]);
                if (node && node.deviceData) {
                    MapApp.state.network.moveNode(node.id, node.deviceData.x, node.deviceData.y);
                }
            }
        });
        MapApp.state.network.on("doubleClick", (params) => { 
            if (params.nodes.length > 0) {
                if (IS_ADMIN) {
                    MapApp.ui.openDeviceModal(params.nodes[0]); 
                } else {
                    window.notyf.info('Read-only mode: Only administrators can edit device details.');
                }
            }
        });

        const closeContextMenu = () => { contextMenu.style.display = 'none'; };
        MapApp.state.network.on("oncontext", (params) => {
            params.event.preventDefault();
            const nodeId = MapApp.state.network.getNodeAt(params.pointer.DOM);
            const edgeId = MapApp.state.network.getEdgeAt(params.pointer.DOM);

            if (nodeId) {
                const node = MapApp.state.nodes.get(nodeId);
                let contextMenuItems = '';
                if (IS_ADMIN) {
                    contextMenuItems += `
                        <div class="context-menu-item" data-action="edit" data-id="${nodeId}"><i class="fas fa-edit fa-fw mr-2"></i>Edit</div>
                        <div class="context-menu-item" data-action="copy" data-id="${nodeId}"><i class="fas fa-copy fa-fw mr-2"></i>Copy</div>
                        ${node.deviceData.ip ? `<div class="context-menu-item" data-action="ping" data-id="${nodeId}"><i class="fas fa-sync fa-fw mr-2"></i>Check Status</div>` : ''}
                        <div class="context-menu-item" data-action="delete" data-id="${nodeId}" style="color: #ef4444;"><i class="fas fa-trash-alt fa-fw mr-2"></i>Delete</div>
                    `;
                } else {
                    contextMenuItems += `<div class="context-menu-item" data-action="read-only-info" style="color: #f59e0b;"><i class="fas fa-info-circle fa-fw mr-2"></i>Read-Only Mode</div>`;
                }
                
                contextMenu.innerHTML = contextMenuItems;
                contextMenu.style.left = `${params.pointer.DOM.x}px`;
                contextMenu.style.top = `${params.pointer.DOM.y}px`;
                contextMenu.style.display = 'block';
                document.addEventListener('click', closeContextMenu, { once: true });
            } else if (edgeId) {
                let contextMenuItems = '';
                if (IS_ADMIN) {
                    contextMenuItems += `
                        <div class="context-menu-item" data-action="edit-edge" data-id="${edgeId}"><i class="fas fa-edit fa-fw mr-2"></i>Edit Connection</div>
                        <div class="context-menu-item" data-action="delete-edge" data-id="${edgeId}" style="color: #ef4444;"><i class="fas fa-trash-alt fa-fw mr-2"></i>Delete Connection</div>
                    `;
                } else {
                    contextMenuItems += `<div class="context-menu-item" data-action="read-only-info" style="color: #f59e0b;"><i class="fas fa-info-circle fa-fw mr-2"></i>Read-Only Mode</div>`;
                }
                contextMenu.innerHTML = contextMenuItems;
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

                if (!IS_ADMIN && action !== 'read-only-info' && action !== 'ping') { // Allow ping for non-admins if it's a read-only check
                    window.notyf.error('Read-only mode: Only administrators can modify the map.');
                    return;
                }

                if (action === 'edit') {
                    MapApp.ui.openDeviceModal(id);
                } else if (action === 'ping') {
                    const icon = document.createElement('i');
                    icon.className = 'fas fa-spinner fa-spin';
                    target.prepend(icon);
                    MapApp.deviceManager.pingSingleDevice(id).finally(() => icon.remove());
                } else if (action === 'copy') {
                    await MapApp.mapManager.copyDevice(id);
                } else if (action === 'delete') {
                    if (confirm('Are you sure you want to delete this device?')) {
                        await MapApp.api.post('delete_device', { id });
                        window.notyf.success('Device deleted.');
                        MapApp.state.nodes.remove(id);
                    }
                } else if (action === 'edit-edge') {
                    MapApp.ui.openEdgeModal(id);
                } else if (action === 'delete-edge') {
                    if (confirm('Are you sure you want to delete this connection?')) {
                        const result = await MapApp.api.post('delete_edge', { id });
                        if (result.success) {
                            window.notyf.success('Connection deleted.');
                            MapApp.state.edges.remove(id);
                        } else {
                            window.notyf.error('Failed to delete connection.');
                        }
                    }
                } else if (action === 'read-only-info') {
                    window.notyf.error('Read-only mode: Only administrators can modify the map.');
                }
            }
        });
    }
};