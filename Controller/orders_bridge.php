<?php
/**
 * Lightweight bridge for QR customer orders, barista online/offline gating,
 * and transferring barista shift sales to the MySQL database.
 */
require_once __DIR__ . '/../Model/config.php';

header('Content-Type: application/json; charset=utf-8');

$dataDir = __DIR__ . '/../data';
if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0755, true);
}

$ordersFile = $dataDir . '/qr_orders.json';
$sessionFile = $dataDir . '/barista_session.json';
$shiftArchiveFile = $dataDir . '/shift_sales_archive.json';

function readJsonFile(string $file, array $default = []): array
{
    if (!is_file($file)) return $default;
    $data = @json_decode((string) file_get_contents($file), true);
    return is_array($data) ? $data : $default;
}

function writeJsonFile(string $file, array $data): void
{
    $tmp = $file . '.tmp';
    file_put_contents($tmp, json_encode($data, JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT));
    rename($tmp, $file);
}

function archiveAllQrOrders(string $ordersFile): int
{
    $orders = readJsonFile($ordersFile, []);
    $count = 0;
    foreach ($orders as &$order) {
        if (empty($order['archived'])) {
            $order['archived'] = true;
            $order['archivedAt'] = date('c');
            $count++;
        }
    }
    unset($order);
    if ($count > 0) {
        writeJsonFile($ordersFile, $orders);
    }
    return $count;
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';

// GET: Check whether any barista is currently logged in
if ($method === 'GET' && $action === 'barista_status') {
    $session = readJsonFile($sessionFile, ['loggedIn' => false, 'baristaName' => '', 'username' => '', 'since' => null]);
    echo json_encode([
        'ok' => true,
        'loggedIn' => !empty($session['loggedIn']),
        'baristaName' => (string) ($session['baristaName'] ?? ''),
        'since' => $session['since'] ?? null,
    ]);
    exit;
}

// POST: Barista logs in -> enable customer ordering & archive any previous shift QR orders
if ($method === 'POST' && $action === 'barista_login') {
    $body = json_decode((string) file_get_contents('php://input'), true) ?: [];
    $archivedCount = archiveAllQrOrders($ordersFile);
    $session = [
        'loggedIn' => true,
        'username' => (string) ($body['username'] ?? 'barista'),
        'baristaName' => (string) ($body['name'] ?? 'Barista'),
        'since' => date('c'),
    ];
    writeJsonFile($sessionFile, $session);
    echo json_encode(['ok' => true, 'session' => $session, 'archivedCount' => $archivedCount]);
    exit;
}

// POST: Barista logs out or times out -> disable customer ordering (and optionally archive)
if ($method === 'POST' && $action === 'barista_logout') {
    $body = json_decode((string) file_get_contents('php://input'), true) ?: [];
    $archivedCount = !empty($body['archive']) ? archiveAllQrOrders($ordersFile) : 0;
    $session = [
        'loggedIn' => false,
        'username' => '',
        'baristaName' => '',
        'since' => null,
        'loggedOutAt' => date('c'),
    ];
    writeJsonFile($sessionFile, $session);
    echo json_encode(['ok' => true, 'archivedCount' => $archivedCount]);
    exit;
}

// POST: Save / transfer shift sales record to MySQL shift_sales table (with JSON backup)
if ($method === 'POST' && $action === 'save_shift_sales') {
    $body = json_decode((string) file_get_contents('php://input'), true) ?: [];
    $shiftKey = trim((string) ($body['shift_key'] ?? ''));
    $accountName = trim((string) ($body['account_name'] ?? 'Barista'));
    if ($shiftKey === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Missing shift_key.']);
        exit;
    }

    $toMysqlDt = static function (?string $iso): string {
        if (!$iso) return date('Y-m-d H:i:s');
        $ts = strtotime($iso);
        return $ts ? date('Y-m-d H:i:s', $ts) : date('Y-m-d H:i:s');
    };

    $startedAt = $toMysqlDt($body['shift_started_at'] ?? null);
    $endedAt = $toMysqlDt($body['logged_out_at'] ?? null);
    $totalOrders = (int) ($body['total_orders'] ?? 0);
    $totalItems = (int) ($body['total_items'] ?? 0);
    $cashTotal = round((float) ($body['cash_total'] ?? 0), 2);
    $gcashTotal = round((float) ($body['gcash_total'] ?? 0), 2);
    $otherTotal = round((float) ($body['other_total'] ?? 0), 2);
    $totalSales = round((float) ($body['total_sales'] ?? 0), 2);
    $cashierId = !empty($body['cashier_id']) ? (int) $body['cashier_id'] : null;

    $dbSaved = false;
    $dbError = null;
    try {
        $pdo = getDbConnection();
        if ($cashierId !== null) {
            $chk = $pdo->prepare('SELECT id FROM users WHERE id = ?');
            $chk->execute([$cashierId]);
            if (!$chk->fetch()) $cashierId = null;
        }
        $stmt = $pdo->prepare("
            INSERT INTO shift_sales
              (shift_key, cashier_id, account_name, shift_started_at, logged_out_at,
               total_orders, total_items, cash_total, gcash_total, other_total, total_sales)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON DUPLICATE KEY UPDATE
              logged_out_at = VALUES(logged_out_at),
              total_orders = VALUES(total_orders),
              total_items = VALUES(total_items),
              cash_total = VALUES(cash_total),
              gcash_total = VALUES(gcash_total),
              other_total = VALUES(other_total),
              total_sales = VALUES(total_sales)
        ");
        $stmt->execute([
            $shiftKey, $cashierId, $accountName, $startedAt, $endedAt,
            $totalOrders, $totalItems, $cashTotal, $gcashTotal, $otherTotal, $totalSales,
        ]);
        $dbSaved = true;
    } catch (Throwable $e) {
        $dbError = $e->getMessage();
    }

    // Also mirror in local JSON archive
    $archive = readJsonFile($shiftArchiveFile, []);
    $archive[$shiftKey] = [
        'shift_key' => $shiftKey,
        'account_name' => $accountName,
        'shift_started_at' => $startedAt,
        'logged_out_at' => $endedAt,
        'total_orders' => $totalOrders,
        'total_items' => $totalItems,
        'cash_total' => $cashTotal,
        'gcash_total' => $gcashTotal,
        'other_total' => $otherTotal,
        'total_sales' => $totalSales,
    ];
    writeJsonFile($shiftArchiveFile, $archive);

    echo json_encode(['ok' => true, 'dbSaved' => $dbSaved, 'dbError' => $dbError]);
    exit;
}

// POST: Customer submits a new QR order (only when a barista is logged in)
if ($method === 'POST' && $action === 'place') {
    $session = readJsonFile($sessionFile, ['loggedIn' => false]);
    if (empty($session['loggedIn'])) {
        http_response_code(403);
        echo json_encode(['ok' => false, 'error' => 'Ordering is unavailable until a barista logs in.']);
        exit;
    }

    $body = json_decode((string) file_get_contents('php://input'), true);
    if (!is_array($body) || empty($body['id']) || empty($body['items'])) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Invalid order data.']);
        exit;
    }

    $orders = readJsonFile($ordersFile, []);
    foreach ($orders as $existing) {
        if (($existing['id'] ?? '') === $body['id']) {
            echo json_encode(['ok' => true, 'duplicate' => true, 'order' => $existing]);
            exit;
        }
    }

    $body['receivedAt'] = date('c');
    $body['archived'] = false;
    $orders[] = $body;
    writeJsonFile($ordersFile, $orders);

    echo json_encode(['ok' => true, 'order' => $body]);
    exit;
}

// GET: Barista polls for active (non-archived) QR orders
if ($method === 'GET' && $action === 'poll') {
    $orders = array_values(array_filter(
        readJsonFile($ordersFile, []),
        static fn(array $o): bool => empty($o['archived'])
    ));
    echo json_encode(['ok' => true, 'orders' => $orders]);
    exit;
}

// POST: Barista updates order status (approve, prepare, complete, cancel)
if ($method === 'POST' && $action === 'update_status') {
    $body = json_decode((string) file_get_contents('php://input'), true);
    $orderId = $body['id'] ?? '';
    $newStatus = $body['status'] ?? '';

    if (!$orderId || !$newStatus) {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Missing order id or status.']);
        exit;
    }

    $orders = readJsonFile($ordersFile, []);
    $found = false;
    foreach ($orders as &$order) {
        if (($order['id'] ?? '') === $orderId && empty($order['archived'])) {
            $order['status'] = $newStatus;
            $order['updatedAt'] = date('c');
            $found = true;
            break;
        }
    }
    unset($order);

    if (!$found) {
        http_response_code(404);
        echo json_encode(['ok' => false, 'error' => 'Order not found.']);
        exit;
    }

    writeJsonFile($ordersFile, $orders);
    echo json_encode(['ok' => true]);
    exit;
}

// GET: Customer checks their active order status by name (or order id)
if ($method === 'GET' && $action === 'track') {
    $nameQuery = trim((string) ($_GET['name'] ?? ($_GET['id'] ?? '')));
    if ($nameQuery === '') {
        http_response_code(400);
        echo json_encode(['ok' => false, 'error' => 'Missing customer name or order id.']);
        exit;
    }

    $orders = readJsonFile($ordersFile, []);
    $needle = strtolower($nameQuery);
    foreach (array_reverse($orders) as $order) {
        if (!empty($order['archived'])) continue;
        $orderName = strtolower(trim((string) ($order['customerName'] ?? '')));
        $orderId = strtolower(trim((string) ($order['id'] ?? '')));
        if (($orderName !== '' && $orderName === $needle) || ($orderId !== '' && $orderId === $needle)) {
            echo json_encode(['ok' => true, 'order' => $order]);
            exit;
        }
    }

    http_response_code(404);
    echo json_encode(['ok' => false, 'error' => 'No active order found for that name.']);
    exit;
}

http_response_code(400);
echo json_encode(['ok' => false, 'error' => 'Unknown action.']);
