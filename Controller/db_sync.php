<?php
/**
 * Unified MySQL sync endpoint connecting all 11 database tables
 * (users, categories, products, inventory_items, orders, order_items,
 * transactions, stock_movements, stock_requests, backups, shift_sales).
 */
require_once __DIR__ . '/../Model/config.php';

header('Content-Type: application/json; charset=utf-8');

function syncJson(int $code, array $payload): void
{
    http_response_code($code);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function toMysqlDateTime(?string $iso): string
{
    if (!$iso) {
        return date('Y-m-d H:i:s');
    }
    $ts = strtotime($iso);
    return $ts ? date('Y-m-d H:i:s', $ts) : date('Y-m-d H:i:s');
}

function fetchCupVariantsPayload(PDO $pdo): array
{
    $rows = $pdo->query("
        SELECT id, variant_key, name, category_note, quantity, minimum_quantity
        FROM cup_variants
        ORDER BY FIELD(variant_key, '16oz', '22oz', 'hot'), id ASC
    ")->fetchAll();

    return array_map(static fn($r) => [
        'id' => (int) $r['id'],
        'key' => $r['variant_key'],
        'name' => $r['name'],
        'usedFor' => $r['category_note'],
        'stock' => (int) $r['quantity'],
        'minStock' => (int) $r['minimum_quantity'],
    ], $rows);
}

function fetchProductsPayload(PDO $pdo): array
{
    $rows = $pdo->query("
        SELECT p.id, p.name, c.name AS category, p.price,
               p.venti_price,
               COALESCE(p.cup_variant, '16oz') AS cup_variant,
               p.hot_cup,
               p.iced_cup,
               COALESCE(cv.quantity, i.quantity, 0) AS stock,
               COALESCE(p.image, 'assets/2.png') AS image
        FROM products p
        JOIN categories c ON c.id = p.category_id
        LEFT JOIN cup_variants cv ON cv.variant_key = p.cup_variant
        LEFT JOIN inventory_items i ON i.product_id = p.id
        WHERE p.is_available = 1
        ORDER BY
            FIELD(c.name, 'Coffee', 'Frappe', 'Refresher', 'Non-coffee'),
            p.name ASC
    ")->fetchAll();

    return array_map(static fn($r) => [
        'id' => (int) $r['id'],
        'name' => $r['name'],
        'category' => $r['category'],
        'price' => (float) $r['price'],
        'ventiPrice' => $r['venti_price'] !== null ? (float) $r['venti_price'] : ($r['category'] === 'Refresher' ? round(((float) $r['price']) + 20, 2) : null),
        'cupVariant' => $r['cup_variant'] ?: '16oz',
        'hotCup' => $r['hot_cup'] !== null ? $r['hot_cup'] : ($r['category'] === 'Refresher' ? '16oz' : ($r['category'] === 'Coffee' || $r['category'] === 'Frappe' ? 'hot' : '')),
        'icedCup' => $r['iced_cup'] !== null ? $r['iced_cup'] : ($r['category'] === 'Refresher' ? '22oz' : ($r['category'] === 'Coffee' ? '16oz' : '')),
        'stock' => (int) $r['stock'],
        'image' => $r['image'] ?: 'assets/2.png',
    ], $rows);
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$action = $_GET['action'] ?? '';
$body = [];
if ($method === 'POST') {
    $raw = file_get_contents('php://input');
    $decoded = $raw ? json_decode($raw, true) : [];
    $body = is_array($decoded) ? $decoded : [];
}

try {
    $pdo = getDbConnection();

    // GET: Public product catalog & cup variants for customer ordering (order.php)
    if ($method === 'GET' && $action === 'get_products') {
        syncJson(200, [
            'ok' => true,
            'products' => fetchProductsPayload($pdo),
            'cupVariants' => fetchCupVariantsPayload($pdo),
        ]);
    }

    // GET: Single-call bootstrap of all core tables for POS/Admin/Barista
    if ($method === 'GET' && $action === 'bootstrap') {
        $users = $pdo->query("
            SELECT id, username, password_hash AS password, full_name, role, is_active
            FROM users
            ORDER BY id ASC
        ")->fetchAll();

        $products = fetchProductsPayload($pdo);
        $cupVariants = fetchCupVariantsPayload($pdo);

        $orderRows = $pdo->query("
            SELECT o.id AS db_id, o.order_number, o.customer_name, o.table_note,
                   o.cashier_id, u.username AS cashier_username, u.full_name AS cashier_name,
                   o.source, o.order_type, o.status, o.subtotal, o.tax, o.total, o.created_at,
                   (SELECT t.payment_method FROM transactions t WHERE t.order_id = o.id ORDER BY t.id DESC LIMIT 1) AS payment_method
            FROM orders o
            LEFT JOIN users u ON u.id = o.cashier_id
            ORDER BY o.id DESC
            LIMIT 150
        ")->fetchAll();

        $itemStmt = $pdo->prepare("
            SELECT oi.product_id, p.name, COALESCE(oi.cup_variant, p.cup_variant, '16oz') AS cup_variant,
                   oi.quantity, oi.unit_price, oi.line_total
            FROM order_items oi
            JOIN products p ON p.id = oi.product_id
            WHERE oi.order_id = ?
        ");

        $orders = [];
        foreach ($orderRows as $row) {
            $itemStmt->execute([(int) $row['db_id']]);
            $items = array_map(static fn($i) => [
                'productId' => (int) $i['product_id'],
                'name' => $i['name'],
                'cupVariant' => $i['cup_variant'] ?: '16oz',
                'quantity' => (int) $i['quantity'],
                'price' => (float) $i['unit_price'],
                'total' => (float) $i['line_total'],
            ], $itemStmt->fetchAll());

            $pm = strtolower((string) ($row['payment_method'] ?? 'cash'));
            $pmLabel = $pm === 'gcash' ? 'GCash' : ucfirst($pm);

            $orders[] = [
                'id' => $row['order_number'],
                'customerName' => $row['customer_name'] ?: 'Walk-in Customer',
                'tableNote' => $row['table_note'] ?: '',
                'source' => $row['source'] ?: 'pos',
                'orderType' => $row['order_type'] ?: 'dine-in',
                'status' => $row['status'] ?: 'pending',
                'paymentMethod' => $pmLabel,
                'cashierId' => $row['cashier_id'] ? (int) $row['cashier_id'] : null,
                'cashierUsername' => $row['cashier_username'] ?: '',
                'account' => $row['cashier_name'] ?: ($row['source'] === 'qr' ? 'QR Self-Order' : 'Barista'),
                'time' => date('c', strtotime($row['created_at'])),
                'items' => $items,
                'subtotal' => (float) $row['subtotal'],
                'tax' => (float) $row['tax'],
                'total' => (float) $row['total'],
            ];
        }

        $reqRows = $pdo->query("
            SELECT sr.id, sr.cup_variant, cv.name AS cup_name, ii.product_id, p.name AS product_name, sr.quantity,
                   COALESCE(u.full_name, 'Barista') AS requested_by,
                   sr.status, sr.created_at
            FROM stock_requests sr
            LEFT JOIN cup_variants cv ON cv.variant_key = sr.cup_variant
            LEFT JOIN inventory_items ii ON ii.id = sr.inventory_item_id
            LEFT JOIN products p ON p.id = ii.product_id
            LEFT JOIN users u ON u.id = sr.requested_by
            ORDER BY sr.id DESC
            LIMIT 100
        ")->fetchAll();

        $restockRequests = array_map(static fn($r) => [
            'id' => 'RR-' . $r['id'],
            'dbId' => (int) $r['id'],
            'cupVariant' => $r['cup_variant'] ?: '16oz',
            'productId' => (int) ($r['product_id'] ?? 0),
            'productName' => $r['cup_name'] ?: ($r['product_name'] ?: '16oz Cup'),
            'quantity' => (float) $r['quantity'],
            'requestedBy' => $r['requested_by'],
            'status' => ucfirst((string) $r['status']),
            'requestedAt' => date('c', strtotime($r['created_at'])),
            'approvedAt' => $r['status'] !== 'pending' ? date('c', strtotime($r['created_at'])) : null,
        ], $reqRows);

        $shiftRows = $pdo->query("
            SELECT id, shift_key, cashier_id, account_name, shift_started_at, logged_out_at,
                   total_orders, total_items, cash_total, gcash_total, other_total, total_sales
            FROM shift_sales
            ORDER BY id DESC
            LIMIT 100
        ")->fetchAll();

        $shiftSales = array_map(static fn($s) => [
            'id' => (int) $s['id'],
            'shift_key' => $s['shift_key'],
            'cashier_id' => $s['cashier_id'] ? (int) $s['cashier_id'] : null,
            'account_name' => $s['account_name'],
            'shift_started_at' => $s['shift_started_at'],
            'logged_out_at' => $s['logged_out_at'],
            'total_orders' => (int) $s['total_orders'],
            'total_items' => (int) $s['total_items'],
            'cash_total' => (float) $s['cash_total'],
            'gcash_total' => (float) $s['gcash_total'],
            'other_total' => (float) $s['other_total'],
            'total_sales' => (float) $s['total_sales'],
        ], $shiftRows);

        syncJson(200, [
            'ok' => true,
            'users' => $users,
            'products' => $products,
            'cupVariants' => $cupVariants,
            'orders' => $orders,
            'restockRequests' => $restockRequests,
            'shiftSales' => $shiftSales,
        ]);
    }

    // POST: Create user in `users`
    if ($method === 'POST' && $action === 'create_user') {
        $username = trim((string) ($body['username'] ?? ''));
        $fullName = trim((string) ($body['fullName'] ?? ''));
        $password = (string) ($body['password'] ?? '');
        $role = ($body['role'] ?? 'cashier') === 'admin' ? 'admin' : 'cashier';

        if ($username === '' || $fullName === '' || $password === '') {
            syncJson(400, ['ok' => false, 'error' => 'Full name, username, and password are required.']);
        }

        $stmt = $pdo->prepare("
            INSERT INTO users (username, password_hash, full_name, role, is_active)
            VALUES (?, ?, ?, ?, 1)
        ");
        $stmt->execute([$username, $password, $fullName, $role]);
        syncJson(200, ['ok' => true, 'id' => (int) $pdo->lastInsertId()]);
    }

    // POST: Toggle `users.is_active`
    if ($method === 'POST' && $action === 'toggle_user') {
        $id = (int) ($body['id'] ?? 0);
        $isActive = !empty($body['is_active']) ? 1 : 0;
        $stmt = $pdo->prepare("UPDATE users SET is_active = ? WHERE id = ? AND LOWER(username) <> 'admin'");
        $stmt->execute([$isActive, $id]);
        syncJson(200, ['ok' => true]);
    }

    // POST: Update `users.password_hash`
    if ($method === 'POST' && $action === 'change_password') {
        $id = (int) ($body['id'] ?? 0);
        $newPassword = (string) ($body['newPassword'] ?? '');
        if (strlen($newPassword) < 4) {
            syncJson(400, ['ok' => false, 'error' => 'New password must be at least 4 characters.']);
        }
        $stmt = $pdo->prepare("UPDATE users SET password_hash = ? WHERE id = ?");
        $stmt->execute([$newPassword, $id]);
        syncJson(200, ['ok' => true]);
    }

    // POST: Save / update product in `categories`, `products`, `inventory_items`, `stock_movements`
    if ($method === 'POST' && $action === 'save_product') {
        $id = !empty($body['id']) ? (int) $body['id'] : 0;
        $name = trim((string) ($body['name'] ?? ''));
        $category = trim((string) ($body['category'] ?? 'Coffee')) ?: 'Coffee';
        $price = round((float) ($body['price'] ?? 0), 2);
        $ventiPrice = isset($body['ventiPrice']) && $body['ventiPrice'] !== '' && $body['ventiPrice'] !== null
            ? round((float) $body['ventiPrice'], 2)
            : ($category === 'Refresher' ? round($price + 20, 2) : null);
        $hotCup = isset($body['hotCup']) ? trim((string) $body['hotCup']) : '';
        $icedCup = isset($body['icedCup']) ? trim((string) $body['icedCup']) : '';
        $cupVariant = in_array($body['cupVariant'] ?? '', ['16oz', '22oz', 'hot'], true)
            ? (string) $body['cupVariant']
            : ($category === 'Refresher' ? ($icedCup ?: '22oz') : ($hotCup ?: 'hot'));
        $stock = max(0, (int) ($body['stock'] ?? 0));
        $image = trim((string) ($body['image'] ?? 'assets/2.png')) ?: 'assets/2.png';
        $userId = !empty($body['userId']) ? (int) $body['userId'] : null;

        if ($name === '' || $price <= 0) {
            syncJson(400, ['ok' => false, 'error' => 'Valid product name and price are required.']);
        }

        $pdo->prepare("INSERT IGNORE INTO categories (name) VALUES (?)")->execute([$category]);
        $catStmt = $pdo->prepare("SELECT id FROM categories WHERE name = ?");
        $catStmt->execute([$category]);
        $categoryId = (int) $catStmt->fetchColumn();

        if ($id > 0) {
            $chk = $pdo->prepare("SELECT id FROM products WHERE id = ?");
            $chk->execute([$id]);
            $exists = (bool) $chk->fetchColumn();
        } else {
            $exists = false;
        }

        if ($exists) {
            $pdo->prepare("UPDATE products SET category_id = ?, name = ?, price = ?, venti_price = ?, cup_variant = ?, hot_cup = ?, iced_cup = ?, image = ?, is_available = 1 WHERE id = ?")
                ->execute([$categoryId, $name, $price, $ventiPrice, $cupVariant, $hotCup ?: null, $icedCup ?: null, $image, $id]);
        } else {
            $pdo->prepare("INSERT INTO products (category_id, name, price, venti_price, cup_variant, hot_cup, iced_cup, image, is_available) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1)")
                ->execute([$categoryId, $name, $price, $ventiPrice, $cupVariant, $hotCup ?: null, $icedCup ?: null, $image]);
            $id = (int) $pdo->lastInsertId();
        }

        $invStmt = $pdo->prepare("SELECT id, quantity FROM inventory_items WHERE product_id = ?");
        $invStmt->execute([$id]);
        $inv = $invStmt->fetch();
        $oldQty = $inv ? (int) $inv['quantity'] : 0;

        if ($inv) {
            $pdo->prepare("UPDATE inventory_items SET quantity = ? WHERE id = ?")->execute([$stock, (int) $inv['id']]);
            $invId = (int) $inv['id'];
        } else {
            $pdo->prepare("INSERT INTO inventory_items (product_id, quantity, minimum_quantity) VALUES (?, ?, 5)")
                ->execute([$id, $stock]);
            $invId = (int) $pdo->lastInsertId();
        }

        $delta = $stock - $oldQty;
        if ($delta !== 0) {
            $pdo->prepare("INSERT INTO stock_movements (inventory_item_id, user_id, movement_type, quantity, notes) VALUES (?, ?, 'adjustment', ?, 'Inventory update')")
                ->execute([$invId, $userId, $delta]);
        }

        syncJson(200, ['ok' => true, 'id' => $id]);
    }

    // POST: Soft-delete product (`is_available = 0`) so order history remains intact
    if ($method === 'POST' && $action === 'delete_product') {
        $id = (int) ($body['id'] ?? 0);
        if ($id <= 0) {
            syncJson(400, ['ok' => false, 'error' => 'Valid product ID required.']);
        }
        $pdo->prepare("UPDATE products SET is_available = 0 WHERE id = ?")->execute([$id]);
        syncJson(200, ['ok' => true]);
    }

    // POST: Save / update cup variant stock in `cup_variants`
    if ($method === 'POST' && $action === 'save_cup_variant') {
        $key = trim((string) ($body['key'] ?? ''));
        $stock = max(0, (int) ($body['stock'] ?? 0));
        $minStock = max(0, (int) ($body['minStock'] ?? 10));
        if (!in_array($key, ['16oz', '22oz', 'hot'], true)) {
            syncJson(400, ['ok' => false, 'error' => 'Invalid cup variant key.']);
        }
        $pdo->prepare("UPDATE cup_variants SET quantity = ?, minimum_quantity = ? WHERE variant_key = ?")
            ->execute([$stock, $minStock, $key]);
        syncJson(200, ['ok' => true]);
    }

    // POST: Save order into `orders`, `order_items`, `transactions`
    if ($method === 'POST' && $action === 'save_order') {
        $orderNumber = trim((string) ($body['id'] ?? ''));
        if ($orderNumber === '') {
            syncJson(400, ['ok' => false, 'error' => 'Missing order number.']);
        }

        $chk = $pdo->prepare("SELECT id FROM orders WHERE order_number = ?");
        $chk->execute([$orderNumber]);
        $orderId = (int) $chk->fetchColumn();

        $cashierId = !empty($body['cashierId']) ? (int) $body['cashierId'] : null;
        if ($cashierId !== null) {
            $uChk = $pdo->prepare("SELECT id FROM users WHERE id = ?");
            $uChk->execute([$cashierId]);
            if (!$uChk->fetchColumn()) {
                $cashierId = null;
            }
        }

        $customerName = trim((string) ($body['customerName'] ?? 'Walk-in Customer')) ?: 'Walk-in Customer';
        $tableNote = trim((string) ($body['tableNote'] ?? ''));
        $source = ($body['source'] ?? 'pos') === 'qr' ? 'qr' : 'pos';
        $orderType = ($body['orderType'] ?? 'dine-in') === 'take-out' ? 'take-out' : 'dine-in';
        $status = (string) ($body['status'] ?? 'pending');
        if (!in_array($status, ['pending', 'queue', 'preparing', 'completed', 'cancelled'], true)) {
            $status = 'pending';
        }
        $subtotal = round((float) ($body['subtotal'] ?? 0), 2);
        $tax = round((float) ($body['tax'] ?? 0), 2);
        $total = round((float) ($body['total'] ?? 0), 2);
        $createdAt = toMysqlDateTime($body['time'] ?? null);

        if (!$orderId) {
            $pdo->prepare("
                INSERT INTO orders (order_number, customer_name, table_note, cashier_id, source, order_type, status, subtotal, tax, total, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ")->execute([$orderNumber, $customerName, $tableNote, $cashierId, $source, $orderType, $status, $subtotal, $tax, $total, $createdAt]);
            $orderId = (int) $pdo->lastInsertId();

            $itemIns = $pdo->prepare("
                INSERT INTO order_items (order_id, product_id, cup_variant, quantity, unit_price, line_total)
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            $pChk = $pdo->prepare("SELECT id, cup_variant FROM products WHERE id = ?");
            foreach (($body['items'] ?? []) as $item) {
                $pid = (int) ($item['productId'] ?? 0);
                $pChk->execute([$pid]);
                $pRow = $pChk->fetch();
                if (!$pRow) {
                    continue;
                }
                $cupVar = in_array($item['cupVariant'] ?? '', ['16oz', '22oz', 'hot'], true)
                    ? (string) $item['cupVariant']
                    : ($pRow['cup_variant'] ?: '16oz');
                $qty = max(1, (int) ($item['quantity'] ?? 1));
                $price = round((float) ($item['price'] ?? 0), 2);
                $lineTotal = round((float) ($item['total'] ?? ($price * $qty)), 2);
                $itemIns->execute([$orderId, $pid, $cupVar, $qty, $price, $lineTotal]);
            }

            $pm = strtolower(trim((string) ($body['paymentMethod'] ?? 'cash')));
            if (!in_array($pm, ['cash', 'card', 'gcash', 'other'], true)) {
                $pm = 'other';
            }
            $pdo->prepare("
                INSERT INTO transactions (order_id, cashier_id, payment_method, amount, created_at)
                VALUES (?, ?, ?, ?, ?)
            ")->execute([$orderId, $cashierId, $pm, $total, $createdAt]);
        }

        syncJson(200, ['ok' => true, 'orderId' => $orderId]);
    }

    // POST: Update `orders.status` and deduct `inventory_items` + log `stock_movements` when approved
    if ($method === 'POST' && $action === 'update_order_status') {
        $orderNumber = trim((string) ($body['id'] ?? ''));
        $nextStatus = trim((string) ($body['status'] ?? ''));
        $userId = !empty($body['userId']) ? (int) $body['userId'] : null;

        if ($orderNumber === '' || !in_array($nextStatus, ['pending', 'queue', 'preparing', 'completed', 'cancelled'], true)) {
            syncJson(400, ['ok' => false, 'error' => 'Invalid order status update.']);
        }

        $oStmt = $pdo->prepare("SELECT id, status FROM orders WHERE order_number = ?");
        $oStmt->execute([$orderNumber]);
        $order = $oStmt->fetch();
        if (!$order) {
            syncJson(404, ['ok' => false, 'error' => 'Order not found in database.']);
        }

        $prevStatus = (string) $order['status'];
        $pdo->prepare("UPDATE orders SET status = ? WHERE id = ?")->execute([$nextStatus, (int) $order['id']]);

        // Deduct cup-variant inventory once when moving from pending -> queue, or restore on cancel
        if ($prevStatus === 'pending' && $nextStatus === 'queue') {
            $items = $pdo->prepare("
                SELECT oi.product_id, oi.quantity, COALESCE(oi.cup_variant, p.cup_variant, '16oz') AS cup_variant
                FROM order_items oi
                JOIN products p ON p.id = oi.product_id
                WHERE oi.order_id = ?
            ");
            $items->execute([(int) $order['id']]);
            $invQ = $pdo->prepare("SELECT id FROM inventory_items WHERE product_id = ?");
            $mvIns = $pdo->prepare("INSERT INTO stock_movements (inventory_item_id, user_id, movement_type, quantity, notes) VALUES (?, ?, 'usage', ?, ?)");
            $cupDed = $pdo->prepare("UPDATE cup_variants SET quantity = GREATEST(0, quantity - ?) WHERE variant_key = ?");
            foreach ($items->fetchAll() as $it) {
                $pid = (int) $it['product_id'];
                $qty = (int) $it['quantity'];
                $cupVar = (string) $it['cup_variant'];
                $cupDed->execute([$qty, $cupVar]);
                $invQ->execute([$pid]);
                $invId = (int) $invQ->fetchColumn();
                if ($invId > 0) {
                    $mvIns->execute([$invId, $userId, -$qty, 'Order ' . $orderNumber . ' (' . $cupVar . ')']);
                }
            }
        } elseif (($prevStatus === 'queue' || $prevStatus === 'preparing') && $nextStatus === 'cancelled') {
            $items = $pdo->prepare("
                SELECT oi.product_id, oi.quantity, COALESCE(oi.cup_variant, p.cup_variant, '16oz') AS cup_variant
                FROM order_items oi
                JOIN products p ON p.id = oi.product_id
                WHERE oi.order_id = ?
            ");
            $items->execute([(int) $order['id']]);
            $cupAdd = $pdo->prepare("UPDATE cup_variants SET quantity = quantity + ? WHERE variant_key = ?");
            foreach ($items->fetchAll() as $it) {
                $cupAdd->execute([(int) $it['quantity'], (string) $it['cup_variant']]);
            }
        }

        syncJson(200, ['ok' => true]);
    }

    // POST: Create restock request in `stock_requests` and `stock_movements` (cup-variant or product)
    if ($method === 'POST' && $action === 'create_restock_request') {
        $cupVariant = trim((string) ($body['cupVariant'] ?? ''));
        $productId = (int) ($body['productId'] ?? 0);
        $quantity = (float) ($body['quantity'] ?? 0);
        $userId = !empty($body['userId']) ? (int) $body['userId'] : null;

        if ($quantity <= 0 || (!in_array($cupVariant, ['16oz', '22oz', 'hot'], true) && $productId <= 0)) {
            syncJson(400, ['ok' => false, 'error' => 'Valid cup variant and quantity required.']);
        }

        if ($productId > 0) {
            $invStmt = $pdo->prepare("SELECT id FROM inventory_items WHERE product_id = ?");
            $invStmt->execute([$productId]);
            $invId = (int) $invStmt->fetchColumn();
        } else {
            $invId = (int) $pdo->query("SELECT id FROM inventory_items ORDER BY id ASC LIMIT 1")->fetchColumn();
        }

        if (!$invId) {
            $firstProdId = (int) $pdo->query("SELECT id FROM products ORDER BY id ASC LIMIT 1")->fetchColumn();
            if ($firstProdId > 0) {
                $pdo->prepare("INSERT INTO inventory_items (product_id, quantity, minimum_quantity) VALUES (?, 0, 5)")
                    ->execute([$firstProdId]);
                $invId = (int) $pdo->lastInsertId();
            }
        }

        if (!$userId) {
            $userId = (int) $pdo->query("SELECT id FROM users ORDER BY id ASC LIMIT 1")->fetchColumn();
        }

        $pdo->prepare("INSERT INTO stock_requests (inventory_item_id, cup_variant, requested_by, quantity, status) VALUES (?, ?, ?, ?, 'pending')")
            ->execute([$invId, $cupVariant !== '' ? $cupVariant : null, $userId, $quantity]);
        $reqId = (int) $pdo->lastInsertId();

        if ($invId > 0) {
            $pdo->prepare("INSERT INTO stock_movements (inventory_item_id, user_id, movement_type, quantity, notes) VALUES (?, ?, 'request', ?, ?)")
                ->execute([$invId, $userId, $quantity, 'Restock request RR-' . $reqId . ($cupVariant ? " ($cupVariant)" : '')]);
        }

        syncJson(200, ['ok' => true, 'dbId' => $reqId, 'id' => 'RR-' . $reqId]);
    }

    // POST: Approve/reject `stock_requests`, update `cup_variants` / `inventory_items` + `stock_movements`
    if ($method === 'POST' && $action === 'resolve_restock_request') {
        $dbId = (int) ($body['dbId'] ?? 0);
        $decision = ($body['decision'] ?? '') === 'approve' ? 'approved' : 'rejected';
        $userId = !empty($body['userId']) ? (int) $body['userId'] : null;

        $srStmt = $pdo->prepare("SELECT id, inventory_item_id, cup_variant, quantity, status FROM stock_requests WHERE id = ?");
        $srStmt->execute([$dbId]);
        $sr = $srStmt->fetch();
        if (!$sr || $sr['status'] !== 'pending') {
            syncJson(404, ['ok' => false, 'error' => 'Pending restock request not found.']);
        }

        $pdo->prepare("UPDATE stock_requests SET status = ? WHERE id = ?")->execute([$decision, $dbId]);

        if ($decision === 'approved') {
            $qty = (float) $sr['quantity'];
            $invId = (int) $sr['inventory_item_id'];
            $cupVariant = (string) ($sr['cup_variant'] ?? '');
            if (in_array($cupVariant, ['16oz', '22oz', 'hot'], true)) {
                $pdo->prepare("UPDATE cup_variants SET quantity = quantity + ? WHERE variant_key = ?")->execute([(int) $qty, $cupVariant]);
            } elseif ($invId > 0) {
                $pdo->prepare("UPDATE inventory_items SET quantity = quantity + ? WHERE id = ?")->execute([$qty, $invId]);
            }
            if ($invId > 0) {
                $pdo->prepare("INSERT INTO stock_movements (inventory_item_id, user_id, movement_type, quantity, notes) VALUES (?, ?, 'restock', ?, ?)")
                    ->execute([$invId, $userId, $qty, 'Approved restock RR-' . $dbId . ($cupVariant ? " ($cupVariant)" : '')]);
            }
        }

        syncJson(200, ['ok' => true]);
    }

    // POST: Log backup in `backups`
    if ($method === 'POST' && $action === 'log_backup') {
        $userId = !empty($body['userId']) ? (int) $body['userId'] : null;
        $fileName = trim((string) ($body['fileName'] ?? 'voodoo-backup.json'));
        $fileSizeKb = max(1, (int) ($body['fileSizeKb'] ?? 1));

        $pdo->prepare("INSERT INTO backups (created_by, file_name, file_size_kb) VALUES (?, ?, ?)")
            ->execute([$userId, $fileName, $fileSizeKb]);

        syncJson(200, ['ok' => true, 'id' => (int) $pdo->lastInsertId()]);
    }

    syncJson(404, ['ok' => false, 'error' => 'Unknown sync action.']);
} catch (Throwable $e) {
    syncJson(500, ['ok' => false, 'error' => $e->getMessage()]);
}
