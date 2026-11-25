-- ============================================
-- Voodoo eSports Café Database
-- ============================================

-- ============================================
-- Users and Roles
-- ============================================

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  role ENUM('admin', 'cashier', 'barista', 'inventory', 'customer') NOT NULL,
  is_active TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================
-- Products and Categories
-- ============================================

CREATE TABLE categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE
);

CREATE TABLE products (
  id INT AUTO_INCREMENT PRIMARY KEY,
  category_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  description VARCHAR(255),
  price DECIMAL(10, 2) NOT NULL,
  image VARCHAR(255),
  is_available TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- ============================================
-- Product-Level Inventory
-- ============================================

CREATE TABLE inventory_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  product_id INT NOT NULL,
  quantity INT NOT NULL DEFAULT 0,
  minimum_quantity INT NOT NULL DEFAULT 5,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_inventory_product (product_id),
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- ============================================
-- Orders and Transactions
-- ============================================

CREATE TABLE orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_number VARCHAR(20) NOT NULL UNIQUE,
  customer_name VARCHAR(100) DEFAULT 'Walk-in Customer',
  table_note VARCHAR(50) NULL,
  cashier_id INT NULL,
  source ENUM('pos', 'qr') NOT NULL DEFAULT 'pos',
  order_type ENUM('dine-in', 'take-out') NOT NULL,
  status ENUM('pending', 'queue', 'preparing', 'completed', 'cancelled') NOT NULL DEFAULT 'pending',
  subtotal DECIMAL(10, 2) NOT NULL,
  tax DECIMAL(10, 2) NOT NULL,
  total DECIMAL(10, 2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (cashier_id) REFERENCES users(id)
);

CREATE TABLE order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  product_id INT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(10, 2) NOT NULL,
  line_total DECIMAL(10, 2) NOT NULL,
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id)
);

CREATE TABLE transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  cashier_id INT NULL,
  payment_method ENUM('cash', 'card', 'gcash', 'other') NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  reference_number VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (order_id) REFERENCES orders(id),
  FOREIGN KEY (cashier_id) REFERENCES users(id)
);

-- ============================================
-- Stock Movements and Restock Requests
-- ============================================

CREATE TABLE stock_movements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inventory_item_id INT NOT NULL,
  user_id INT NULL,
  movement_type ENUM('restock', 'adjustment', 'usage', 'request', 'return') NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  notes VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id),
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE stock_requests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  inventory_item_id INT NOT NULL,
  requested_by INT NOT NULL,
  quantity DECIMAL(10, 2) NOT NULL,
  status ENUM('pending', 'approved', 'rejected', 'completed') NOT NULL DEFAULT 'pending',
  remarks VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (inventory_item_id) REFERENCES inventory_items(id),
  FOREIGN KEY (requested_by) REFERENCES users(id)
);

-- ============================================
-- Database Backups
-- ============================================

CREATE TABLE backups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  created_by INT NULL,
  file_name VARCHAR(255) NOT NULL,
  file_size_kb INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- ============================================
-- Shift Sales Records (Saved on Barista Logout)
-- ============================================

CREATE TABLE shift_sales (
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
);

-- ============================================
-- Seed Default Users
-- ============================================

INSERT INTO users (username, password_hash, full_name, role, is_active) VALUES
  ('admin', 'admin', 'Admin', 'admin', 1),
  ('barista', 'barista', 'Barista', 'cashier', 1);

-- ============================================
-- Seed Categories and Products
-- ============================================

INSERT INTO categories (name) VALUES
  ('Coffee'),
  ('Frappe'),
  ('Refresher');

INSERT INTO products (id, category_id, name, description, price, image) VALUES
  (1, 1, 'Vanilla Latte', 'Espresso, milk and vanilla', 150.00, 'assets/2.png'),
  (2, 1, 'Caramel Machiato', 'Espresso, caramel and milk', 165.00, 'assets/3.png'),
  (3, 1, 'Mocha Iced', 'Chocolate, espresso and ice', 170.00, 'assets/4.png'),
  (4, 2, 'Matcha Frappe', 'Matcha, milk and cream', 185.00, 'assets/1.png'),
  (5, 3, 'Berry Refresher', 'Berry blend, citrus and ice', 155.00, 'assets/refreshers.png'),
  (6, 1, 'Iced Americano', 'Espresso and chilled water', 120.00, 'assets/3.png'),
  (7, 2, 'Chocolate Frappe', 'Chocolate, milk and ice', 180.00, 'assets/4.png'),
  (8, 3, 'Strawberry Matcha', 'Strawberry and matcha', 160.00, 'assets/1.png'),
  (9, 1, 'Salted Caramel', 'Espresso, caramel and cream', 175.00, 'assets/2.png');

INSERT INTO inventory_items (product_id, quantity, minimum_quantity) VALUES
  (1, 18, 5),
  (2, 12, 5),
  (3, 9, 5),
  (4, 4, 5),
  (5, 3, 5),
  (6, 22, 5),
  (7, 8, 5),
  (8, 0, 5),
  (9, 14, 5);
