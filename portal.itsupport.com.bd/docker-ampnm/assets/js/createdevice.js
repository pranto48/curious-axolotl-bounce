function initCreateDevice() {
    const API_URL = 'api.php';
    const createDevicePageForm = document.getElementById('createDevicePageForm');
    const deviceMapSelector = document.getElementById('deviceMap');
    const saveBtn = document.getElementById('saveBtn');

    let availableMaps = []; // Cache maps list

    const api = {
        get: (action, params = {}) => fetch(`${API_URL}?action=${action}&${new URLSearchParams(params)}`).then(res => res.json()),
        post: (action, body = {}) => fetch(`${API_URL}?action=${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(res => res.json())
    };

    const populateMapSelector = async () => {
        if (availableMaps.length === 0) {
            try {
                availableMaps = await api.get('get_maps');
            } catch (e) {
                console.error("Could not fetch maps for selector", e);
                window.notyf.error('Failed to load maps for assignment.');
                return;
            }
        }
        deviceMapSelector.innerHTML = `
            <option value="">Unassigned</option>
            ${availableMaps.map(map => `<option value="${map.id}">${map.name}</option>`).join('')}
        `;
    };

    createDevicePageForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData(createDevicePageForm);
        const data = Object.fromEntries(formData.entries());
        
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

        // Handle checkbox value
        data.show_live_ping = document.getElementById('showLivePing').checked;

        saveBtn.disabled = true;
        saveBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating...';

        try {
            const result = await api.post('create_device', data);
            if (result.success || result.id) { // Check for success or returned ID
                window.notyf.success('Device created successfully!');
                createDevicePageForm.reset();
                // Optionally redirect to devices list or the map
                window.location.href = 'devices.php'; 
            } else {
                window.notyf.error(`Error: ${result.error || 'Failed to create device.'}`);
            }
        } catch (error) {
            window.notyf.error('An unexpected error occurred while creating the device.');
            console.error(error);
        } finally {
            saveBtn.disabled = false;
            saveBtn.innerHTML = '<i class="fas fa-plus mr-2"></i>Create Device';
        }
    });

    // Initial load
    populateMapSelector();
}