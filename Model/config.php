<?php
// Shared application configuration and database connection.
date_default_timezone_set('Asia/Manila');

if (!defined('APP_TITLE')) {
    define('APP_TITLE', 'Voodoo eSports Café');
}

$httpHost = strtolower((string) ($_SERVER['HTTP_HOST'] ?? 'localhost'));
$isLocalHost = str_contains($httpHost, 'localhost')
    || str_contains($httpHost, '127.0.0.1')
    || str_contains($httpHost, '[::1]');

if (!defined('DB_HOST')) {
    define('DB_HOST', getenv('VOODOO_DB_HOST') ?: ($isLocalHost ? '127.0.0.1' : 'sql210.infinityfree.com'));
}
if (!defined('DB_NAME')) {
    define('DB_NAME', getenv('VOODOO_DB_NAME') ?: ($isLocalHost ? 'voodoo_esports_cafe' : 'if0_43532033_voodoo_esports_cafe'));
}
if (!defined('DB_USER')) {
    define('DB_USER', getenv('VOODOO_DB_USER') ?: ($isLocalHost ? 'root' : 'if0_43532033'));
}
if (!defined('DB_PASS')) {
    define('DB_PASS', getenv('VOODOO_DB_PASS') ?: ($isLocalHost ? '' : 'VoodooCafeImus'));
}

/**
 * Return a shared PDO connection and ensure sales-record & order-queue schema prerequisites exist.
 */
function getDbConnection(): PDO
{
    static $pdo = null;
    if ($pdo instanceof PDO) {
        return $pdo;
    }

    $dsn = sprintf('mysql:host=%s;dbname=%s;charset=utf8mb4', DB_HOST, DB_NAME);
    $pdo = new PDO($dsn, DB_USER, DB_PASS, [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
    ]);
    $pdo->exec("SET time_zone = '+08:00'");

    ensureSalesSchema($pdo);
    return $pdo;
}

/**
 * Ensure tables, columns, and default users required for live queue and shift sales exist.
 */
function ensureSalesSchema(PDO $pdo): void
{
    $statusCol = $pdo->query("SHOW COLUMNS FROM orders LIKE 'status'")->fetch();
    $statusType = strtolower((string) ($statusCol['Type'] ?? ''));
    if (!str_contains($statusType, "'queue'") || !str_contains($statusType, "'pending'")) {
        $pdo->exec("
            ALTER TABLE orders
            MODIFY COLUMN status ENUM('pending', 'queue', 'preparing', 'completed', 'cancelled')
            NOT NULL DEFAULT 'pending'
        ");
    }

    if (!$pdo->query("SHOW COLUMNS FROM orders LIKE 'table_note'")->fetch()) {
        $pdo->exec("ALTER TABLE orders ADD COLUMN table_note VARCHAR(50) NULL AFTER customer_name");
    }

    if (!$pdo->query("SHOW COLUMNS FROM orders LIKE 'source'")->fetch()) {
        $pdo->exec("ALTER TABLE orders ADD COLUMN source ENUM('pos', 'qr') NOT NULL DEFAULT 'pos' AFTER cashier_id");
    }

    $pdo->exec("
        CREATE TABLE IF NOT EXISTS shift_sales (
            id INT AUTO_INCREMENT PRIMARY KEY,
            shift_key VARCHAR(80) NOT NULL UNIQUE,
            cashier_id INT NULL,
            account_name VARCHAR(100) NOT NULL,
            shift_started_at DATETIME NOT NULL,
            logged_out_at DATETIME NOT NULL,
            total_orders INT NOT NULL DEFAULT 0,
            total_items INT NOT NULL DEFAULT 0,
            cash_total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            gcash_total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            other_total DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            total_sales DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            FOREIGN KEY (cashier_id) REFERENCES users(id)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $userRoleCol = $pdo->query("SHOW COLUMNS FROM users LIKE 'role'")->fetch();
    $userRoleType = strtolower((string) ($userRoleCol['Type'] ?? ''));
    if (!str_contains($userRoleType, "'barista'")) {
        $pdo->exec("
            ALTER TABLE users
            MODIFY COLUMN role ENUM('admin', 'cashier', 'barista', 'inventory', 'customer') NOT NULL
        ");
    }

    $seedUser = $pdo->prepare("
        INSERT IGNORE INTO users (username, password_hash, full_name, role, is_active)
        VALUES (?, ?, ?, ?, 1)
    ");
    $seedUser->execute(['admin', 'admin', 'Admin', 'admin']);
    $seedUser->execute(['barista', 'barista', 'Barista', 'cashier']);

    // Cup-variant inventory schema
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS cup_variants (
            id INT AUTO_INCREMENT PRIMARY KEY,
            variant_key VARCHAR(20) NOT NULL UNIQUE,
            name VARCHAR(50) NOT NULL,
            category_note VARCHAR(100) NOT NULL,
            quantity INT NOT NULL DEFAULT 50,
            minimum_quantity INT NOT NULL DEFAULT 10,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
    ");

    $seedCup = $pdo->prepare("
        INSERT IGNORE INTO cup_variants (variant_key, name, category_note, quantity, minimum_quantity)
        VALUES (?, ?, ?, ?, ?)
    ");
    $seedCup->execute(['16oz', '16oz Cup', 'Cold Coffee & Refreshers', 50, 10]);
    $seedCup->execute(['22oz', '22oz Cup', 'Refreshers', 50, 10]);
    $seedCup->execute(['hot', 'Hot Cup (12oz)', 'Hot Coffee & Frappe', 50, 10]);

    $pdo->exec("UPDATE cup_variants SET category_note = 'Cold Coffee & Refreshers' WHERE variant_key = '16oz'");
    $pdo->exec("UPDATE cup_variants SET category_note = 'Refreshers' WHERE variant_key = '22oz'");
    $pdo->exec("UPDATE cup_variants SET name = 'Hot Cup (12oz)', category_note = 'Hot Coffee & Frappe' WHERE variant_key = 'hot'");

    if (!$pdo->query("SHOW COLUMNS FROM products LIKE 'cup_variant'")->fetch()) {
        $pdo->exec("ALTER TABLE products ADD COLUMN cup_variant VARCHAR(20) NOT NULL DEFAULT 'hot' AFTER price");
    }
    if (!$pdo->query("SHOW COLUMNS FROM products LIKE 'venti_price'")->fetch()) {
        $pdo->exec("ALTER TABLE products ADD COLUMN venti_price DECIMAL(10,2) NULL DEFAULT NULL AFTER price");
    }
    if (!$pdo->query("SHOW COLUMNS FROM products LIKE 'hot_cup'")->fetch()) {
        $pdo->exec("ALTER TABLE products ADD COLUMN hot_cup VARCHAR(20) NULL DEFAULT NULL AFTER cup_variant");
    }
    if (!$pdo->query("SHOW COLUMNS FROM products LIKE 'iced_cup'")->fetch()) {
        $pdo->exec("ALTER TABLE products ADD COLUMN iced_cup VARCHAR(20) NULL DEFAULT NULL AFTER hot_cup");
    }
    $pdo->exec("
        UPDATE products p
        JOIN categories c ON c.id = p.category_id
        SET p.cup_variant = CASE
            WHEN c.name = 'Refresher' THEN IF(p.cup_variant IN ('16oz', '22oz'), p.cup_variant, '22oz')
            ELSE 'hot'
        END,
        p.venti_price = CASE
            WHEN c.name = 'Refresher' THEN COALESCE(p.venti_price, p.price + 20)
            ELSE p.venti_price
        END,
        p.hot_cup = CASE
            WHEN c.name = 'Refresher' THEN COALESCE(p.hot_cup, '16oz')
            WHEN c.name = 'Coffee' OR c.name = 'Frappe' THEN COALESCE(p.hot_cup, 'hot')
            ELSE p.hot_cup
        END,
        p.iced_cup = CASE
            WHEN c.name = 'Refresher' THEN COALESCE(p.iced_cup, '22oz')
            WHEN c.name = 'Coffee' THEN COALESCE(p.iced_cup, '16oz')
            ELSE p.iced_cup
        END
    ");

    if (!$pdo->query("SHOW COLUMNS FROM stock_requests LIKE 'cup_variant'")->fetch()) {
        $pdo->exec("ALTER TABLE stock_requests ADD COLUMN cup_variant VARCHAR(20) NULL AFTER inventory_item_id");
    }

    if (!$pdo->query("SHOW COLUMNS FROM order_items LIKE 'cup_variant'")->fetch()) {
        $pdo->exec("ALTER TABLE order_items ADD COLUMN cup_variant VARCHAR(20) NULL AFTER product_id");
    }

    $pdo->prepare("INSERT IGNORE INTO categories (name) VALUES (?)")->execute(['Non-coffee']);
}

/**
 * Resolve a LAN-reachable URL and active network metadata for customer QR scanning.
 */
function getCustomerOrderingDetails(): array
{
    $isHttps = (!empty($_SERVER['HTTPS']) && $_SERVER['HTTPS'] !== 'off')
        || strtolower((string) ($_SERVER['HTTP_X_FORWARDED_PROTO'] ?? '')) === 'https'
        || (int) ($_SERVER['SERVER_PORT'] ?? 80) === 443;
    $scheme = $isHttps ? 'https' : 'http';
    $hostHeader = (string) ($_SERVER['HTTP_HOST'] ?? 'localhost');
    $hostOnly = preg_replace('/:\d+$/', '', $hostHeader);
    $port = '';
    if (preg_match('/:(\d+)$/', $hostHeader, $m)) {
        $port = ':' . $m[1];
    }

    $networks = detectActiveNetworks();
    $primary = $networks[0] ?? null;
    $isLoopbackHost = in_array(strtolower($hostOnly), ['localhost', '127.0.0.1', '::1', ''], true);

    if ($isLoopbackHost && $primary !== null) {
        $hostOnly = $primary['ip'];
    }

    $matched = null;
    foreach ($networks as $net) {
        if ($net['ip'] === $hostOnly) {
            $matched = $net;
            break;
        }
    }

    $scriptName = (string) ($_SERVER['SCRIPT_NAME'] ?? '/index.php');
    $baseDir = rtrim(str_replace('\\', '/', dirname($scriptName)), '/');
    if (str_ends_with($baseDir, '/Controller') || str_ends_with($baseDir, '/View')) {
        $baseDir = dirname($baseDir);
        if ($baseDir === '/' || $baseDir === '\\' || $baseDir === '.') {
            $baseDir = '';
        }
    }

    $buildUrl = static fn(string $ipOrHost): string => $scheme . '://' . $ipOrHost . $port . $baseDir . '/order.php';

    return [
        'orderingUrl' => $buildUrl($hostOnly),
        'detectedIp' => $hostOnly,
        'networkAdapter' => $matched['adapter'] ?? ($primary['adapter'] ?? 'Current Host'),
        'availableNetworks' => array_map(static fn(array $net): array => [
            'adapter' => $net['adapter'],
            'ip' => $net['ip'],
            'url' => $buildUrl($net['ip']),
        ], $networks),
    ];
}

/**
 * Resolve a LAN-reachable URL for customer phones scanning the QR code.
 */
function getCustomerOrderingUrl(): string
{
    return getCustomerOrderingDetails()['orderingUrl'];
}

/**
 * Detect active IPv4 network interfaces ordered by likelihood of being the connected LAN/Wi-Fi.
 */
function detectActiveNetworks(): array
{
    $candidates = [];

    if (PHP_OS_FAMILY === 'Windows' && function_exists('shell_exec')) {
        $output = @shell_exec('ipconfig');
        if (is_string($output) && $output !== '') {
            $currentAdapter = '';
            $currentIp = null;
            $hasGateway = false;
            $disconnected = false;

            $flushAdapter = static function () use (&$candidates, &$currentAdapter, &$currentIp, &$hasGateway, &$disconnected): void {
                if ($currentIp !== null && !$disconnected) {
                    $lower = strtolower($currentAdapter);
                    $isVirtual = str_contains($lower, 'vethernet')
                        || str_contains($lower, 'hyper-v')
                        || str_contains($lower, 'virtualbox')
                        || str_contains($lower, 'vmware')
                        || str_contains($lower, 'wsl')
                        || str_contains($lower, 'docker')
                        || str_contains($lower, 'loopback');

                    if (!$isVirtual) {
                        $score = 0;
                        if ($hasGateway) $score += 100;
                        if (str_contains($lower, 'wi-fi') || str_contains($lower, 'wireless')) $score += 60;
                        elseif (str_contains($lower, 'ethernet')) $score += 50;
                        if (str_contains($lower, 'local area connection*')) $score -= 15;
                        $candidates[] = [
                            'adapter' => $currentAdapter,
                            'ip' => $currentIp,
                            'score' => $score,
                        ];
                    }
                }
                $currentIp = null;
                $hasGateway = false;
                $disconnected = false;
            };

            foreach (preg_split('/\r?\n/', $output) as $line) {
                if (preg_match('/^([A-Za-z0-9].*):\s*$/', $line, $m)) {
                    $flushAdapter();
                    $currentAdapter = trim($m[1]);
                } elseif (stripos($line, 'Media disconnected') !== false) {
                    $disconnected = true;
                } elseif (preg_match('/IPv4 Address[.\s]*:\s*([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/i', $line, $m)) {
                    $ip = $m[1];
                    if (!str_starts_with($ip, '127.') && !str_starts_with($ip, '169.254.')) {
                        $currentIp = $ip;
                    }
                } elseif (preg_match('/Default Gateway[.\s]*:\s*([0-9]+\.[0-9]+\.[0-9]+\.[0-9]+)/i', $line)) {
                    $hasGateway = true;
                }
            }
            $flushAdapter();
        }
    }

    if (empty($candidates)) {
        $hostname = gethostname();
        if ($hostname !== false) {
            $ips = gethostbynamel($hostname);
            if (is_array($ips)) {
                foreach ($ips as $ip) {
                    if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_IPV4) !== false
                        && !str_starts_with($ip, '127.')
                        && !str_starts_with($ip, '169.254.')) {
                        $candidates[] = ['adapter' => 'Local Network', 'ip' => $ip, 'score' => 10];
                    }
                }
            }
        }
    }

    usort($candidates, static fn(array $a, array $b): int => $b['score'] <=> $a['score']);
    return $candidates;
}

/**
 * Best-effort local IPv4 address lookup so phones on the same Wi-Fi can scan localhost-served apps.
 */
function detectLanIpv4(): ?string
{
    $networks = detectActiveNetworks();
    return $networks[0]['ip'] ?? null;
}
