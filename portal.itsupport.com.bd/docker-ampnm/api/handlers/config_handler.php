<?php
// This file is included by api.php and assumes $action is available.

if ($action === 'get_app_config') {
    echo json_encode([
        'LICENSE_API_URL' => getenv('LICENSE_API_URL') ?: '',
        'APP_LICENSE_KEY' => getenv('APP_LICENSE_KEY') ?: ''
    ]);
    exit;
}
?>