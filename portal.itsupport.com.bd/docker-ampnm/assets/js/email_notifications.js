function initEmailNotifications() {
    const API_URL = 'api.php';

    const els = {
        smtpSettingsForm: document.getElementById('smtpSettingsForm'),
        smtpHost: document.getElementById('smtpHost'),
        smtpPort: document.getElementById('smtpPort'),
        smtpUsername: document.getElementById('smtpUsername'),
        smtpPassword: document.getElementById('smtpPassword'),
        smtpEncryption: document.getElementById('smtpEncryption'),
        smtpFromEmail: document.getElementById('smtpFromEmail'),
        smtpFromName: document.getElementById('smtpFromName'),
        saveSmtpBtn: document.getElementById('saveSmtpBtn'),
        testSmtpBtn: document.getElementById('testSmtpBtn'), // New button
        smtpLoader: document.getElementById('smtpLoader'),

        addSubscriptionBtn: document.getElementById('addSubscriptionBtn'),
        subscriptionSearchInput: document.getElementById('subscriptionSearchInput'),
        subscriptionsTable: document.getElementById('subscriptionsTable'),
        subscriptionsLoader: document.getElementById('subscriptionsLoader'),
        noSubscriptionsMessage: document.getElementById('noSubscriptionsMessage'),

        // Subscription Editor Modal elements
        subscriptionEditorModal: document.getElementById('subscriptionEditorModal'),
        subscriptionEditorModalTitle: document.getElementById('subscriptionEditorModalTitle'),
        subscriptionEditorForm: document.getElementById('subscriptionEditorForm'),
        editorSubscriptionId: document.getElementById('editorSubscriptionId'),
        editorDeviceSelect: document.getElementById('editorDeviceSelect'),
        editorRecipientEmail: document.getElementById('editorRecipientEmail'),
        editorNotifyOnline: document.getElementById('editorNotifyOnline'),
        editorNotifyOffline: document.getElementById('editorNotifyOffline'),
        editorNotifyWarning: document.getElementById('editorNotifyWarning'),
        editorNotifyCritical: document.getElementById('editorNotifyCritical'),
        saveEditorBtn: document.getElementById('saveEditorBtn'),
        cancelEditorBtn: document.getElementById('cancelEditorBtn'),
    };

    let allDevices = []; // Cache all devices for the editor dropdown

    const api = {
        get: (action, params = {}) => fetch(`${API_URL}?action=${action}&${new URLSearchParams(params)}`).then(res => res.json()),
        post: (action, body = {}) => fetch(`${API_URL}?action=${action}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(res => res.json())
    };

    // --- SMTP Settings Logic ---
    const loadSmtpSettings = async () => {
        els.smtpLoader.classList.remove('hidden');
        try {
            const settings = await api.get('get_smtp_settings');
            if (settings) {
                els.smtpHost.value = settings.host || '';
                els.smtpPort.value = settings.port || '';
                els.smtpUsername.value = settings.username || '';
                els.smtpPassword.value = settings.password || ''; // Will be '********' if masked
                els.smtpEncryption.value = settings.encryption || 'tls';
                els.smtpFromEmail.value = settings.from_email || '';
                els.smtpFromName.value = settings.from_name || '';
            }
        } catch (error) {
            console.error('Failed to load SMTP settings:', error);
            window.notyf.error('Failed to load SMTP settings.');
        } finally {
            els.smtpLoader.classList.add('hidden');
        }
    };

    els.smtpSettingsForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        els.saveSmtpBtn.disabled = true;
        els.saveSmtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';

        const formData = new FormData(els.smtpSettingsForm);
        const data = Object.fromEntries(formData.entries());

        try {
            const result = await api.post('save_smtp_settings', data);
            if (result.success) {
                window.notyf.success(result.message);
                // Reload settings to ensure password masking is applied
                await loadSmtpSettings();
            } else {
                window.notyf.error(`Error: ${result.error}`);
            }
        } catch (error) {
            window.notyf.error('An unexpected error occurred while saving SMTP settings.');
            console.error(error);
        } finally {
            els.saveSmtpBtn.disabled = false;
            els.saveSmtpBtn.innerHTML = '<i class="fas fa-save mr-2"></i>Save Settings';
        }
    });

    els.testSmtpBtn.addEventListener('click', async () => {
        // First, ensure settings are saved or at least valid for testing
        const formData = new FormData(els.smtpSettingsForm);
        const settings = Object.fromEntries(formData.entries());

        if (!settings.host || !settings.port || !settings.username || !settings.from_email) {
            window.notyf.error('Please fill in all required SMTP settings before testing.');
            return;
        }

        const testRecipient = prompt("Enter recipient email for test (e.g., your email):", settings.from_email);
        if (!testRecipient) {
            window.notyf.info('Test email cancelled.');
            return;
        }

        els.testSmtpBtn.disabled = true;
        els.testSmtpBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Sending Test...';

        try {
            const result = await api.post('test_smtp_settings', { ...settings, recipient_email: testRecipient });
            if (result.success) {
                window.notyf.success(result.message);
            } else {
                window.notyf.error(`Test failed: ${result.error}`);
            }
        } catch (error) {
            window.notyf.error('An unexpected error occurred during the test. Check console for details.');
            console.error(error);
        } finally {
            els.testSmtpBtn.disabled = false;
            els.testSmtpBtn.innerHTML = '<i class="fas fa-paper-plane mr-2"></i>Test Settings';
        }
    });

    // --- Device Subscriptions Logic ---

    const populateEditorDeviceSelect = async () => {
        try {
            allDevices = await api.get('get_all_devices_for_subscriptions');
            els.editorDeviceSelect.innerHTML = '<option value="">-- Select a device --</option>' + 
                allDevices.map(d => `<option value="${d.id}">${d.name} (${d.ip || 'N/A'}) ${d.map_name ? `[${d.map_name}]` : ''}</option>`).join('');
        } catch (error) {
            console.error('Failed to load devices for subscriptions:', error);
            window.notyf.error('Failed to load devices for subscriptions.');
        }
    };

    const loadAllSubscriptions = async (searchTerm = '') => {
        els.subscriptionsLoader.classList.remove('hidden');
        els.subscriptionsTable.innerHTML = '';
        els.noSubscriptionsMessage.classList.add('hidden');

        try {
            const subscriptions = await api.get('get_all_device_subscriptions', { search: searchTerm });
            if (subscriptions.length > 0) {
                els.subscriptionsTable.innerHTML = subscriptions.map(sub => {
                    const triggers = [];
                    if (sub.notify_on_online) triggers.push('<span class="inline-block bg-green-500/20 text-green-400 px-2 py-1 rounded-full text-xs mr-1 mb-1">Online</span>');
                    if (sub.notify_on_offline) triggers.push('<span class="inline-block bg-red-500/20 text-red-400 px-2 py-1 rounded-full text-xs mr-1 mb-1">Offline</span>');
                    if (sub.notify_on_warning) triggers.push('<span class="inline-block bg-yellow-500/20 text-yellow-400 px-2 py-1 rounded-full text-xs mr-1 mb-1">Warning</span>');
                    if (sub.notify_on_critical) triggers.push('<span class="inline-block bg-red-700/20 text-red-600 px-2 py-1 rounded-full text-xs mr-1 mb-1">Critical</span>');

                    return `
                        <tr class="border-b border-slate-700">
                            <td class="px-6 py-4 whitespace-nowrap text-white">
                                ${sub.device_name} <span class="text-sm text-slate-500 font-mono">(${sub.device_ip || 'N/A'})</span>
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-slate-400">
                                ${sub.map_name || 'Unassigned'}
                            </td>
                            <td class="px-6 py-4 whitespace-nowrap text-white">${sub.recipient_email}</td>
                            <td class="px-6 py-4 whitespace-nowrap text-slate-400">${triggers.join('')}</td>
                            <td class="px-6 py-4 whitespace-nowrap">
                                <button class="edit-subscription-btn text-yellow-400 hover:text-yellow-300 mr-3" 
                                    data-id="${sub.id}" 
                                    data-device-id="${sub.device_id}" 
                                    data-email="${sub.recipient_email}" 
                                    data-online="${sub.notify_on_online}" 
                                    data-offline="${sub.notify_on_offline}" 
                                    data-warning="${sub.notify_on_warning}" 
                                    data-critical="${sub.notify_on_critical}">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                                <button class="delete-subscription-btn text-red-500 hover:text-red-400" data-id="${sub.id}"><i class="fas fa-trash"></i> Delete</button>
                            </td>
                        </tr>
                    `;
                }).join('');
            } else {
                els.noSubscriptionsMessage.classList.remove('hidden');
            }
        } catch (error) {
            console.error('Failed to load device subscriptions:', error);
            window.notyf.error('Failed to load device subscriptions.');
        } finally {
            els.subscriptionsLoader.classList.add('hidden');
        }
    };

    const openSubscriptionEditor = (subscription = null) => {
        els.subscriptionEditorForm.reset();
        els.editorSubscriptionId.value = subscription ? subscription.id : '';
        els.editorDeviceSelect.value = subscription ? subscription.device_id : '';
        els.editorRecipientEmail.value = subscription ? subscription.recipient_email : '';
        els.editorNotifyOnline.checked = subscription ? (subscription.notify_on_online === '1' || subscription.notify_on_online === true) : true;
        els.editorNotifyOffline.checked = subscription ? (subscription.notify_on_offline === '1' || subscription.notify_on_offline === true) : true;
        els.editorNotifyWarning.checked = subscription ? (subscription.notify_on_warning === '1' || subscription.notify_on_warning === true) : false;
        els.editorNotifyCritical.checked = subscription ? (subscription.notify_on_critical === '1' || subscription.notify_on_critical === true) : false;
        
        els.subscriptionEditorModalTitle.textContent = subscription ? 'Edit Subscription' : 'Add Subscription';
        els.saveEditorBtn.textContent = subscription ? 'Save Changes' : 'Add Subscription';

        // Disable device select for existing subscriptions
        els.editorDeviceSelect.disabled = !!subscription;

        openModal('subscriptionEditorModal');
    };

    els.addSubscriptionBtn.addEventListener('click', () => openSubscriptionEditor());

    els.cancelEditorBtn.addEventListener('click', () => closeModal('subscriptionEditorModal'));

    els.subscriptionEditorForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        els.saveEditorBtn.disabled = true;
        els.saveEditorBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';

        const data = {
            id: els.editorSubscriptionId.value || null,
            device_id: els.editorDeviceSelect.value,
            recipient_email: els.editorRecipientEmail.value,
            notify_on_online: els.editorNotifyOnline.checked,
            notify_on_offline: els.editorNotifyOffline.checked,
            notify_on_warning: els.editorNotifyWarning.checked,
            notify_on_critical: els.editorNotifyCritical.checked,
        };

        try {
            const result = await api.post('save_device_subscription', data);
            if (result.success) {
                window.notyf.success(result.message);
                closeModal('subscriptionEditorModal');
                await loadAllSubscriptions(els.subscriptionSearchInput.value); // Reload all subscriptions
            } else {
                window.notyf.error(`Error: ${result.error}`);
            }
        } catch (error) {
            window.notyf.error('An unexpected error occurred while saving subscription.');
            console.error(error);
        } finally {
            els.saveEditorBtn.disabled = false;
            els.saveEditorBtn.innerHTML = 'Save Subscription';
        }
    });

    els.subscriptionsTable.addEventListener('click', async (e) => {
        const editButton = e.target.closest('.edit-subscription-btn');
        const deleteButton = e.target.closest('.delete-subscription-btn');

        if (editButton) {
            const subscription = {
                id: editButton.dataset.id,
                device_id: editButton.dataset.deviceId,
                recipient_email: editButton.dataset.email,
                notify_on_online: editButton.dataset.online,
                notify_on_offline: editButton.dataset.offline,
                notify_on_warning: editButton.dataset.warning,
                notify_on_critical: editButton.dataset.critical,
            };
            openSubscriptionEditor(subscription);
        } else if (deleteButton) {
            const subscriptionId = deleteButton.dataset.id;
            if (confirm('Are you sure you want to delete this subscription?')) {
                try {
                    const result = await api.post('delete_device_subscription', { id: subscriptionId });
                    if (result.success) {
                        window.notyf.success(result.message);
                        await loadAllSubscriptions(els.subscriptionSearchInput.value); // Reload all subscriptions
                    } else {
                        window.notyf.error(`Error: ${result.error}`);
                    }
                } catch (error) {
                    window.notyf.error('An unexpected error occurred while deleting subscription.');
                    console.error(error);
                }
            }
        }
    });

    els.subscriptionSearchInput.addEventListener('input', () => {
        loadAllSubscriptions(els.subscriptionSearchInput.value);
    });

    // Initial load
    loadSmtpSettings();
    populateEditorDeviceSelect(); // Load devices for the editor modal
    loadAllSubscriptions(); // Load all subscriptions for the main table
}