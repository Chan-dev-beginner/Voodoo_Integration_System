<?php
/**
 * API endpoint reserved strictly for Admin Sales Forecasting via Python.
 * All other modules (POS, Ordering, Queue, Accounts, Inventory, Shift Logs) run locally in JS/localStorage.
 */
require_once __DIR__ . '/../Model/config.php';

header('Content-Type: application/json; charset=utf-8');

/**
 * Send a JSON response and terminate execution.
 */
function respondJson(int $statusCode, array $payload): void
{
    http_response_code($statusCode);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

/**
 * Find a real Python 3 executable on the host, ignoring Windows Store app-execution stubs.
 */
function findPythonExecutable(): ?string
{
    $candidates = [];
    $envPython = getenv('VOODOO_PYTHON_BIN');
    if (is_string($envPython) && trim($envPython) !== '') {
        $candidates[] = trim($envPython);
    }

    if (PHP_OS_FAMILY === 'Windows') {
        $patterns = [
            'C:\\Python*\\python.exe',
            'C:\\Program Files\\Python*\\python.exe',
            'C:\\Program Files (x86)\\Python*\\python.exe',
            (getenv('LOCALAPPDATA') ?: 'C:\\Users\\Administrator\\AppData\\Local') . '\\Programs\\Python\\Python*\\python.exe',
        ];
        foreach ($patterns as $pattern) {
            foreach (glob($pattern) ?: [] as $found) {
                $candidates[] = $found;
            }
        }
        $candidates = array_merge($candidates, ['py', 'python3', 'python']);
    } else {
        $candidates = array_merge($candidates, ['python3', 'python']);
    }

    foreach ($candidates as $bin) {
        if (str_contains($bin, 'WindowsApps')) {
            continue;
        }
        if (str_contains($bin, DIRECTORY_SEPARATOR) && !is_file($bin)) {
            continue;
        }
        $probe = @proc_open(
            escapeshellcmd($bin) . ' --version',
            [1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
            $pipes
        );
        if (is_resource($probe)) {
            $out = stream_get_contents($pipes[1]) . stream_get_contents($pipes[2]);
            fclose($pipes[1]);
            fclose($pipes[2]);
            $exit = proc_close($probe);
            if ($exit === 0 && stripos($out, 'Python 3') !== false) {
                return $bin;
            }
        }
    }

    return null;
}

$action = $_GET['action'] ?? '';
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';

if ($method !== 'POST' || $action !== 'sales_forecast') {
    respondJson(404, [
        'ok' => false,
        'error' => 'API usage is reserved strictly for Admin Sales Forecasting.',
    ]);
}

$rawBody = file_get_contents('php://input');
$body = $rawBody ? json_decode($rawBody, true) : [];
if (!is_array($body)) {
    $body = [];
}

if (strtolower(trim((string) ($body['role'] ?? ''))) !== 'admin') {
    respondJson(403, [
        'ok' => false,
        'error' => 'Sales Forecasting is restricted to Admin accounts only.',
    ]);
}

/**
 * Parse an ISO/MySQL datetime string into a DateTimeImmutable, falling back to $fallback.
 */
function parseForecastDate(?string $value, DateTimeImmutable $fallback): DateTimeImmutable
{
    if (!$value) {
        return $fallback;
    }
    $cleaned = str_replace(' ', 'T', trim($value));
    if (str_ends_with($cleaned, 'Z')) {
        $cleaned = substr($cleaned, 0, -1);
    }
    try {
        return new DateTimeImmutable(substr($cleaned, 0, 19));
    } catch (Throwable $e) {
        return $fallback;
    }
}

/**
 * Pure-PHP fallback mirroring Model/sales_forecast.py when Python 3 or proc_open is unavailable.
 */
function runPhpSalesForecast(array $payload): array
{
    $baseline = [
        1850.0, 2100.0, 1980.0, 2240.0, 2650.0, 3120.0, 2950.0,
        2050.0, 2220.0, 2180.0, 2410.0, 2890.0, 3340.0, 3100.0,
    ];

    $today = new DateTimeImmutable('now');
    $todayKey = $today->format('Y-m-d');
    $horizonDays = max(1, min(30, (int) ($payload['horizonDays'] ?? 7)));
    $orders = is_array($payload['orders'] ?? null) ? $payload['orders'] : [];
    $savedShifts = is_array($payload['savedShiftSales'] ?? null) ? $payload['savedShiftSales'] : [];
    $products = is_array($payload['products'] ?? null) ? $payload['products'] : [];

    $recordedByDay = [];
    $productUnits = [];

    foreach ($orders as $order) {
        if (!is_array($order)) {
            continue;
        }
        $status = strtolower((string) ($order['status'] ?? 'completed'));
        if ($status !== 'completed' && $status !== '') {
            continue;
        }
        $dt = parseForecastDate((string) ($order['time'] ?? ($order['created_at'] ?? '')), $today);
        $dayKey = $dt->format('Y-m-d');
        if (!isset($recordedByDay[$dayKey])) {
            $recordedByDay[$dayKey] = ['sales' => 0.0, 'orders' => 0];
        }
        $recordedByDay[$dayKey]['sales'] += (float) ($order['total'] ?? 0);
        $recordedByDay[$dayKey]['orders'] += 1;

        foreach ($order['items'] ?? [] as $item) {
            if (!is_array($item)) {
                continue;
            }
            $name = trim((string) ($item['name'] ?? ''));
            $qty = (int) ($item['quantity'] ?? 0);
            if ($name !== '' && $qty > 0) {
                $productUnits[$name] = ($productUnits[$name] ?? 0) + $qty;
            }
        }
    }

    $shiftByDay = [];
    foreach ($savedShifts as $shift) {
        if (!is_array($shift)) {
            continue;
        }
        $dt = parseForecastDate((string) ($shift['logged_out_at'] ?? ($shift['shift_started_at'] ?? '')), $today);
        $dayKey = $dt->format('Y-m-d');
        if (!isset($shiftByDay[$dayKey])) {
            $shiftByDay[$dayKey] = ['sales' => 0.0, 'orders' => 0];
        }
        $shiftByDay[$dayKey]['sales'] += (float) ($shift['total_sales'] ?? 0);
        $shiftByDay[$dayKey]['orders'] += (int) ($shift['total_orders'] ?? 0);
    }

    $mergedRecorded = [];
    $allDayKeys = array_unique(array_merge(array_keys($recordedByDay), array_keys($shiftByDay)));
    foreach ($allDayKeys as $dayKey) {
        $ordEntry = $recordedByDay[$dayKey] ?? ['sales' => 0.0, 'orders' => 0];
        $shfEntry = $shiftByDay[$dayKey] ?? ['sales' => 0.0, 'orders' => 0];
        $mergedRecorded[$dayKey] = ($shfEntry['sales'] > $ordEntry['sales']) ? $shfEntry : $ordEntry;
    }

    $series = [];
    for ($offset = -14; $offset <= 0; $offset++) {
        $day = $today->modify(($offset >= 0 ? '+' : '') . $offset . ' days');
        $dayKey = $day->format('Y-m-d');
        if (isset($mergedRecorded[$dayKey])) {
            $sales = round($mergedRecorded[$dayKey]['sales'], 2);
            $orderCount = (int) $mergedRecorded[$dayKey]['orders'];
            $source = 'recorded';
        } elseif ($offset < 0) {
            $baselineSales = $baseline[($offset + 14) % count($baseline)];
            $sales = round($baselineSales, 2);
            $orderCount = max(1, (int) round($baselineSales / 165.0));
            $source = 'baseline';
        } else {
            $sales = 0.0;
            $orderCount = 0;
            $source = 'recorded';
        }

        $series[] = [
            'date' => $dayKey,
            'day' => $day->format('D'),
            'weekday' => ((int) $day->format('N')) - 1,
            'sales' => $sales,
            'orders' => $orderCount,
            'period' => $dayKey === $todayKey ? 'present' : 'before',
            'source' => $source,
        ];
    }

    $fitPoints = array_values(array_filter(
        $series,
        static fn(array $d): bool => !($d['period'] === 'present' && $d['sales'] == 0.0)
    ));
    if (empty($fitPoints)) {
        $fitPoints = array_slice($series, 0, -1);
    }

    $fitValues = array_map(static fn(array $d): float => (float) $d['sales'], $fitPoints);
    $n = count($fitValues);
    $overallAvg = $n > 0 ? array_sum($fitValues) / $n : 0.0;

    if ($n < 2) {
        $slope = 0.0;
        $intercept = $fitValues[0] ?? 0.0;
    } else {
        $meanX = ($n - 1) / 2.0;
        $meanY = $overallAvg;
        $denom = 0.0;
        $numer = 0.0;
        for ($i = 0; $i < $n; $i++) {
            $dx = $i - $meanX;
            $denom += $dx * $dx;
            $numer += $dx * ($fitValues[$i] - $meanY);
        }
        $slope = $denom > 0.0 ? ($numer / $denom) : 0.0;
        $intercept = $meanY - $slope * $meanX;
    }

    $weekdayTotals = array_fill(0, 7, []);
    foreach ($fitPoints as $d) {
        $weekdayTotals[$d['weekday']][] = $d['sales'];
    }
    $weekdayFactor = [];
    for ($wd = 0; $wd < 7; $wd++) {
        if ($overallAvg > 0 && !empty($weekdayTotals[$wd])) {
            $raw = (array_sum($weekdayTotals[$wd]) / count($weekdayTotals[$wd])) / $overallAvg;
            $weekdayFactor[$wd] = max(0.75, min(1.30, $raw));
        } else {
            $weekdayFactor[$wd] = 1.0;
        }
    }

    $sqResiduals = 0.0;
    foreach ($fitPoints as $idx => $d) {
        $res = $d['sales'] - ($intercept + $slope * $idx);
        $sqResiduals += $res * $res;
    }
    $stdErr = sqrt($sqResiduals / max(1, count($fitPoints) - 1));

    $avgOrderValue = 165.0;
    $totalRecSales = 0.0;
    $totalRecOrders = 0;
    foreach ($series as $d) {
        if ($d['source'] === 'recorded') {
            $totalRecSales += $d['sales'];
            $totalRecOrders += $d['orders'];
        }
    }
    if ($totalRecOrders > 0 && $totalRecSales > 0) {
        $avgOrderValue = $totalRecSales / $totalRecOrders;
    }

    $predictions = [];
    $baseIndex = count($fitValues);
    $margin = round(1.28 * $stdErr, 2);
    for ($step = 1; $step <= $horizonDays; $step++) {
        $futureDay = $today->modify('+' . $step . ' days');
        $wd = ((int) $futureDay->format('N')) - 1;
        $trendVal = max(0.0, $intercept + $slope * ($baseIndex + $step - 1));
        $predicted = round(max(0.0, $trendVal * $weekdayFactor[$wd]), 2);
        $predictions[] = [
            'date' => $futureDay->format('Y-m-d'),
            'day' => $futureDay->format('D'),
            'sales' => $predicted,
            'lowerBound' => round(max(0.0, $predicted - $margin), 2),
            'upperBound' => round($predicted + $margin, 2),
            'expectedOrders' => max(1, (int) round($predicted / max(1.0, $avgOrderValue))),
        ];
    }

    $next30Total = 0.0;
    for ($step = 1; $step <= 30; $step++) {
        $futureDay = $today->modify('+' . $step . ' days');
        $wd = ((int) $futureDay->format('N')) - 1;
        $trendVal = max(0.0, $intercept + $slope * ($baseIndex + $step - 1));
        $next30Total += max(0.0, $trendVal * $weekdayFactor[$wd]);
    }

    $beforeTotal = 0.0;
    $beforeCount = 0;
    $presentSales = 0.0;
    $presentOrders = 0;
    foreach ($series as $d) {
        if ($d['period'] === 'before') {
            $beforeTotal += $d['sales'];
            $beforeCount++;
        } else {
            $presentSales = $d['sales'];
            $presentOrders = $d['orders'];
        }
    }
    $beforeTotal = round($beforeTotal, 2);
    $beforeAvg = $beforeTotal / max(1, $beforeCount);

    $predTotal = array_sum(array_column($predictions, 'sales'));
    $next7Total = round(array_sum(array_column(array_slice($predictions, 0, 7), 'sales')), 2);
    $futureDailyAvg = $predTotal / max(1, count($predictions));
    $growthPct = $beforeAvg > 0 ? (($futureDailyAvg - $beforeAvg) / $beforeAvg * 100.0) : 0.0;

    $trendLabel = $growthPct >= 3.0 ? 'Growing' : ($growthPct <= -3.0 ? 'Declining' : 'Stable');

    $totalUnits = array_sum($productUnits);
    $estOrders7 = array_sum(array_column(array_slice($predictions, 0, 7), 'expectedOrders'));
    $productForecast = [];
    foreach ($products as $p) {
        if (!is_array($p)) {
            continue;
        }
        $name = (string) ($p['name'] ?? '');
        $stock = (int) ($p['stock'] ?? 0);
        $sold = (int) ($productUnits[$name] ?? 0);
        if ($totalUnits > 0) {
            $share = $sold / $totalUnits;
            $estDemand = $sold > 0 ? max(1, (int) round($share * $estOrders7 * 1.4)) : 2;
        } else {
            $estDemand = 5;
        }
        $productForecast[] = [
            'name' => $name,
            'sold' => $sold,
            'predictedDemand' => $estDemand,
            'currentStock' => $stock,
            'advice' => $stock < $estDemand ? 'Restock soon' : 'Sufficient',
        ];
    }

    usort($productForecast, static function (array $a, array $b): int {
        return [$b['sold'], $b['predictedDemand']] <=> [$a['sold'], $a['predictedDemand']];
    });

    return [
        'ok' => true,
        'engine' => 'php-fallback',
        'modelName' => 'Linear Regression + Day-of-Week Seasonality',
        'horizonDays' => $horizonDays,
        'summary' => [
            'beforeTotal' => $beforeTotal,
            'beforeDailyAvg' => round($beforeAvg, 2),
            'presentSales' => round($presentSales, 2),
            'presentOrders' => (int) $presentOrders,
            'predictedHorizonTotal' => round($predTotal, 2),
            'predictedNext7Days' => $next7Total,
            'predictedNext30Days' => round($next30Total, 2),
            'predictedDailyAvg' => round($futureDailyAvg, 2),
            'growthPercent' => round($growthPct, 1),
            'trendLabel' => $trendLabel,
        ],
        'history' => $series,
        'predictions' => $predictions,
        'productForecast' => array_slice($productForecast, 0, 6),
    ];
}

$forecastPayload = [
    'orders' => is_array($body['orders'] ?? null) ? $body['orders'] : [],
    'savedShiftSales' => is_array($body['savedShiftSales'] ?? null) ? $body['savedShiftSales'] : [],
    'products' => is_array($body['products'] ?? null) ? $body['products'] : [],
    'horizonDays' => (int) ($body['horizonDays'] ?? 7),
];

$scriptPath = __DIR__ . '/../Model/sales_forecast.py';
$pythonBin = function_exists('proc_open') ? findPythonExecutable() : null;

if ($pythonBin !== null && is_file($scriptPath)) {
    $cmd = escapeshellcmd($pythonBin) . ' ' . escapeshellarg($scriptPath);
    $process = @proc_open(
        $cmd,
        [0 => ['pipe', 'r'], 1 => ['pipe', 'w'], 2 => ['pipe', 'w']],
        $pipes
    );

    if (is_resource($process)) {
        fwrite($pipes[0], json_encode($forecastPayload));
        fclose($pipes[0]);

        $stdout = stream_get_contents($pipes[1]);
        fclose($pipes[1]);
        fclose($pipes[2]);
        $exitCode = proc_close($process);

        if ($exitCode === 0) {
            $result = json_decode((string) $stdout, true);
            if (is_array($result) && !empty($result['ok'])) {
                respondJson(200, $result);
            }
        }
    }
}

respondJson(200, runPhpSalesForecast($forecastPayload));
