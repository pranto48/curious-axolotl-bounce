function initMapManager() {
    const API_URL = 'api.php';
    const mapsTableBody = document.getElementById('mapsTableBody');
    const mapsLoader = document.getElementById('mapsLoader');
    const createMapForm = document.getElementById('createMapForm');

    // Edit Map Modal elements
    const editMapModal = document.getElementById('editMapModal');
    const editMapForm = document.getElementById('editMapForm');
    const editMapId = document.getElementById('edit_map_id');
    const editMapName = document.getElementById('edit_map_name');
    const editMapType = document.getElementById('edit_map_type');
    const editMapBgColor = document.getElementById('edit_map_bg_color');
    const editMapBgColorHex = document.getElementById('edit_map_bg_color_hex');
    const editMapBgImageUrl = document.getElementById('edit_map_bg_image_url');
    const editMapBgUpload = document.getElementById('edit_map_bg_upload');
    const editMapBgUploadLoader = document.getElementById('edit_map_bg_upload_loader');
    const editMapBgPreviewWrapper = document.getElementById('edit_map_bg_preview_wrapper');
    const editMapBgPreview = document.getElementById('edit_map_bg_preview');
    const resetMapBgBtnModal = document.getElementById('resetMapBgBtnModal');
    const mapPermissionsListModal = document.getElementById('mapPermissionsListModal');
    const cancelEditMapBtn = document.getElementById('cancelEditMapBtn');
    const saveEditMapBtn = document.getElementById('saveEditMapBtn');

    const api = {
        get: (action, params = {}) => fetch(`${API_URL}?action=${action}&${new URLSearchParams(params)}`).then(res => res.json()),
        post: (action, body) => fetch(`${API_URL}?action=${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }).then(res => res.json())
    };

    const renderMapRow = (map) => {
        const lastModified = map.lastModified ? new Date(map.lastModified).toLocaleString() : 'Never';
        return `
            <tr class="border-b border-slate-700">
                <td class="px-6 py-4 whitespace-nowrap text-white">${map.name}</td>
                <td class="px-6 py-4 whitespace-nowrap text-slate-400 capitalize">${map.type}</td>
                <td class="px-6 py-4 whitespace-nowrap text-slate-400">${map.deviceCount}</td>
                <td class="px-6 py-4 whitespace-nowrap text-slate-400">${lastModified}</td>
                <td class="px-6 py-4 whitespace-nowrap">
                    <a href="map.php?map_id=${map.id}" class="text-blue-400 hover:text-blue-300 mr-3" title="View Map"><i class="fas fa-eye mr-2"></i>View</a>
                    <button class="edit-map-btn text-yellow-400 hover:text-yellow-300 mr-3" data-id="${map.id}" data-name="${map.name}" data-type="${map.type}" data-bg-color="${map.background_color || ''}" data-bg-image="${map.background_image_url || ''}"><i class="fas fa-edit mr-2"></i>Edit</button>
                    <button class="delete-map-btn text-red-500 hover:text-red-400" data-id="${map.id}" data-name="${map.name}"><i class="fas fa-trash mr-2"></i>Delete</button>
                </td>
            </tr>
        `;
    };

    const loadMaps = async () => {
        mapsLoader.classList.remove('hidden');
        mapsTableBody.innerHTML = '';
        try {
            const maps = await api.get('get_maps');
            if (maps.length > 0) {
                mapsTableBody.innerHTML = maps.map(renderMapRow).join('');
            } else {
                mapsTableBody.innerHTML = '<tr><td colspan="5" class="text-center py-4 text-slate-500">No maps found. Create one to get started.</td></tr>';
            }
        } catch (error) {
            console.error('Failed to load maps:', error);
            window.notyf.error('Failed to load maps.');
        } finally {
            mapsLoader.classList.add('hidden');
        }
    };

    const loadMapPermissions = async (mapId) => {
        mapPermissionsListModal.innerHTML = '<div class="text-center py-4"><div class="loader mx-auto w-4 h-4"></div><span class="ml-2 text-sm text-slate-400">Loading users...</span></div>';
        try {
            const { all_users, map_user_ids } = await api.get('get_all_users_with_map_permissions', { map_id: mapId });
            
            if (all_users.length === 0) {
                mapPermissionsListModal.innerHTML = '<p class="text-sm text-slate-500">No users found to assign permissions.</p>';
                return;
            }

            mapPermissionsListModal.innerHTML = all_users.map(user => {
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
            window.notyf.error('Failed to load user map permissions. Check console for details.');
            mapPermissionsListModal.innerHTML = '<p class="text-sm text-red-400">Failed to load user permissions. Check console for details.</p>';
        }
    };

    createMapForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = e.target.name.value;
        const type = e.target.type.value;
        if (!name) return;

        const button = createMapForm.querySelector('button[type="submit"]');
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating...';

        try {
            const result = await api.post('create_map', { name, type });
            if (result.success) {
                window.notyf.success('Map created successfully.');
                createMapForm.reset();
                await loadMaps();
            } else {
                window.notyf.error(`Error: ${result.error}`);
            }
        } catch (error) {
            window.notyf.error('An unexpected error occurred.');
            console.error(error);
        } finally {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-plus mr-2"></i>Create Map';
        }
    });

    mapsTableBody.addEventListener('click', async (e) => {
        const deleteButton = e.target.closest('.delete-map-btn');
        const editButton = e.target.closest('.edit-map-btn');

        if (deleteButton) {
            const { id, name } = deleteButton.dataset;
            if (confirm(`Are you sure you want to delete map "${name}"? This will also delete all devices and connections on this map.`)) {
                const result = await api.post('delete_map', { id });
                if (result.success) {
                    window.notyf.success(`Map "${name}" deleted.`);
                    await loadMaps();
                } else {
                    window.notyf.error(`Error: ${result.error}`);
                }
            }
        } else if (editButton) {
            const { id, name, type, bgColor, bgImage } = editButton.dataset;
            editMapId.value = id;
            editMapName.value = name;
            editMapType.value = type;
            editMapBgColor.value = bgColor || '#1e293b';
            editMapBgColorHex.value = bgColor || '#1e293b';
            editMapBgImageUrl.value = bgImage || '';
            editMapBgUpload.value = ''; // Clear file input
            editMapBgUploadLoader.classList.add('hidden');

            if (bgImage) {
                editMapBgPreview.src = bgImage;
                editMapBgPreviewWrapper.classList.remove('hidden');
            } else {
                editMapBgPreviewWrapper.classList.add('hidden');
            }
            
            await loadMapPermissions(id);
            openModal('editMapModal');
        }
    });

    // Sync color picker and hex input
    editMapBgColor.addEventListener('input', (e) => {
        editMapBgColorHex.value = e.target.value;
    });
    editMapBgColorHex.addEventListener('input', (e) => {
        editMapBgColor.value = e.target.value;
    });

    // Preview uploaded image (not actually uploading yet)
    editMapBgUpload.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                editMapBgImageUrl.value = event.target.result; // Temporarily set for preview
                editMapBgPreview.src = event.target.result;
                editMapBgPreviewWrapper.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        } else {
            editMapBgPreviewWrapper.classList.add('hidden');
        }
    });

    const uploadMapBackground = async (mapId, file) => {
        editMapBgUploadLoader.classList.remove('hidden');
        const formData = new FormData();
        formData.append('map_id', mapId);
        formData.append('backgroundFile', file);

        try {
            const response = await fetch(`${API_URL}?action=upload_map_background`, {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (result.success) {
                window.notyf.success('Background image uploaded successfully.');
                editMapBgImageUrl.value = result.url; // Update URL field with new URL
                editMapBgPreview.src = result.url;
                return { success: true, url: result.url };
            } else {
                window.notyf.error(`Error uploading background image: ${result.error}`);
                return { success: false, error: result.error };
            }
        } catch (error) {
            window.notyf.error('An unexpected error occurred during background image upload.');
            console.error('Background image upload error:', error);
            return { success: false, error: error.message };
        } finally {
            editMapBgUploadLoader.classList.add('hidden');
        }
    };

    editMapForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        saveEditMapBtn.disabled = true;
        saveEditMapBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';

        const mapId = editMapId.value;
        const name = editMapName.value;
        const type = editMapType.value;
        const backgroundColor = editMapBgColorHex.value;
        let backgroundImageURL = editMapBgImageUrl.value;

        const selectedUserIds = Array.from(mapPermissionsListModal.querySelectorAll('input[type="checkbox"]:checked'))
                                    .map(checkbox => checkbox.value);
        
        try {
            // Handle background image upload if a new file was selected
            if (editMapBgUpload.files.length > 0) {
                const uploadResult = await uploadMapBackground(mapId, editMapBgUpload.files[0]);
                if (uploadResult.success) {
                    backgroundImageURL = uploadResult.url;
                } else {
                    throw new Error(uploadResult.error || 'Failed to upload background image.');
                }
            }

            // Update map details
            const mapUpdateResult = await api.post('update_map', { 
                id: mapId, 
                updates: { 
                    name, 
                    type, 
                    background_color: backgroundColor, 
                    background_image_url: backgroundImageURL 
                } 
            });
            if (!mapUpdateResult.success) {
                throw new Error(mapUpdateResult.error || 'Failed to update map details.');
            }

            // Update map permissions
            const mapPermissionsUpdateResult = await api.post('update_map_user_permissions', { map_id: mapId, user_ids: selectedUserIds });
            if (!mapPermissionsUpdateResult.success) {
                throw new Error(mapPermissionsUpdateResult.error || 'Failed to update map permissions.');
            }

            window.notyf.success('Map updated successfully.');
            closeModal('editMapModal');
            await loadMaps(); // Reload map list to reflect changes
        } catch (error) {
            window.notyf.error(`Error: ${error.message}`);
            console.error(error);
        } finally {
            saveEditMapBtn.disabled = false;
            saveEditMapBtn.innerHTML = 'Save Changes';
        }
    });

    resetMapBgBtnModal.addEventListener('click', async () => {
        if (!confirm('Are you sure you want to reset map background to default?')) return;
        const mapId = editMapId.value;
        try {
            await api.post('update_map', {
                id: mapId,
                updates: {
                    background_color: null,
                    background_image_url: null
                }
            });
            window.notyf.success('Map background reset to default.');
            editMapBgColor.value = '#1e293b';
            editMapBgColorHex.value = '#1e293b';
            editMapBgImageUrl.value = '';
            editMapBgPreviewWrapper.classList.add('hidden');
            editMapBgUpload.value = '';
        } catch (error) {
            window.notyf.error('Failed to reset map background.');
            console.error('Reset map background error:', error);
        }
    });

    cancelEditMapBtn.addEventListener('click', () => closeModal('editMapModal'));

    loadMaps();
}