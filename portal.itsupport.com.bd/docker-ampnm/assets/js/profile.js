function initProfile() {
    const API_URL = 'api.php';
    const changePasswordForm = document.getElementById('changePasswordForm');
    const savePasswordBtn = document.getElementById('savePasswordBtn');

    const api = {
        post: (action, body) => fetch(`${API_URL}?action=${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }).then(res => res.json())
    };

    changePasswordForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const currentPassword = e.target.current_password.value;
        const newPassword = e.target.new_password.value;
        const confirmNewPassword = e.target.confirm_new_password.value;

        if (newPassword !== confirmNewPassword) {
            window.notyf.error('New passwords do not match.');
            return;
        }
        if (newPassword.length < 6) {
            window.notyf.error('New password must be at least 6 characters long.');
            return;
        }

        savePasswordBtn.disabled = true;
        savePasswordBtn.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';

        try {
            const result = await api.post('change_my_password', {
                current_password: currentPassword,
                new_password: newPassword
            });

            if (result.success) {
                window.notyf.success('Password changed successfully!');
                changePasswordForm.reset();
            } else {
                window.notyf.error(`Error: ${result.error}`);
            }
        } catch (error) {
            window.notyf.error('An unexpected error occurred while changing password.');
            console.error(error);
        } finally {
            savePasswordBtn.disabled = false;
            savePasswordBtn.innerHTML = '<i class="fas fa-key mr-2"></i>Change Password';
        }
    });
}