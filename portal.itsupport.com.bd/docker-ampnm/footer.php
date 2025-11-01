</div> <!-- Close .page-content -->
</main>
    <footer class="text-center py-4 text-slate-500 text-sm">
        <p>Copyright © <?php echo date("Y"); ?> <a href="https://itsupport.com.bd" target="_blank" class="text-cyan-400 hover:underline">IT Support BD</a>. All rights reserved.</p>
    </footer>
    <script src="https://cdn.jsdelivr.net/npm/notyf@3/notyf.min.js"></script>
    <script src="assets/js/shared.js"></script>
    <script src="assets/js/dashboard.js"></script>
    <script src="assets/js/devices.js"></script>
    <script src="assets/js/history.js"></script>
    
    <!-- Modular Map Scripts -->
    <script src="assets/js/map/config.js"></script>
    <script src="assets/js/map/state.js"></script>
    <script src="assets/js/map/api.js"></script>
    <script src="assets/js/map/utils.js"></script>
    <script src="assets/js/map/ui.js"></script>
    <script src="assets/js/soundManager.js"></script>
    <script src="assets/js/map/deviceManager.js"></script>
    <script src="assets/js/map/mapManager.js"></script>
    <script src="assets/js/map/network.js"></script>
    <script src="assets/js/map.js"></script>
    
    <script src="assets/js/users.js"></script>
    <script src="assets/js/status_logs.js"></script>
    <script src="assets/js/email_notifications.js"></script>
    <script src="assets/js/createdevice.js"></script>
    <script src="assets/js/editdevice.js"></script>
    <script src="assets/js/profile.js"></script>
    <script src="assets/js/map_manager.js"></script>
    
    <script>
    document.addEventListener('DOMContentLoaded', function() {
        // Initialize Notyf for toast notifications
        window.notyf = new Notyf({
            duration: 3000,
            position: { x: 'right', y: 'top' },
            types: [
                { type: 'success', backgroundColor: '#22c5e', icon: { className: 'fas fa-check-circle', tagName: 'i', color: 'white' } },
                { type: 'error', backgroundColor: '#ef4444', icon: { className: 'fas fa-times-circle', tagName: 'i', color: 'white' } },
                { type: 'info', backgroundColor: '#3b82f6', icon: { className: 'fas fa-info-circle', tagName: 'i', color: 'white' } }
            ]
        });

        const page = '<?php echo basename($_SERVER['PHP_SELF']); ?>';
        
        // Pass admin status to JS for client-side checks
        window.isAdmin = <?php echo json_encode($_SESSION['is_admin'] ?? false); ?>;

        // --- Mobile Menu Toggle Logic ---
        const mobileMenuButton = document.getElementById('mobile-menu-button');
        const closeMobileMenuButton = document.getElementById('close-mobile-menu-button');
        const mobileMenu = document.getElementById('mobile-menu');
        const mobileSubmenuToggles = document.querySelectorAll('.mobile-submenu-toggle');

        if (mobileMenuButton) {
            mobileMenuButton.addEventListener('click', () => {
                mobileMenu.classList.remove('hidden');
                document.body.style.overflow = 'hidden'; // Prevent scrolling background
            });
        }

        if (closeMobileMenuButton) {
            closeMobileMenuButton.addEventListener('click', () => {
                mobileMenu.classList.add('hidden');
                document.body.style.overflow = ''; // Restore scrolling
            });
        }

        mobileSubmenuToggles.forEach(toggle => {
            toggle.addEventListener('click', () => {
                const submenu = toggle.nextElementSibling; // The submenu div
                const chevron = toggle.querySelector('.fa-chevron-down');

                if (submenu && submenu.classList.contains('mobile-submenu')) {
                    submenu.classList.toggle('hidden');
                    chevron.classList.toggle('rotate-180'); // Rotate chevron
                }
            });
        });
        // --- End Mobile Menu Toggle Logic ---


        // Initialize page-specific JS
        if (page === 'index.php') {
            initDashboard();
        } else if (page === 'devices.php') {
            initDevices();
        } else if (page === 'history.php') {
            initHistory();
        } else if (page === 'map.php') {
            initMap();
        } else if (page === 'users.php') {
            initUsers();
        } else if (page === 'status_logs.php') {
            initStatusLogs();
        } else if (page === 'email_notifications.php') {
            initEmailNotifications();
        } else if (page === 'createdevice.php') {
            initCreateDevice();
        } else if (page === 'editdevice.php') {
            initEditDevicePage();
        } else if (page === 'profile.php') {
            initProfile();
        } else if (page === 'map_manager.php') {
            initMapManager();
        }
    });
    </script>
</body>
</html>