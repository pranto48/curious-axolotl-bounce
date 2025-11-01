<?php
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

$current_page = basename($_SERVER['PHP_SELF']);
$is_admin = $_SESSION['role'] ?? 'basic' === 'admin';

// Define the menu structure
$menu_items = [
    [
        'label' => 'Dashboard',
        'icon' => 'fas fa-tachometer-alt',
        'link' => 'index.php',
        'roles' => ['admin', 'basic']
    ],
    [
        'label' => 'Monitoring',
        'icon' => 'fas fa-chart-line',
        'roles' => ['admin', 'basic'],
        'submenu' => [
            [
                'label' => 'Devices',
                'icon' => 'fas fa-server',
                'link' => 'devices.php',
                'roles' => ['admin', 'basic']
            ],
            [
                'label' => 'History',
                'icon' => 'fas fa-history',
                'link' => 'history.php',
                'roles' => ['admin', 'basic']
            ],
            [
                'label' => 'Status Logs',
                'icon' => 'fas fa-clipboard-list',
                'link' => 'status_logs.php',
                'roles' => ['admin']
            ],
            [
                'label' => 'Email Notifications',
                'icon' => 'fas fa-envelope',
                'link' => 'email_notifications.php',
                'roles' => ['admin']
            ],
        ]
    ],
    [
        'label' => 'Network Map',
        'icon' => 'fas fa-project-diagram',
        'roles' => ['admin', 'basic'],
        'submenu' => [
            [
                'label' => 'View Map',
                'icon' => 'fas fa-map',
                'link' => 'map.php',
                'roles' => ['admin', 'basic']
            ],
            [
                'label' => 'Map Management',
                'icon' => 'fas fa-map-marked-alt',
                'link' => 'map_manager.php',
                'roles' => ['admin']
            ],
        ]
    ],
    [
        'label' => 'Admin Tools',
        'icon' => 'fas fa-users-cog',
        'roles' => ['admin'],
        'submenu' => [
            [
                'label' => 'Users',
                'icon' => 'fas fa-users',
                'link' => 'users.php',
                'roles' => ['admin']
            ],
        ]
    ],
    [
        'label' => 'My Profile',
        'icon' => 'fas fa-user-circle',
        'link' => 'profile.php',
        'roles' => ['admin', 'basic']
    ],
    [
        'label' => 'Logout',
        'icon' => 'fas fa-sign-out-alt',
        'link' => 'logout.php',
        'roles' => ['admin', 'basic']
    ],
];

// Function to check if a menu item should be displayed for the current user role
function can_access($item_roles, $current_role) {
    return in_array($current_role, $item_roles);
}

// Function to check if a link is active
function is_active($link, $current_page) {
    return $link === $current_page || ($current_page === 'index.php' && $link === '/');
}
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AMPNM</title>
    <link rel="icon" href="data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🌐</text></svg>">
    <script src="https://cdn.tailwindcss.com"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chartjs-adapter-date-fns/dist/chartjs-adapter-date-fns.bundle.min.js"></script>
    <script src="https://unpkg.com/vis-network/standalone/umd/vis-network.min.js"></script>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/notyf@3/notyf.min.css">
    <link rel="stylesheet" href="assets/css/style.css">
</head>
<body class="bg-slate-900 text-slate-300 min-h-screen">
    <nav class="bg-slate-800/50 backdrop-blur-lg shadow-lg sticky top-0 z-50">
        <div class="container mx-auto px-4">
            <div class="flex items-center justify-between h-16">
                <div class="flex items-center">
                    <a href="index.php" class="flex items-center gap-2 text-white font-bold">
                        <i class="fas fa-shield-halved text-cyan-400 text-2xl"></i>
                        <span>AMPNM</span>
                    </a>
                </div>

                <!-- Desktop Menu -->
                <div class="hidden md:block">
                    <div id="main-nav" class="ml-10 flex items-baseline space-x-1">
                        <?php foreach ($menu_items as $item): ?>
                            <?php if (can_access($item['roles'], $_SESSION['role'] ?? 'basic')): ?>
                                <?php if (isset($item['submenu'])): ?>
                                    <div class="relative group">
                                        <button class="nav-link flex items-center">
                                            <i class="<?= $item['icon'] ?> fa-fw mr-2"></i>
                                            <span><?= $item['label'] ?></span>
                                            <i class="fas fa-chevron-down ml-2 text-xs"></i>
                                        </button>
                                        <div class="absolute left-0 mt-2 w-48 bg-slate-800 border border-slate-700 rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible group-hover:translate-y-0 transition-all duration-200 ease-out transform translate-y-2 z-10">
                                            <?php foreach ($item['submenu'] as $sub_item): ?>
                                                <?php if (can_access($sub_item['roles'], $_SESSION['role'] ?? 'basic')): ?>
                                                    <a href="<?= $sub_item['link'] ?>" class="block px-4 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white rounded-md <?= is_active($sub_item['link'], $current_page) ? 'bg-slate-700 text-white' : '' ?>">
                                                        <i class="<?= $sub_item['icon'] ?> fa-fw mr-2"></i>
                                                        <?= $sub_item['label'] ?>
                                                    </a>
                                                <?php endif; ?>
                                            <?php endforeach; ?>
                                        </div>
                                    </div>
                                <?php else: ?>
                                    <a href="<?= $item['link'] ?>" class="nav-link <?= is_active($item['link'], $current_page) ? 'bg-slate-700 text-white' : '' ?>">
                                        <i class="<?= $item['icon'] ?> fa-fw mr-2"></i>
                                        <span><?= $item['label'] ?></span>
                                    </a>
                                <?php endif; ?>
                            <?php endif; ?>
                        <?php endforeach; ?>
                    </div>
                </div>

                <!-- Mobile Menu Button -->
                <div class="md:hidden flex items-center">
                    <button id="mobile-menu-button" class="text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 p-2 rounded-md">
                        <i class="fas fa-bars text-xl"></i>
                    </button>
                </div>
            </div>
        </div>

        <!-- Mobile Menu (Hidden by default) -->
        <div id="mobile-menu" class="md:hidden hidden fixed inset-0 bg-slate-900 bg-opacity-95 z-[60] overflow-y-auto">
            <div class="flex justify-end p-4">
                <button id="close-mobile-menu-button" class="text-slate-300 hover:text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 p-2 rounded-md">
                    <i class="fas fa-times text-xl"></i>
                </button>
            </div>
            <div class="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                <?php foreach ($menu_items as $item): ?>
                    <?php if (can_access($item['roles'], $_SESSION['role'] ?? 'basic')): ?>
                        <?php if (isset($item['submenu'])): ?>
                            <div class="mobile-submenu-toggle block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-700 hover:text-white cursor-pointer">
                                <i class="<?= $item['icon'] ?> fa-fw mr-2"></i>
                                <span><?= $item['label'] ?></span>
                                <i class="fas fa-chevron-down ml-auto text-xs transform transition-transform duration-200"></i>
                            </div>
                            <div class="mobile-submenu hidden pl-4 pr-2 py-1 space-y-1">
                                <?php foreach ($item['submenu'] as $sub_item): ?>
                                    <?php if (can_access($sub_item['roles'], $_SESSION['role'] ?? 'basic')): ?>
                                        <a href="<?= $sub_item['link'] ?>" class="block px-3 py-2 rounded-md text-sm font-medium text-slate-400 hover:bg-slate-700 hover:text-white <?= is_active($sub_item['link'], $current_page) ? 'bg-slate-700 text-white' : '' ?>">
                                            <i class="<?= $sub_item['icon'] ?> fa-fw mr-2"></i>
                                            <?= $sub_item['label'] ?>
                                        </a>
                                    <?php endif; ?>
                                <?php endforeach; ?>
                            </div>
                        <?php else: ?>
                            <a href="<?= $item['link'] ?>" class="block px-3 py-2 rounded-md text-base font-medium text-slate-300 hover:bg-slate-700 hover:text-white <?= is_active($item['link'], $current_page) ? 'bg-slate-700 text-white' : '' ?>">
                                <i class="<?= $item['icon'] ?> fa-fw mr-2"></i>
                                <span><?= $item['label'] ?></span>
                            </a>
                        <?php endif; ?>
                    <?php endif; ?>
                <?php endforeach; ?>
            </div>
        </div>
    </nav>
    <div class="page-content">
    <?php if (isset($_SESSION['license_status'])): ?>
        <?php
            $license_status = $_SESSION['license_status'];
            $license_message = $_SESSION['license_message'];
            $max_devices = $_SESSION['license_max_devices'] ?? 0;
            $current_devices = $_SESSION['current_device_count'] ?? 0;
            $expires_at = $_SESSION['license_expires_at'] ?? null;
            $last_successful_verification = $_SESSION['last_successful_verification'] ?? null;

            $status_class = '';
            $status_icon = '';
            $display_message = '';

            switch ($license_status) {
                case 'active':
                case 'free':
                    $status_class = 'bg-green-500/20 text-green-400 border-green-500/30';
                    $status_icon = '<i class="fas fa-check-circle mr-1"></i>';
                    $display_message = ucfirst($license_status) . " License Active ({$current_devices}/{$max_devices} devices)";
                    if ($expires_at) {
                        $display_message .= " - Expires: " . date('Y-m-d', strtotime($expires_at));
                    }
                    break;
                case 'expired':
                case 'locally_expired': // New status
                    $status_class = 'bg-red-500/20 text-red-400 border-red-500/30';
                    $status_icon = '<i class="fas fa-exclamation-triangle mr-1"></i>';
                    $display_message = "License Expired! ({$license_message})";
                    break;
                case 'revoked':
                    $status_class = 'bg-red-500/20 text-red-400 border-red-500/30';
                    $status_icon = '<i class="fas fa-ban mr-1"></i>';
                    $display_message = "License Revoked! ({$license_message})";
                    break;
                case 'in_use':
                    $status_class = 'bg-red-500/20 text-red-400 border-red-500/30';
                    $status_icon = '<i class="fas fa-server mr-1"></i>';
                    $display_message = "License in use by another server! ({$license_message})";
                    break;
                case 'unconfigured':
                    $status_class = 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
                    $status_icon = '<i class="fas fa-exclamation-circle mr-1"></i>';
                    $display_message = "License Unconfigured! Please set up your license key.";
                    break;
                case 'unreachable': // New status
                case 'unreachable_long_term': // New status
                    $status_class = 'bg-orange-500/20 text-orange-400 border-orange-500/30';
                    $status_icon = '<i class="fas fa-cloud-offline mr-1"></i>';
                    $display_message = "License Portal Unreachable! ({$license_message})";
                    if ($last_successful_verification) {
                        $display_message .= " Last successful check: " . date('Y-m-d H:i', strtotime($last_successful_verification));
                    }
                    break;
                case 'invalid':
                case 'not_found':
                case 'error':
                default:
                    $status_class = 'bg-red-500/20 text-red-400 border-red-500/30';
                    $status_icon = '<i class="fas fa-times-circle mr-1"></i>';
                    $display_message = "License Invalid! ({$license_message})";
                    break;
            }
        ?>
        <div class="container mx-auto px-4 mt-4">
            <div class="p-3 rounded-lg text-sm flex items-center justify-between <?= $status_class ?>">
                <div><?= $status_icon ?> <?= htmlspecialchars($display_message) ?></div>
                <?php if ($license_status !== 'active' && $license_status !== 'free'): ?>
                    <a href="license_setup.php" class="text-cyan-400 hover:underline ml-4">Manage License</a>
                <?php endif; ?>
            </div>
        </div>
    <?php endif; ?>