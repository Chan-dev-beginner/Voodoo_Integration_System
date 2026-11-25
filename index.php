<?php
require_once __DIR__ . '/Model/config.php';

if (($_GET['mode'] ?? '') === 'order') {
    header('Location: order.php');
    exit;
}

require_once __DIR__ . '/View/index.php';
?>
