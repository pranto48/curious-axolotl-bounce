function initCreateDevice() {
    const API_URL = 'api.php';
    const createDeviceForm = document.getElementById('createDeviceForm');
    const saveDeviceBtn = document.getElementById('saveDeviceBtn');
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

    const populateMapSelector = async () => {
        try {
            const maps = await api.get('get_maps');
            let defaultMapId = null;
            let optionsHtml = '<option value="">-- No Map --</option>';

            if (maps.length > 0) {
                maps.forEach(map => {
                    optionsHtml += `<option value="${map.id}">${map.name}</option>`;
                    if (map.is_default == 1) {
                        defaultMapId = map.id;
                    }
                });
            }
            deviceMapSelect.innerHTML = optionsHtml;
            if (defaultMapId) {
                deviceMapSelect.value = defaultMapId;
                console.log(`Default map '${defaultMapId}' selected.`);
            } else {
                console.log('No default map found or no maps available. "No Map" selected.');
            }
        } catch (error) {
            console.error('Failed to load maps:', error);
            window.notyf.error('Failed to load maps for assignment.');
        }
    };

    createDeviceForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        saveDeviceBtn.disabled = true;
        saveDeviceBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating...';

        const formData = new FormData(createDeviceForm);
        const data = Object.fromEntries(formData.entries());
        data.show_live_ping = document.getElementById('showLivePing').checked;

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
            const result = await api.post('create_device', data);
            if (result.success) {
                window.notyf.success('Device created successfully!');
                createDeviceForm.reset();
                toggleFields(deviceTypeSelect.value); // Reset fields visibility
                iconPreviewWrapper.classList.add('hidden'); // Hide preview
                iconUploadInput.value = ''; // Clear file input
                // If an icon was uploaded, now update it
                if (iconUploadInput.files.length > 0) {
                    await uploadIcon(result.id, iconUploadInput.files[0]);
                }
            } else {
                window.notyf.error(`Error: ${result.error}`);
            }
        } catch (error) {
            window.notyf.error('An unexpected error occurred while creating the device.');
            console.error(error);
        } finally {
            saveDeviceBtn.disabled = false;
            saveDeviceBtn.innerHTML = '<i class="fas fa-plus mr-2"></i>Create Device';
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
                window.notyf.success('Device icon uploaded successfully.');
                iconUrlInput.value = result.url; // Update URL field with new URL
                iconPreview.src = result.url;
            } else {
                window.notyf.error(`Error uploading icon: ${result.error}`);
            }
        } catch (error) {
            window.notyf.error('An unexpected error occurred during icon upload.');
            console.error('Icon upload error:', error);
        } finally {
            iconUploadLoader.classList.add('hidden');
        }
    };

    // Initial setup
    toggleFields(deviceTypeSelect.value);
    populateMapSelector();
}