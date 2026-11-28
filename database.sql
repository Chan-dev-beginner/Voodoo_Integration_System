-- ============================================
-- Voodoo eSports Café Full Database Dump
-- Generated: 2026-11-28 15:28:19
-- ============================================

SET FOREIGN_KEY_CHECKS = 0;

-- --------------------------------------------
-- Table structure for `users`
-- --------------------------------------------
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `username` varchar(50) NOT NULL,
  `password_hash` varchar(255) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `role` enum('admin','cashier','barista','inventory','customer') NOT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=1434 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for `users`
INSERT INTO `users` (`id`, `username`, `password_hash`, `full_name`, `role`, `is_active`, `created_at`) VALUES
  (1, 'admin', 'admin', 'Admin', 'admin', 1, '2026-11-25 13:47:44'),
  (2, 'barista', 'barista', 'Barista', 'cashier', 1, '2026-11-25 13:47:44');

-- --------------------------------------------
-- Table structure for `categories`
-- --------------------------------------------
DROP TABLE IF EXISTS `categories`;
CREATE TABLE `categories` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=99 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for `categories`
INSERT INTO `categories` (`id`, `name`) VALUES
  (1, 'Coffee'),
  (2, 'Frappe'),
  (6, 'Non-coffee'),
  (3, 'Refresher');

-- --------------------------------------------
-- Table structure for `cup_variants`
-- --------------------------------------------
DROP TABLE IF EXISTS `cup_variants`;
CREATE TABLE `cup_variants` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `variant_key` varchar(20) NOT NULL,
  `name` varchar(50) NOT NULL,
  `category_note` varchar(100) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 50,
  `minimum_quantity` int(11) NOT NULL DEFAULT 10,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `variant_key` (`variant_key`)
) ENGINE=InnoDB AUTO_INCREMENT=586 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for `cup_variants`
INSERT INTO `cup_variants` (`id`, `variant_key`, `name`, `category_note`, `quantity`, `minimum_quantity`, `updated_at`) VALUES
  (1, '16oz', '16oz Cup', 'Cold Coffee & Refreshers', 49, 10, '2026-11-28 13:44:27'),
  (2, '22oz', '22oz Cup', 'Refreshers', 50, 10, '2026-11-28 10:24:19'),
  (3, 'hot', 'Hot Cup (12oz)', 'Hot Coffee & Frappe', 36, 10, '2026-11-28 13:44:27');

-- --------------------------------------------
-- Table structure for `products`
-- --------------------------------------------
DROP TABLE IF EXISTS `products`;
CREATE TABLE `products` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `category_id` int(11) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `price` decimal(10,2) NOT NULL,
  `venti_price` decimal(10,2) DEFAULT NULL,
  `cup_variant` varchar(20) NOT NULL DEFAULT '16oz',
  `hot_cup` varchar(20) DEFAULT NULL,
  `iced_cup` varchar(20) DEFAULT NULL,
  `image` varchar(255) DEFAULT NULL,
  `is_available` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `category_id` (`category_id`),
  CONSTRAINT `products_ibfk_1` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for `products`
INSERT INTO `products` (`id`, `category_id`, `name`, `description`, `price`, `venti_price`, `cup_variant`, `hot_cup`, `iced_cup`, `image`, `is_available`, `created_at`) VALUES
  (1, 1, 'Vanilla Latte', 'Espresso, milk and vanilla', 150.00, NULL, 'hot', 'hot', '16oz', 'assets/2.png', 0, '2026-11-19 22:34:47'),
  (2, 1, 'Caramel Machiato', 'Espresso, caramel and milk', 165.00, NULL, 'hot', 'hot', '16oz', 'assets/3.png', 0, '2026-11-19 22:34:47'),
  (3, 1, 'Mocha Iced', 'Chocolate, espresso and ice', 170.00, NULL, 'hot', 'hot', '16oz', 'assets/4.png', 0, '2026-11-19 22:34:47'),
  (4, 2, 'Matcha Frappe', 'Matcha, milk and cream', 185.00, NULL, 'hot', 'hot', NULL, 'assets/1.png', 0, '2026-11-19 22:34:47'),
  (5, 3, 'Berry Refresher', 'Berry blend, citrus and ice', 155.00, 175.00, '22oz', '16oz', '22oz', 'assets/refreshers.png', 0, '2026-11-19 22:34:47'),
  (6, 1, 'Iced Americano', 'Espresso and chilled water', 120.00, NULL, 'hot', 'hot', '16oz', 'assets/3.png', 0, '2026-11-19 22:34:47'),
  (7, 2, 'Chocolate Frappe', 'Chocolate, milk and ice', 180.00, NULL, 'hot', 'hot', NULL, 'assets/4.png', 0, '2026-11-19 22:34:47'),
  (8, 2, 'Strawberry Matcha', 'Strawberry and matcha', 160.00, NULL, 'hot', 'hot', NULL, 'assets/1.png', 0, '2026-11-19 22:34:47'),
  (9, 1, 'Salted Caramel', 'Espresso, caramel and cream', 180.00, NULL, 'hot', 'hot', '16oz', 'assets/2.png', 0, '2026-11-19 22:34:47'),
  (10, 1, 'ALMOND LATTE', NULL, 150.00, NULL, 'hot', 'hot', '16oz', 'assets/2.png', 1, '2026-11-28 14:14:27'),
  (11, 1, 'HAZEL NUT LATTE', NULL, 150.00, NULL, 'hot', 'hot', '16oz', 'assets/2.png', 1, '2026-11-28 14:15:01'),
  (12, 1, 'VANILLA LATTE', NULL, 150.00, NULL, 'hot', 'hot', '16oz', 'assets/2.png', 1, '2026-11-28 14:15:22'),
  (13, 1, 'CAFE LATTE', NULL, 150.00, NULL, 'hot', 'hot', '16oz', 'assets/2.png', 1, '2026-11-28 14:15:42'),
  (14, 1, 'AMERICANO', NULL, 150.00, NULL, 'hot', 'hot', '16oz', 'assets/2.png', 1, '2026-11-28 14:16:07'),
  (15, 1, 'SPANISH LATTE', NULL, 180.00, NULL, 'hot', 'hot', '16oz', 'assets/2.png', 1, '2026-11-28 14:17:51'),
  (16, 1, 'CARAMEL MACCHIATO', NULL, 180.00, NULL, 'hot', 'hot', '16oz', 'assets/2.png', 1, '2026-11-28 14:18:17'),
  (17, 1, 'ENGLISH TOFFEE', NULL, 180.00, NULL, 'hot', 'hot', '16oz', 'assets/2.png', 1, '2026-11-28 14:18:32'),
  (18, 1, 'SALTED CARAMEL', NULL, 180.00, NULL, 'hot', 'hot', '16oz', 'assets/2.png', 1, '2026-11-28 14:20:52'),
  (19, 1, 'WHITE CHOCOLATE', NULL, 170.00, NULL, 'hot', 'hot', '16oz', 'assets/2.png', 1, '2026-11-28 14:21:12'),
  (20, 1, 'MOCHACCINO', NULL, 150.00, NULL, 'hot', 'hot', '16oz', 'assets/2.png', 1, '2026-11-28 14:21:39'),
  (21, 6, 'CLASSIC MATCHA', NULL, 200.00, NULL, 'hot', NULL, NULL, 'assets/2.png', 1, '2026-11-28 14:22:51'),
  (22, 6, 'STRAWBERRY MATCHA', NULL, 195.00, NULL, 'hot', NULL, NULL, 'assets/2.png', 1, '2026-11-28 14:23:39'),
  (23, 6, 'VANILLA CHOCO CREAM', NULL, 150.00, NULL, 'hot', NULL, NULL, 'assets/2.png', 1, '2026-11-28 14:25:49'),
  (24, 1, 'STRAWBERRY CLOUD', NULL, 120.00, NULL, 'hot', 'hot', '16oz', 'assets/2.png', 0, '2026-11-28 14:26:15'),
  (25, 6, 'STRAWBERRY CLOUD', NULL, 120.00, NULL, 'hot', NULL, NULL, 'assets/2.png', 1, '2026-11-28 14:27:04'),
  (26, 2, 'BISCOFF CRUMBLE', NULL, 220.00, NULL, 'hot', 'hot', '16oz', 'assets/2.png', 1, '2026-11-28 14:57:00'),
  (27, 2, 'DIRTY MATCHA', NULL, 175.00, NULL, 'hot', 'hot', '16oz', 'assets/2.png', 1, '2026-11-28 14:58:15'),
  (28, 2, 'MATCHA', NULL, 175.00, NULL, 'hot', 'hot', '16oz', 'assets/2.png', 1, '2026-11-28 14:58:36'),
  (29, 2, 'DARK CHOCOLATE', NULL, 175.00, NULL, 'hot', 'hot', '16oz', 'assets/2.png', 1, '2026-11-28 14:58:54'),
  (30, 2, 'CARAMEL MACCHIATO', NULL, 175.00, NULL, 'hot', 'hot', '16oz', 'assets/2.png', 1, '2026-11-28 15:08:54'),
  (31, 2, 'STRAWBERRY CREAM', NULL, 150.00, NULL, 'hot', 'hot', '16oz', 'assets/2.png', 1, '2026-11-28 15:09:32'),
  (32, 3, 'LEMONADE', NULL, 79.00, 89.00, '22oz', '16oz', '22oz', 'assets/2.png', 1, '2026-11-28 15:24:43'),
  (33, 3, 'STRAWBERRY', NULL, 79.00, 89.00, '22oz', '16oz', '22oz', 'assets/2.png', 1, '2026-11-28 15:25:03'),
  (34, 3, 'MIXED BERRIES', NULL, 79.00, 89.00, '22oz', '16oz', '22oz', 'assets/2.png', 1, '2026-11-28 15:25:31'),
  (35, 3, 'GREEN APPLE', NULL, 79.00, 89.00, '22oz', '16oz', '22oz', 'assets/2.png', 1, '2026-11-28 15:25:56'),
  (36, 3, 'BLUEBERRY', NULL, 79.00, 89.00, '22oz', '16oz', '22oz', 'assets/2.png', 1, '2026-11-28 15:26:11'),
  (37, 3, 'LYCHEE', NULL, 79.00, 89.00, '22oz', '16oz', '22oz', 'assets/2.png', 1, '2026-11-28 15:26:26'),
  (38, 3, 'PASSION FRUIT', NULL, 79.00, 89.00, '22oz', '16oz', '22oz', 'assets/2.png', 1, '2026-11-28 15:26:41');

-- --------------------------------------------
-- Table structure for `inventory_items`
-- --------------------------------------------
DROP TABLE IF EXISTS `inventory_items`;
CREATE TABLE `inventory_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `product_id` int(11) NOT NULL,
  `quantity` int(11) NOT NULL DEFAULT 0,
  `minimum_quantity` int(11) NOT NULL DEFAULT 5,
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_inventory_product` (`product_id`),
  CONSTRAINT `inventory_items_ibfk_1` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=39 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for `inventory_items`
INSERT INTO `inventory_items` (`id`, `product_id`, `quantity`, `minimum_quantity`, `updated_at`) VALUES
  (1, 1, 18, 5, '2026-11-25 14:27:17'),
  (2, 2, 11, 5, '2026-11-25 13:49:35'),
  (3, 3, 8, 5, '2026-11-25 13:49:35'),
  (4, 4, 3, 5, '2026-11-25 13:49:35'),
  (5, 5, 2, 5, '2026-11-25 13:49:35'),
  (6, 6, 22, 5, '2026-11-19 22:34:47'),
  (7, 7, 8, 5, '2026-11-19 22:34:47'),
  (8, 8, 50, 5, '2026-11-28 11:30:00'),
  (9, 9, 36, 5, '2026-11-28 13:38:28'),
  (10, 10, 49, 5, '2026-11-28 14:14:27'),
  (11, 11, 49, 5, '2026-11-28 14:15:01'),
  (12, 12, 49, 5, '2026-11-28 14:15:22'),
  (13, 13, 49, 5, '2026-11-28 14:15:42'),
  (14, 14, 49, 5, '2026-11-28 14:16:07'),
  (15, 15, 49, 5, '2026-11-28 14:17:51'),
  (16, 16, 49, 5, '2026-11-28 14:18:17'),
  (17, 17, 49, 5, '2026-11-28 14:18:32'),
  (18, 18, 49, 5, '2026-11-28 14:20:52'),
  (19, 19, 49, 5, '2026-11-28 14:21:12'),
  (20, 20, 49, 5, '2026-11-28 14:21:39'),
  (21, 21, 49, 5, '2026-11-28 14:22:51'),
  (22, 22, 49, 5, '2026-11-28 14:23:39'),
  (23, 23, 49, 5, '2026-11-28 14:25:49'),
  (24, 24, 49, 5, '2026-11-28 14:26:15'),
  (25, 25, 49, 5, '2026-11-28 14:27:04'),
  (26, 26, 49, 5, '2026-11-28 14:57:00'),
  (27, 27, 49, 5, '2026-11-28 14:58:15'),
  (28, 28, 49, 5, '2026-11-28 14:58:36'),
  (29, 29, 49, 5, '2026-11-28 14:58:54'),
  (30, 30, 49, 5, '2026-11-28 15:08:54'),
  (31, 31, 49, 5, '2026-11-28 15:09:32'),
  (32, 32, 50, 5, '2026-11-28 15:24:43'),
  (33, 33, 50, 5, '2026-11-28 15:25:03'),
  (34, 34, 50, 5, '2026-11-28 15:25:31'),
  (35, 35, 50, 5, '2026-11-28 15:25:56'),
  (36, 36, 50, 5, '2026-11-28 15:26:11'),
  (37, 37, 50, 5, '2026-11-28 15:26:26'),
  (38, 38, 50, 5, '2026-11-28 15:26:41');

-- --------------------------------------------
-- Table structure for `orders`
-- --------------------------------------------
DROP TABLE IF EXISTS `orders`;
CREATE TABLE `orders` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_number` varchar(20) NOT NULL,
  `customer_name` varchar(100) DEFAULT 'Walk-in Customer',
  `table_note` varchar(50) DEFAULT NULL,
  `cashier_id` int(11) DEFAULT NULL,
  `source` enum('pos','qr') NOT NULL DEFAULT 'pos',
  `order_type` enum('dine-in','take-out') NOT NULL,
  `status` enum('pending','queue','preparing','completed','cancelled') NOT NULL DEFAULT 'pending',
  `subtotal` decimal(10,2) NOT NULL,
  `tax` decimal(10,2) NOT NULL,
  `total` decimal(10,2) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_number` (`order_number`),
  KEY `cashier_id` (`cashier_id`),
  CONSTRAINT `orders_ibfk_1` FOREIGN KEY (`cashier_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for `orders`
INSERT INTO `orders` (`id`, `order_number`, `customer_name`, `table_note`, `cashier_id`, `source`, `order_type`, `status`, `subtotal`, `tax`, `total`, `created_at`) VALUES
  (3, '#S760169', 'Walk-in Customer', NULL, 2, 'pos', 'dine-in', 'completed', 825.00, 0.00, 825.00, '2026-11-25 13:49:20'),
  (6, '#Q286194', 'chan', 24, NULL, 'qr', 'dine-in', 'cancelled', 155.00, 0.00, 155.00, '2026-11-28 12:31:26'),
  (7, '#Q736174', 'chan', 24, NULL, 'qr', 'dine-in', 'cancelled', 155.00, 0.00, 155.00, '2026-11-28 12:38:56'),
  (8, '#Q783322', 'chan', 2, NULL, 'qr', 'dine-in', 'cancelled', 155.00, 0.00, 155.00, '2026-11-28 12:39:43'),
  (9, '#Q815261', 'chan', 2, NULL, 'qr', 'dine-in', 'cancelled', 675.00, 0.00, 675.00, '2026-11-28 12:40:15'),
  (10, '#P581230', 'chan', '', 2, 'pos', 'dine-in', 'completed', 150.00, 0.00, 150.00, '2026-11-28 12:53:01'),
  (11, '#P197270', 'chan', '', 2, 'pos', 'dine-in', 'completed', 170.00, 0.00, 170.00, '2026-11-28 13:03:17'),
  (12, '#P694018', 'val', '', 2, 'pos', 'dine-in', 'completed', 1460.00, 0.00, 1460.00, '2026-11-28 13:11:34'),
  (13, '#P900683', 'val', '', 2, 'pos', 'dine-in', 'completed', 485.00, 0.00, 485.00, '2026-11-28 13:15:00'),
  (14, '#P927691', 'val', '', 2, 'pos', 'dine-in', 'completed', 170.00, 0.00, 170.00, '2026-11-28 13:15:27');

-- --------------------------------------------
-- Table structure for `order_items`
-- --------------------------------------------
DROP TABLE IF EXISTS `order_items`;
CREATE TABLE `order_items` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `product_id` int(11) NOT NULL,
  `cup_variant` varchar(20) DEFAULT NULL,
  `quantity` int(11) NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `line_total` decimal(10,2) NOT NULL,
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `product_id` (`product_id`),
  CONSTRAINT `order_items_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`) ON DELETE CASCADE,
  CONSTRAINT `order_items_ibfk_2` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for `order_items`
INSERT INTO `order_items` (`id`, `order_id`, `product_id`, `cup_variant`, `quantity`, `unit_price`, `line_total`) VALUES
  (3, 3, 3, NULL, 1, 170.00, 170.00),
  (4, 3, 2, NULL, 1, 165.00, 165.00),
  (5, 3, 1, NULL, 1, 150.00, 150.00),
  (6, 3, 4, NULL, 1, 185.00, 185.00),
  (7, 3, 5, NULL, 1, 155.00, 155.00),
  (10, 6, 5, '22oz', 1, 155.00, 155.00),
  (11, 7, 5, '16oz', 1, 155.00, 155.00),
  (12, 8, 5, '16oz', 1, 155.00, 155.00),
  (13, 9, 5, '16oz', 1, 155.00, 155.00),
  (14, 9, 4, 'hot', 1, 185.00, 185.00),
  (15, 9, 3, 'hot', 1, 170.00, 170.00),
  (16, 9, 2, 'hot', 1, 165.00, 165.00),
  (17, 10, 1, 'hot', 1, 150.00, 150.00),
  (18, 11, 3, 'hot', 1, 170.00, 170.00),
  (19, 12, 1, 'hot', 1, 150.00, 150.00),
  (20, 12, 2, 'hot', 1, 165.00, 165.00),
  (21, 12, 3, 'hot', 1, 170.00, 170.00),
  (22, 12, 6, 'hot', 1, 120.00, 120.00),
  (23, 12, 5, '16oz', 1, 155.00, 155.00),
  (24, 12, 4, 'hot', 1, 185.00, 185.00),
  (25, 12, 7, 'hot', 1, 180.00, 180.00),
  (26, 12, 8, 'hot', 1, 160.00, 160.00),
  (27, 12, 9, 'hot', 1, 175.00, 175.00),
  (28, 13, 3, 'hot', 1, 170.00, 170.00),
  (29, 13, 2, 'hot', 1, 165.00, 165.00),
  (30, 13, 1, 'hot', 1, 150.00, 150.00),
  (31, 14, 3, 'hot', 1, 170.00, 170.00);

-- --------------------------------------------
-- Table structure for `transactions`
-- --------------------------------------------
DROP TABLE IF EXISTS `transactions`;
CREATE TABLE `transactions` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `order_id` int(11) NOT NULL,
  `cashier_id` int(11) DEFAULT NULL,
  `payment_method` enum('cash','card','gcash','other') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  KEY `cashier_id` (`cashier_id`),
  CONSTRAINT `transactions_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `transactions_ibfk_2` FOREIGN KEY (`cashier_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for `transactions`
INSERT INTO `transactions` (`id`, `order_id`, `cashier_id`, `payment_method`, `amount`, `reference_number`, `created_at`) VALUES
  (3, 3, 2, 'cash', 825.00, '#S760169', '2026-11-25 13:49:20'),
  (6, 6, NULL, 'cash', 155.00, NULL, '2026-11-28 12:31:26'),
  (7, 7, NULL, 'cash', 155.00, NULL, '2026-11-28 12:38:56'),
  (8, 8, NULL, 'cash', 155.00, NULL, '2026-11-28 12:39:43'),
  (9, 9, NULL, 'cash', 675.00, NULL, '2026-11-28 12:40:15'),
  (10, 10, 2, 'cash', 150.00, NULL, '2026-11-28 12:53:01'),
  (11, 11, 2, 'cash', 170.00, NULL, '2026-11-28 13:03:17'),
  (12, 12, 2, 'cash', 1460.00, NULL, '2026-11-28 13:11:34'),
  (13, 13, 2, 'cash', 485.00, NULL, '2026-11-28 13:15:00'),
  (14, 14, 2, 'cash', 170.00, NULL, '2026-11-28 13:15:27');

-- --------------------------------------------
-- Table structure for `stock_movements`
-- --------------------------------------------
DROP TABLE IF EXISTS `stock_movements`;
CREATE TABLE `stock_movements` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `inventory_item_id` int(11) NOT NULL,
  `user_id` int(11) DEFAULT NULL,
  `movement_type` enum('restock','adjustment','usage','request','return') NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `notes` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `inventory_item_id` (`inventory_item_id`),
  KEY `user_id` (`user_id`),
  CONSTRAINT `stock_movements_ibfk_1` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`),
  CONSTRAINT `stock_movements_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=47 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for `stock_movements`
INSERT INTO `stock_movements` (`id`, `inventory_item_id`, `user_id`, `movement_type`, `quantity`, `notes`, `created_at`) VALUES
  (1, 8, 1, 'adjustment', 50.00, 'Inventory update', '2026-11-28 11:30:00'),
  (2, 1, 2, 'usage', -1.00, 'Order #P581230 (hot)', '2026-11-28 12:53:02'),
  (3, 3, 2, 'usage', -1.00, 'Order #P197270 (hot)', '2026-11-28 13:03:18'),
  (4, 1, 2, 'usage', -1.00, 'Order #P694018 (hot)', '2026-11-28 13:11:38'),
  (5, 2, 2, 'usage', -1.00, 'Order #P694018 (hot)', '2026-11-28 13:11:38'),
  (6, 3, 2, 'usage', -1.00, 'Order #P694018 (hot)', '2026-11-28 13:11:38'),
  (7, 6, 2, 'usage', -1.00, 'Order #P694018 (hot)', '2026-11-28 13:11:38'),
  (8, 5, 2, 'usage', -1.00, 'Order #P694018 (16oz)', '2026-11-28 13:11:38'),
  (9, 4, 2, 'usage', -1.00, 'Order #P694018 (hot)', '2026-11-28 13:11:38'),
  (10, 7, 2, 'usage', -1.00, 'Order #P694018 (hot)', '2026-11-28 13:11:38'),
  (11, 8, 2, 'usage', -1.00, 'Order #P694018 (hot)', '2026-11-28 13:11:38'),
  (12, 9, 2, 'usage', -1.00, 'Order #P694018 (hot)', '2026-11-28 13:11:38'),
  (13, 3, 2, 'usage', -1.00, 'Order #P900683 (hot)', '2026-11-28 13:15:02'),
  (14, 2, 2, 'usage', -1.00, 'Order #P900683 (hot)', '2026-11-28 13:15:02'),
  (15, 1, 2, 'usage', -1.00, 'Order #P900683 (hot)', '2026-11-28 13:15:02'),
  (16, 3, 2, 'usage', -1.00, 'Order #P927691 (hot)', '2026-11-28 13:15:28'),
  (17, 9, 1, 'adjustment', 22.00, 'Inventory update', '2026-11-28 13:38:28'),
  (18, 10, 1, 'adjustment', 49.00, 'Inventory update', '2026-11-28 14:14:27'),
  (19, 11, 1, 'adjustment', 49.00, 'Inventory update', '2026-11-28 14:15:01'),
  (20, 12, 1, 'adjustment', 49.00, 'Inventory update', '2026-11-28 14:15:22'),
  (21, 13, 1, 'adjustment', 49.00, 'Inventory update', '2026-11-28 14:15:42'),
  (22, 14, 1, 'adjustment', 49.00, 'Inventory update', '2026-11-28 14:16:07'),
  (23, 15, 1, 'adjustment', 49.00, 'Inventory update', '2026-11-28 14:17:51'),
  (24, 16, 1, 'adjustment', 49.00, 'Inventory update', '2026-11-28 14:18:17'),
  (25, 17, 1, 'adjustment', 49.00, 'Inventory update', '2026-11-28 14:18:32'),
  (26, 18, 1, 'adjustment', 49.00, 'Inventory update', '2026-11-28 14:20:52'),
  (27, 19, 1, 'adjustment', 49.00, 'Inventory update', '2026-11-28 14:21:12'),
  (28, 20, 1, 'adjustment', 49.00, 'Inventory update', '2026-11-28 14:21:39'),
  (29, 21, 1, 'adjustment', 49.00, 'Inventory update', '2026-11-28 14:22:51'),
  (30, 22, 1, 'adjustment', 49.00, 'Inventory update', '2026-11-28 14:23:39'),
  (31, 23, 1, 'adjustment', 49.00, 'Inventory update', '2026-11-28 14:25:49'),
  (32, 24, 1, 'adjustment', 49.00, 'Inventory update', '2026-11-28 14:26:15'),
  (33, 25, 1, 'adjustment', 49.00, 'Inventory update', '2026-11-28 14:27:04'),
  (34, 26, 1, 'adjustment', 49.00, 'Inventory update', '2026-11-28 14:57:00'),
  (35, 27, 1, 'adjustment', 49.00, 'Inventory update', '2026-11-28 14:58:15'),
  (36, 28, 1, 'adjustment', 49.00, 'Inventory update', '2026-11-28 14:58:36'),
  (37, 29, 1, 'adjustment', 49.00, 'Inventory update', '2026-11-28 14:58:54'),
  (38, 30, 1, 'adjustment', 49.00, 'Inventory update', '2026-11-28 15:08:54'),
  (39, 31, 1, 'adjustment', 49.00, 'Inventory update', '2026-11-28 15:09:32'),
  (40, 32, 1, 'adjustment', 50.00, 'Inventory update', '2026-11-28 15:24:43'),
  (41, 33, 1, 'adjustment', 50.00, 'Inventory update', '2026-11-28 15:25:03'),
  (42, 34, 1, 'adjustment', 50.00, 'Inventory update', '2026-11-28 15:25:31'),
  (43, 35, 1, 'adjustment', 50.00, 'Inventory update', '2026-11-28 15:25:56'),
  (44, 36, 1, 'adjustment', 50.00, 'Inventory update', '2026-11-28 15:26:11'),
  (45, 37, 1, 'adjustment', 50.00, 'Inventory update', '2026-11-28 15:26:26'),
  (46, 38, 1, 'adjustment', 50.00, 'Inventory update', '2026-11-28 15:26:41');

-- --------------------------------------------
-- Table structure for `stock_requests`
-- --------------------------------------------
DROP TABLE IF EXISTS `stock_requests`;
CREATE TABLE `stock_requests` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `inventory_item_id` int(11) NOT NULL,
  `cup_variant` varchar(20) DEFAULT NULL,
  `requested_by` int(11) NOT NULL,
  `quantity` decimal(10,2) NOT NULL,
  `status` enum('pending','approved','rejected','completed') NOT NULL DEFAULT 'pending',
  `remarks` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `inventory_item_id` (`inventory_item_id`),
  KEY `requested_by` (`requested_by`),
  CONSTRAINT `stock_requests_ibfk_1` FOREIGN KEY (`inventory_item_id`) REFERENCES `inventory_items` (`id`),
  CONSTRAINT `stock_requests_ibfk_2` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------
-- Table structure for `backups`
-- --------------------------------------------
DROP TABLE IF EXISTS `backups`;
CREATE TABLE `backups` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `created_by` int(11) DEFAULT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_size_kb` int(11) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`id`),
  KEY `created_by` (`created_by`),
  CONSTRAINT `backups_ibfk_1` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------
-- Table structure for `shift_sales`
-- --------------------------------------------
DROP TABLE IF EXISTS `shift_sales`;
CREATE TABLE `shift_sales` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `shift_key` varchar(80) NOT NULL,
  `cashier_id` int(11) DEFAULT NULL,
  `account_name` varchar(100) NOT NULL,
  `shift_started_at` datetime NOT NULL,
  `logged_out_at` datetime NOT NULL,
  `total_orders` int(11) NOT NULL DEFAULT 0,
  `total_items` int(11) NOT NULL DEFAULT 0,
  `cash_total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `gcash_total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `other_total` decimal(10,2) NOT NULL DEFAULT 0.00,
  `total_sales` decimal(10,2) NOT NULL DEFAULT 0.00,
  `created_at` timestamp NOT NULL DEFAULT current_timestamp(),
  `updated_at` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`id`),
  UNIQUE KEY `shift_key` (`shift_key`),
  KEY `cashier_id` (`cashier_id`),
  CONSTRAINT `shift_sales_ibfk_1` FOREIGN KEY (`cashier_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=49 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Dumping data for `shift_sales`
INSERT INTO `shift_sales` (`id`, `shift_key`, `cashier_id`, `account_name`, `shift_started_at`, `logged_out_at`, `total_orders`, `total_items`, `cash_total`, `gcash_total`, `other_total`, `total_sales`, `created_at`, `updated_at`) VALUES
  (3, 'barista_2026-11-25T05:49:05.857Z', 2, 'Barista', '2026-11-25 13:49:05', '2026-11-25 13:49:35', 1, 5, 825.00, 0.00, 0.00, 825.00, '2026-11-25 13:49:35', '2026-11-25 13:49:35'),
  (5, 'barista_2026-11-25T06:06:46.367Z', 2, 'Barista', '2026-11-25 14:06:46', '2026-11-25 14:09:19', 0, 0, 0.00, 0.00, 0.00, 0.00, '2026-11-25 14:09:19', '2026-11-25 14:09:19'),
  (9, 'barista_2026-11-25T07:49:16.712Z', 2, 'Barista', '2026-11-25 08:49:16', '2026-11-28 11:30:13', 3, 16, 2665.00, 0.00, 0.00, 2665.00, '2026-11-25 16:41:13', '2026-11-28 11:30:14'),
  (26, 'barista_2026-11-28T03:30:13.888Z', 2, 'Barista', '2026-11-28 11:30:13', '2026-11-28 12:17:35', 0, 0, 0.00, 0.00, 0.00, 0.00, '2026-11-28 12:17:35', '2026-11-28 12:17:35'),
  (27, 'barista_2026-11-28T04:17:37.729Z', 2, 'Barista', '2026-11-28 12:17:37', '2026-11-28 12:17:45', 0, 0, 0.00, 0.00, 0.00, 0.00, '2026-11-28 12:17:46', '2026-11-28 12:17:46'),
  (28, 'barista_2026-11-28T04:17:48.821Z', 2, 'Barista', '2026-11-28 12:17:48', '2026-11-28 12:17:49', 0, 0, 0.00, 0.00, 0.00, 0.00, '2026-11-28 12:17:50', '2026-11-28 12:17:50'),
  (29, 'barista_2026-11-25T13:49:20+08:00', 2, 'Barista', '2026-11-25 13:49:20', '2026-11-28 14:19:51', 6, 20, 3260.00, 0.00, 0.00, 3260.00, '2026-11-28 12:19:00', '2026-11-28 14:19:51'),
  (38, 'barista_2026-11-28T05:02:21.655Z', 2, 'Barista', '2026-11-28 13:02:21', '2026-11-28 13:14:35', 2, 10, 1630.00, 0.00, 0.00, 1630.00, '2026-11-28 13:14:36', '2026-11-28 13:14:36'),
  (40, 'barista_2026-11-28T05:15:15.051Z', 2, 'Barista', '2026-11-28 13:15:15', '2026-11-28 13:15:49', 1, 1, 170.00, 0.00, 0.00, 170.00, '2026-11-28 13:15:49', '2026-11-28 13:15:49');

SET FOREIGN_KEY_CHECKS = 1;
