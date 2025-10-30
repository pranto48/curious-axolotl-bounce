<?php
require_once '../includes/functions.php';

// Ensure admin is logged in
if (!isAdminLoggedIn()) {
    redirectToAdminLogin();
}

$pdo = getLicenseDbConnection();
$message = '';

// Handle delete user action
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['delete_customer'])) {
    $customer_id = (int)$_POST['customer_id'];
    try {
        $pdo->beginTransaction();
        
        // 1. Delete related profile data
        $stmt_profile = $pdo->prepare("DELETE FROM `profiles` WHERE customer_id = ?");
        $stmt_profile->execute([$customer_id]);
        
        // 2. Deleting customer cascades to orders, order_items, licenses, and tickets due to foreign keys (ON DELETE CASCADE)
        $stmt = $pdo->prepare("DELETE FROM `customers` WHERE id = ?");
        $stmt->execute([$customer_id]);
        
        $pdo->commit();
        $message = '<div class="alert-admin-success mb-4">Customer and all associated data deleted successfully.</div>';
    } catch (PDOException $e) {
        $pdo->rollBack();
        $message = '<div class="alert-admin-error mb-4">Error deleting customer: ' . htmlspecialchars($e->getMessage()) . '</div>';
    }
}

// Fetch all customers
$stmt = $pdo->query("SELECT id, first_name, last_name, email, created_at FROM `customers` ORDER BY created_at DESC");
$customers = $stmt->fetchAll(PDO::FETCH_ASSOC);

admin_header("Manage Customers");
?>

<h1 class="text-4xl font-bold text-blue-400 mb-8 text-center">Manage Customers</h1>

<?= $message ?>

<div class="admin-card p-6">
    <h2 class="text-2xl font-semibold text-blue-400 mb-4">All Customers</h2>
    <?php if (empty($customers)): ?>
        <p class="text-center text-gray-400 py-8">No customers registered yet.</p>
    <?php else: ?>
        <div class="overflow-x-auto">
            <table class="min-w-full bg-gray-700 rounded-lg">
                <thead>
                    <tr class="bg-gray-600 text-gray-200 uppercase text-sm leading-normal">
                        <th class="py-3 px-6 text-left">ID</th>
                        <th class="py-3 px-6 text-left">Name</th>
                        <th class="py-3 px-6 text-left">Email</th>
                        <th class="py-3 px-6 text-left">Registered On</th>
                        <th class="py-3 px-6 text-center">Actions</th>
                    </tr>
                </thead>
                <tbody class="text-gray-300 text-sm font-light">
                    <?php foreach ($customers as $customer): ?>
                        <tr class="border-b border-gray-600 hover:bg-gray-600">
                            <td class="py-3 px-6 text-left whitespace-nowrap"><?= htmlspecialchars($customer['id']) ?></td>
                            <td class="py-3 px-6 text-left"><?= htmlspecialchars($customer['first_name'] . ' ' . $customer['last_name']) ?></td>
                            <td class="py-3 px-6 text-left"><?= htmlspecialchars($customer['email']) ?></td>
                            <td class="py-3 px-6 text-left"><?= date('Y-m-d H:i', strtotime($customer['created_at'])) ?></td>
                            <td class="py-3 px-6 text-center whitespace-nowrap">
                                <button onclick="openEditCustomerModal(<?= htmlspecialchars($customer['id']) ?>)" class="btn-admin-primary text-xs px-3 py-1 mr-2">
                                    <i class="fas fa-edit mr-1"></i>Edit
                                </button>
                                <form action="users.php" method="POST" onsubmit="return confirm('Are you sure you want to delete this customer and all associated data (licenses, orders, tickets)?');" class="inline-block">
                                    <input type="hidden" name="customer_id" value="<?= htmlspecialchars($customer['id']) ?>">
                                    <button type="submit" name="delete_customer" class="btn-admin-danger text-xs px-3 py-1">
                                        <i class="fas fa-trash-alt mr-1"></i>Delete
                                    </button>
                                </form>
                            </td>
                        </tr>
                    <?php endforeach; ?>
                </tbody>
            </table>
        </div>
    <?php endif; ?>
</div>

<!-- Edit Customer Modal -->
<div id="editCustomerModal" class="fixed inset-0 bg-gray-900 bg-opacity-75 flex items-center justify-center hidden">
    <div class="bg-gray-700 p-8 rounded-lg shadow-xl w-full max-w-md">
        <h2 class="text-2xl font-semibold text-blue-400 mb-4">Edit Customer Details</h2>
        <form id="editCustomerForm" class="space-y-4">
            <input type="hidden" name="customer_id" id="edit_customer_id">
            <div>
                <label for="edit_first_name" class="block text-gray-300 text-sm font-bold mb-2">First Name:</label>
                <input type="text" id="edit_first_name" name="first_name" class="form-admin-input" required>
            </div>
            <div>
                <label for="edit_last_name" class="block text-gray-300 text-sm font-bold mb-2">Last Name:</label>
                <input type="text" id="edit_last_name" name="last_name" class="form-admin-input" required>
            </div>
            <div>
                <label for="edit_email" class="block text-gray-300 text-sm font-bold mb-2">Email:</label>
                <input type="email" id="edit_email" name="email" class="form-admin-input" required>
            </div>
            <div class="border-t border-gray-600 pt-4">
                <h3 class="text-lg font-semibold text-yellow-400 mb-2">Password Reset (Optional)</h3>
                <label for="edit_new_password" class="block text-gray-300 text-sm font-bold mb-2">New Password:</label>
                <input type="password" id="edit_new_password" name="new_password" class="form-admin-input" placeholder="Leave blank to keep current password">
            </div>
            <div class="flex justify-end space-x-4">
                <button type="button" onclick="closeEditCustomerModal()" class="btn-admin-secondary">Cancel</button>
                <button type="submit" class="btn-admin-primary">Save Changes</button>
            </div>
        </form>
    </div>
</div>

<script>
    // Helper function to show Notyf messages (assuming Notyf is loaded via admin_footer)
    function showAdminMessage(message, type = 'success') {
        if (window.notyf) {
            window.notyf.open({ type: type, message: message, duration: 3000 });
        } else {
            alert(message);
        }
    }

    async function openEditCustomerModal(customerId) {
        const modal = document.getElementById('editCustomerModal');
        const form = document.getElementById('editCustomerForm');
        form.reset();
        document.getElementById('edit_customer_id').value = customerId;
        
        // Fetch current details
        try {
            const response = await fetch(`admin_api.php?action=get_customer_details&id=${customerId}`);
            const data = await response.json();

            if (data.success) {
                const customer = data.customer;
                document.getElementById('edit_first_name').value = customer.first_name;
                document.getElementById('edit_last_name').value = customer.last_name;
                document.getElementById('edit_email').value = customer.email;
                modal.classList.remove('hidden');
            } else {
                showAdminMessage(data.error || 'Failed to fetch customer details.', 'error');
            }
        } catch (error) {
            console.error('Fetch error:', error);
            showAdminMessage('An unexpected error occurred while fetching customer data.', 'error');
        }
    }

    function closeEditCustomerModal() {
        document.getElementById('editCustomerModal').classList.add('hidden');
    }

    document.getElementById('editCustomerForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const form = e.target;
        const customerId = form.customer_id.value;
        const first_name = form.first_name.value;
        const last_name = form.last_name.value;
        const email = form.email.value;
        const new_password = form.new_password.value;

        const button = form.querySelector('button[type="submit"]');
        button.disabled = true;
        button.innerHTML = '<i class="fas fa-spinner fa-spin mr-2"></i>Saving...';

        try {
            const response = await fetch('admin_api.php?action=update_customer_details', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id: customerId, first_name, last_name, email, new_password })
            });
            const data = await response.json();

            if (data.success) {
                showAdminMessage(data.message, 'success');
                closeEditCustomerModal();
                // Simple page refresh to update the table
                setTimeout(() => window.location.reload(), 500);
            } else {
                showAdminMessage(data.error || 'Failed to update customer.', 'error');
            }
        } catch (error) {
            console.error('Update error:', error);
            showAdminMessage('An unexpected error occurred during update.', 'error');
        } finally {
            button.disabled = false;
            button.innerHTML = 'Save Changes';
        }
    });
</script>

<?php admin_footer(); ?>