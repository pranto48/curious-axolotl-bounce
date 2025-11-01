function initEditDevicePage() {
    const API_URL = 'api.php';
    const editDeviceForm = document.getElementById('editDeviceForm');
    const saveDeviceBtn = document.getElementById('saveDeviceBtn');
    const deviceIdInput = document.getElementById('deviceId');
    const deviceTypeSelect = document.getElementById('deviceType');
    const deviceIpWrapper = document.getElementById('deviceIpWrapper');
    const devicePortWrapper = document.getElementById('devicePortWrapper');
    const pingIntervalWrapper = document.getElementById('pingIntervalWrapper');
    const thresholdsWrapper = document.getElementById('thresholdsWrapper');
    const deviceIpInput = document.getElementById('deviceIp');
    const iconSizeLabel = document.getElementById('iconSizeLabel');
    const nameTextSizeLabel = document.getElementById('nameTextSizeLabel');
    const iconUrlInput = document.getElementById('icon_url');
    const iconUploadInput = document.getElementById('icon_upload');
    const iconUploadLoader = document.getElementById('icon_upload_loader');
    const iconPreviewWrapper = document.getElementById('icon_preview_wrapper');
    const iconPreview = document.getElementById('icon_preview');
    const deviceMapSelect = document.getElementById('deviceMap');

    const api = {
        get: (action, params = {}) => fetch(`${API_URL}?action=${action}&${new URLSearchParams(params)}`).then(res => res.json()),
        post: (action, body) => fetch(`${API_URL}?action=${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }).then(res => res.json())
    };

    const toggleFields = (type) => {
        const isAnnotation = type === 'box';
        const isPingable = !isAnnotation;

        deviceIpWrapper.style.display = isPingable ? 'block' : 'none';
        devicePortWrapper.style.display = isPingable ? 'block' : 'none';
        pingIntervalWrapper.style.display = isPingable ? 'block' : 'none';
        thresholdsWrapper.style.display = isPingable ? 'block' : 'none';
        
        deviceIpInput.required = isPingable;

        iconSizeLabel.textContent = isAnnotation ? 'Width' : 'Icon Size';
        nameTextSizeLabel.textContent = isAnnotation ? 'Height' : 'Name Text Size';
    };

    const populateMapSelector = async (selectedMapId = null) => {
        try {
            const maps = await api.get('get_maps');
            let optionsHtml = '<option value="">-- No Map --</option>';

            if (maps.length > 0) {
                maps.forEach(map => {
                    optionsHtml += `<option value="${map.id}" ${selectedMapId == map.id ? 'selected' : ''}>${map.name}</option>`;
                });
            }
            deviceMapSelect.innerHTML = optionsHtml;
        } catch (error) {
            console.error('Failed to load maps:', error);
            window.notyf.error('Failed to load maps for assignment.');
        }
    };

    const loadDeviceData = async (deviceId) => {
        try {
            const { device } = await api.get('get_device_details', { id: deviceId });
            if (device) {
                document.getElementById('deviceName').value = device.name;
                document.getElementById('deviceIp').value = device.ip || '';
                document.getElementById('deviceDescription').value = device.description || '';
                document.getElementById('checkPort').value = device.check_port || '';
                document.getElementById('deviceType').value = device.type;
                document.getElementById('icon_url').value = device.icon_url || '';
                if (device.icon_url) {
                    iconPreview.src = device.icon_url;
                    iconPreviewWrapper.classList.remove('hidden');
                }
                document.getElementById('pingInterval').value = device.ping_interval || '';
                document.getElementById('warning_latency_threshold').value = device.warning_latency_threshold || '';
                document.getElementById('warning_packetloss_threshold').value = device.warning_packetloss_threshold || '';
                document.getElementById('critical_latency_threshold').value = device.critical_latency_threshold || '';
                document.getElementById('critical_packetloss_threshold').value = device.critical_packetloss_threshold || '';
                document.getElementById('iconSize').value = device.icon_size || 50;
                document.getElementById('nameTextSize').value = device.name_text_size || 14;
                document.getElementById('showLivePing').checked = device.show_live_ping;

                toggleFields(device.type);
                await populateMapSelector(device.map_id);
            } else {
                window.notyf.error('Device not found.');
                window.location.href = 'devices.php'; // Redirect if device not found
            }
        } catch (error) {
            console.error('Failed to load device data:', error);
            window.notyf.error('Failed to load device data.');
            window.location.href = 'devices.php'; // Redirect on error
        }
    };

    editDeviceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        saveDeviceBtn.disabled = true;
        saveDeviceBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';

        const deviceId = deviceIdInput.value;
        const formData = new FormData(editDeviceForm);
        const data = Object.fromEntries(formData.entries());
        data.show_live_ping = document.getElementById('showLivePing').checked;
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

        try {
            // First, update device details
            const result = await api.post('update_device', { id: deviceId, updates: data });
            if (!result.id) { // Check if the update was successful by looking for the returned device ID
                throw new Error(result.error || 'Failed to update device details.');
            }

            // If an icon was uploaded, now update it
            if (iconUploadInput.files.length > 0) {
                const uploadResult = await uploadIcon(deviceId, iconUploadInput.files[0]);
                if (!uploadResult.success) {
                    console.error("Icon upload failed after device update:", uploadResult.error);
                    window.notyf.error(`Device updated, but icon upload failed: ${uploadResult.error}`);
                }
            }
            
            window.notyf.success('Device updated successfully!');
            window.location.href = 'devices.php'; // Redirect back to devices list
        } catch (error) {
            window.notyf.error(`Error: ${error.message || 'An unexpected error occurred while saving changes.'}`);
            console.error(error);
        } finally {
            saveDeviceBtn.disabled = false;
            saveDeviceBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Save Changes';
        }
    });

    deviceTypeSelect.addEventListener('change', (e) => toggleFields(e.target.value));

    iconUrlInput.addEventListener('input', (e) => {
        if (e.target.value) {
            iconPreview.src = e.target.value;
            iconPreviewWrapper.classList.remove('hidden');
        } else {
            iconPreviewWrapper.classList.add('hidden');
        }
    });

    iconUploadInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = (event) => {
                iconPreview.src = event.target.result;
                iconPreviewWrapper.classList.remove('hidden');
            };
            reader.readAsDataURL(file);
        } else {
            iconPreviewWrapper.classList.add('hidden');
        }
    });

    const uploadIcon = async (deviceId, file) => {
        iconUploadLoader.classList.remove('hidden');
        const formData = new FormData();
        formData.append('id', deviceId);
        formData.append('iconFile', file);

        try {
            const response = await fetch(`${API_URL}?action=upload_device_icon`, {
                method: 'POST',
                body: formData
            });
            const result = await response.json();
            if (result.success) {
                iconUrlInput.value = result.url; // Update URL field with new URL
                iconPreview.src = result.url;
                return { success: true, url: result.url };
            } else {
                return { success: false, error: result.error };
            }
        } catch (error) {
            console.error('Icon upload error:', error);
            return { success: false, error: error.message };
        } finally {
            iconUploadLoader.classList.add('hidden');
        }
    };

    // Initial load of device data
    const urlParams = new URLSearchParams(window.location.search);
    const deviceId = urlParams.get('id');
    if (deviceId) {
        loadDeviceData(deviceId);
    } else {
        window.notyf.error('No device ID provided for editing.');
        window.location.href = 'devices.php';
    }
}