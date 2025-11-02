function initCreateDevice() {
    console.log('initCreateDevice function started.'); // Aggressive log 1

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

    if (!createDeviceForm) {
        console.error('ERROR: createDeviceForm element not found!'); // Aggressive log 2
        return; // Stop execution if the form isn't found
    }
    console.log('createDeviceForm element found:', createDeviceForm); // Aggressive log 3

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
            console.log('Maps fetched for selector in createdevice.js:', maps); // Debug log
            let optionsHtml = '<option value="">-- No Map --</option>'; // Start with "No Map" selected

            if (maps.length > 0) {
                maps.forEach(map => {
                    optionsHtml += `<option value="${map.id}">${map.name}</option>`;
                });
            }
            deviceMapSelect.innerHTML = optionsHtml;
            // Do NOT automatically set deviceMapSelect.value to defaultMapId
            // The first option "-- No Map --" will be selected by default.
            console.log('Map selector populated. "No Map" is selected by default.');
        } catch (error) {
            console.error('Failed to load maps:', error);
            window.notyf.error('Failed to load maps for assignment.');
        }
    };

    createDeviceForm.addEventListener('submit', async (e) => {
        console.log('Form submission event triggered.'); // Aggressive log 4
        e.preventDefault(); // Prevent default form submission (page reload)
        console.log('Default form submission prevented.');

        saveDeviceBtn.disabled = true;
        saveDeviceBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating...';

        // Explicitly collect data from form fields
        const data = {
            name: document.getElementById('deviceName').value,
            ip: document.getElementById('deviceIp').value || null,
            description: document.getElementById('deviceDescription').value || null,
            check_port: document.getElementById('checkPort').value || null,
            type: document.getElementById('deviceType').value,
            map_id: document.getElementById('deviceMap').value || null,
            icon_url: document.getElementById('icon_url').value || null,
            ping_interval: document.getElementById('pingInterval').value || null,
            warning_latency_threshold: document.getElementById('warning_latency_threshold').value || null,
            warning_packetloss_threshold: document.getElementById('warning_packetloss_threshold').value || null,
            critical_latency_threshold: document.getElementById('critical_latency_threshold').value || null,
            critical_packetloss_threshold: document.getElementById('critical_packetloss_threshold').value || null,
            icon_size: document.getElementById('iconSize').value || 50,
            name_text_size: document.getElementById('nameTextSize').value || 14,
            show_live_ping: document.getElementById('showLivePing').checked ? 1 : 0, // Ensure 1 or 0
        };

        // Convert numeric fields from string to number, or null if empty
        const numericFields = ['check_port', 'ping_interval', 'icon_size', 'name_text_size', 'warning_latency_threshold', 'warning_packetloss_threshold', 'critical_latency_threshold', 'critical_packetloss_threshold'];
        numericFields.forEach(field => {
            if (data[field] !== null && data[field] !== '') {
                data[field] = Number(data[field]);
            } else {
                data[field] = null;
            }
        });

        console.log('Data to be sent to API:', data); // Log the final data object

        try {
            const result = await api.post('create_device', data);
            console.log("API response for create_device:", result);

            if (result.success) {
                window.notyf.success('Device created successfully!');
                createDeviceForm.reset();
                toggleFields(deviceTypeSelect.value); // Reset fields visibility
                iconPreviewWrapper.classList.add('hidden'); // Hide preview
                iconUploadInput.value = ''; // Clear file input

                // Handle icon upload if a file was selected
                if (iconUploadInput.files.length > 0) {
                    const uploadResult = await uploadIcon(result.device.id, iconUploadInput.files[0]);
                    if (!uploadResult.success) {
                        console.error("Icon upload failed after device creation:", uploadResult.error);
                        window.notyf.error(`Device created, but icon upload failed: ${uploadResult.error}`);
                    }
                }
                // Redirect to devices.php after successful creation
                window.location.href = 'devices.php';
            } else {
                // This block will now be hit if result.success is explicitly false
                window.notyf.error(`Error: ${result.error || 'An unknown error occurred during device creation.'}`);
            }
        } catch (error) {
            console.error("Error caught during device creation process:", error); // Keep this log
            window.notyf.error('An unexpected error occurred while creating the device. Check console for details.');
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
                return { success: true, url: result.url };
            } else {
                window.notyf.error(`Error uploading icon: ${result.error}`);
                return { success: false, error: result.error };
            }
        } catch (error) {
            window.notyf.error('An unexpected error occurred during icon upload.');
            console.error('Icon upload error:', error);
            return { success: false, error: error.message };
        } finally {
            iconUploadLoader.classList.add('hidden');
        }
    };

    // Initial setup
    toggleFields(deviceTypeSelect.value);
    populateMapSelector();
}