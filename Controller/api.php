<?php
/**
 * API endpoint reserved strictly for the upcoming Sales Forecasting module.
 * All core POS, Ordering, Inventory, Accounts, and Shift Records run locally in JS/localStorage.
 */
require_once __DIR__ . '/../Model/config.php';

header('Content-Type: application/json; charset=utf-8');

$action = $_GET['action'] ?? '';
if ($action === 'sales_forecast') {
    http_response_code(501);
    echo json_encode([
        'ok' => false,
        'error' => 'Sales Forecasting API endpoint is reserved and ready for implementation.',
    ]);
    exit;
}

http_response_code(404);
echo json_encode([
    'ok' => false,
    'error' => 'API usage is reserved strictly for Sales Forecasting.',
]);
