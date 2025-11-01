function initUsers() {
    const API_URL = 'api.php';
    const usersTableBody = document.getElementById('usersTableBody');
    const usersLoader = document.getElementById('usersLoader');
    const createUserForm = document.getElementById('createUserForm');

    // Edit User Modal elements
    const editUserModal = document.getElementById('editUserModal');
    const editUserForm = document.getElementById('editUserForm');
    const editUserId = document.getElementById('edit_user_id');
    const editUsername = document.getElementById('edit_username');
    const editPassword = document.getElementById('edit_password');
    const editRole = document.getElementById('edit_role');
    const mapPermissionsList = document.getElementById('mapPermissionsList');
    const cancelEditUserBtn = document.getElementById('cancelEditUserBtn');
    const saveEditUserBtn = document.getElementById('saveEditUserBtn');

    const api = {
        get: (action, params = {}) => fetch(`${API_URL}?action=${action}&${new URLSearchParams(params)}`).then(res => res.json()),
        post: (action, body) => fetch(`${API_URL}?action=${action}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        }).then(res => res.json())
    };

    const renderRoleBadge = (role) => {
        const base = "px-2 inline-flex text-xs leading-5 font-semibold rounded-full";
        if (role === 'admin') {
            return `<span class="${base} bg-cyan-600/50 text-cyan-300">Admin</span>`;
        }
        return `<span class="${base} bg-slate-600/50 text-slate-300">Basic</span>`;
    };

    const loadUsers = async () => {
        usersLoader.classList.remove('hidden');
        usersTableBody.innerHTML = '';
        try {
            const users = await api.get('get_users');
            usersTableBody.innerHTML = users.map(user => `
                <tr class="border-b border-slate-700">
                    <td class="px-6 py-4 whitespace-nowrap text-white">${user.username}</td>
                    <td class="px-6 py-4 whitespace-nowrap">${renderRoleBadge(user.role)}</td>
                    <td class="px-6 py-4 whitespace-nowrap text-slate-400">${new Date(user.created_at).toLocaleString()}</td>
                    <td class="px-6 py-4 whitespace-nowrap">
                        <button class="edit-user-btn text-yellow-400 hover:text-yellow-300 mr-3" data-id="${user.id}" data-username="${user.username}" data-role="${user.role}"><i class="fas fa-edit mr-2"></i>Edit</button>
                        ${user.username !== 'admin' ? `<button class="delete-user-btn text-red-500 hover:text-red-400" data-id="${user.id}" data-username="${user.username}"><i class="fas fa-trash mr-2"></i>Delete</button>` : '<span class="text-slate-500">Cannot delete primary admin</span>'}
                    </td>
                </tr>
            `).join('');
        } catch (error) {
            console.error('Failed to load users:', error);
            window.notyf.error('Failed to load users.');
        } finally {
            usersLoader.classList.add('hidden');
        }
    };

    const loadMapPermissions = async (userId) => {
        mapPermissionsList.innerHTML = '<div class="text-center py-4"><div class="loader mx-auto w-4 h-4"></div><span class="ml-2 text-sm text-slate-400">Loading maps...</span></div>';
        try {
            const { all_maps, user_map_ids } = await api.get('get_user_map_permissions', { user_id: userId });
            
            console.log('DEBUG: Fetched all_maps:', all_maps);
            console.log('DEBUG: Fetched user_map_ids:', user_map_ids);

            if (all_maps.length === 0) {
                console.warn('DEBUG: No maps found in the database for permissions display.');
                mapPermissionsList.innerHTML = '<p class="text-sm text-slate-500">No maps available to assign. Please create maps first.</p>';
                return;
            }
            if (user_map_ids.length === 0) {
                console.log('DEBUG: User has no map permissions assigned yet.');
            }

            mapPermissionsList.innerHTML = all_maps.map(map => {
                const isChecked = user_map_ids.includes(map.id.toString()); // Keep toString() for robustness
                console.log(`DEBUG: Map ${map.name} (ID: ${map.id}), isChecked: ${isChecked}`);
                return `
                    <label class="flex items-center text-sm font-medium text-slate-400">
                        <input type="checkbox" name="map_id[]" value="${map.id}" class="h-4 w-4 rounded border-slate-500 bg-slate-700 text-cyan-600 focus:ring-cyan-500" ${isChecked ? 'checked' : ''}>
                        <span class="ml-2">${map.name}</span>
                    </label>
                `;
            }).join('');

        } catch (error) {
            console.error('ERROR: Failed to load map permissions:', error);
            mapPermissionsList.innerHTML = '<p class="text-sm text-red-400">Failed to load map permissions. Check console for details.</p>';
        }
    };

    createUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = e.target.username.value;
        const password = e.target.password.value;
        const role = e.target.role.value;
        if (!username || !password) return;

        const button = createUserForm.querySelector('button[type="submit"]');
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Creating...';

        try {
            const result = await api.post('create_user', { username, password, role });
            if (result.success) {
                window.notyf.success('User created successfully.');
                createUserForm.reset();
                await loadUsers();
            } else {
                window.notyf.error(`Error: ${result.error}`);
            }
        } catch (error) {
            window.notyf.error('An unexpected error occurred.');
            console.error(error);
        } finally {
            button.disabled = false;
            button.innerHTML = '<i class="fas fa-user-plus mr-2"></i>Create User';
        }
    });

    usersTableBody.addEventListener('click', async (e) => {
        const deleteButton = e.target.closest('.delete-user-btn');
        const editButton = e.target.closest('.edit-user-btn');

        if (deleteButton) {
            const { id, username } = deleteButton.dataset;
            if (confirm(`Are you sure you want to delete user "${username}"?`)) {
                const result = await api.post('delete_user', { id });
                if (result.success) {
                    window.notyf.success(`User "${username}" deleted.`);
                    await loadUsers();
                } else {
                    window.notyf.error(`Error: ${result.error}`);
                }
            }
        } else if (editButton) {
            const { id, username, role } = editButton.dataset;
            editUserId.value = id;
            editUsername.value = username;
            editRole.value = role;
            editPassword.value = ''; // Clear password field for security
            
            await loadMapPermissions(id);
            openModal('editUserModal');
        }
    });

    editUserForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const userId = editUserId.value;
        const username = editUsername.value;
        const password = editPassword.value; // Can be empty if not changing
        const role = editRole.value;

        const selectedMapIds = Array.from(mapPermissionsList.querySelectorAll('input[type="checkbox"]:checked'))
                                    .map(checkbox => checkbox.value);

        const button = saveEditUserBtn;
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';

        try {
            // Update user details
            const userUpdateResult = await api.post('update_user', { id: userId, username, password, role });
            if (!userUpdateResult.success) {
                throw new Error(userUpdateResult.error || 'Failed to update user details.');
            }

            // Update map permissions
            const mapPermissionsUpdateResult = await api.post('update_user_map_permissions', { user_id: userId, map_ids: selectedMapIds });
            if (!mapPermissionsUpdateResult.success) {
                throw new Error(mapPermissionsUpdateResult.error || 'Failed to update map permissions.');
            }

            window.notyf.success('User and permissions updated successfully.');
            closeModal('editUserModal');
            await loadUsers(); // Reload user list to reflect changes
        } catch (error) {
            window.notyf.error(`Error: ${error.message}`);
            console.error(error);
        } finally {
            button.disabled = false;
            button.innerHTML = 'Save Changes';
        }
    });

    cancelEditUserBtn.addEventListener('click', () => closeModal('editUserModal'));

    loadUsers();
}