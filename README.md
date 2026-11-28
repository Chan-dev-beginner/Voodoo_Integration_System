# Development of a Web-based Integrated System with Sales Forecasting for Voodoo Esports Prime Imus

A responsive POS, QR Customer Ordering, Inventory Management, and Sales Forecasting web system built with **PHP**, **Python 3**, **MySQL**, **JavaScript**, **HTML**, and **CSS**.

---

## Key Features

### Admin Side
- **Dashboard & Live Sales Overview**: Real-time today's sales, order counts, average order value, 7-day sales bar chart, and recent activity feed.
- **Sales Forecasting (Admin-Only)**: Analyzes **Past ("Before")**, **Today ("Present")**, and **Predicted ("Future" 7-day & 30-day)** sales using **Least-Squares Linear Regression + Day-of-Week Seasonality** via `Model/sales_forecast.py` (with an automatic pure-PHP fallback in `Controller/api.php` when Python 3 is unavailable on shared hosting). Includes growth rate, trend direction, and product demand restock recommendations.
- **Stock Monitor & Alerts**: Product-level stock tracking, low-stock / out-of-stock alerts, CSV import/export, and product management.
- **Restock Approvals**: Approve or reject restock requests submitted by baristas.
- **Staff Accounts & Change Password**: Create Admin/Barista accounts, enable/disable accounts, and change account passwords.
- **Order Log & Backup Data**: View shift order logs, saved shift sales records, and download JSON backups.

### Barista Side
- **POS & Live Order Queue**: Color-coded order status cards & queue board (**Pending Approval** in orange, **In Queue** in blue, **Preparing** in green) with real-time polling for incoming QR and POS orders.
- **Barista Shift & Time Out Workflow**:
  - Logging in as a barista automatically archives previous unarchived orders, stores any pending completed shift sales into MySQL (`shift_sales`), and opens the QR Customer Ordering page.
  - Clicking **Time Out** (in the topbar or Shift Summary modal) transfers the shift's sales report to the MySQL `shift_sales` table, archives the shift's orders, and closes QR ordering until the next barista logs in.
- **Restock Requests & Shift Summary**: Submit restock requests and download printable PDF shift summaries.

### Customer QR Ordering (`order.php`)
- **Barista-Gated Access**: Automatically displays **"Ordering is Currently Closed"** when no barista is logged in, and opens once a barista signs in.
- **Multi-Quantity Ordering**: Quantity stepper (`− [qty] +`) on every menu card plus cart quantity controls.
- **Required Customer Info & Payment**: Requires **Customer Name** and **PC / Table #**, with **Cash** or **GCash** payment options only.
- **Name-Based Order Tracking**: Customers can track their live order status (`Approval → Queue → Preparing → Completed`) using their **inputted name**.

---

## Project Structure (MVC)

```text
Voodoo_Integration_System/
├── index.php                     # Entry point (redirects to View/)
├── order.php                     # Customer QR self-ordering page
├── database.sql                  # MySQL database schema
├── Controller/
│   ├── api.php                   # Admin-only Sales Forecasting API (Python + PHP fallback)
│   ├── orders_bridge.php         # QR order sync, barista online gating & shift_sales DB bridge
│   ├── AppBootstrap.js
│   ├── AppController.js
│   ├── AccountsController.js
│   ├── InventoryController.js
│   ├── PosController.js
│   ├── QueueController.js
│   └── SalesController.js
├── Model/
│   ├── config.php                # DB connection & LAN IP/QR URL detection
│   ├── sales_forecast.py         # Python 3 sales forecasting engine
│   ├── AppModel.js
│   ├── AuthModel.js
│   ├── InventoryModel.js
│   ├── PosModel.js
│   └── SalesModel.js
├── View/
│   ├── index.php                 # Main Admin & Barista app shell
│   ├── AppView.js
│   ├── AdminView.js
│   ├── DashboardView.js
│   ├── InventoryView.js
│   ├── PosView.js
│   ├── QueueView.js
│   └── SalesView.js
├── assets/
│   ├── styles.css                # Modular CSS manifest
│   ├── base.css, login.css, layout.css, dashboard.css
│   ├── pos.css, queue.css, ordering.css, inventory.css
│   ├── modals.css, forecast.css, responsive.css
│   ├── qrcode.min.js             # Local QR code generator
│   └── *.png, background.jpg
└── data/
    ├── qr_orders.json            # Shared QR order bridge file
    └── barista_session.json      # Active barista online/offline state
```

---

## Default Accounts

| Role    | Username  | Password  | Access |
|---------|-----------|-----------|--------|
| Admin   | `admin`   | `admin`   | Dashboard, Sales Forecast, Stock Monitor, Alerts, Restock Requests, Order Log, Accounts, Backup Data |
| Barista | `barista` | `barista` | POS, Order Queue, Dashboard, Request Restock, Order Log, Time Out |

---

## Setup & Running Locally (XAMPP)

1. Place the folder in `C:\xampp\htdocs\Voodoo_Integration_System`.
2. Start **Apache** and **MySQL** in XAMPP Control Panel.
3. Import `database.sql` into phpMyAdmin (`voodoo_esports_cafe`).
4. *(Optional for Python forecasting)* Install **Python 3** — `Controller/api.php` automatically detects Python 3, or falls back to pure PHP if Python 3 is unavailable.
5. Open in browser:
   ```text
   http://localhost/Voodoo_Integration_System/
   ```

### Scanning the QR Code from a Phone on the Same Wi-Fi
- Ensure your Windows Wi-Fi network profile is set to **Private** (Settings → Network & internet → Wi-Fi → Network profile type → **Private**) so Windows Firewall allows incoming connections to Apache on port `80`.
- Connect your phone to the same Wi-Fi/hotspot and scan the **Customer QR** from the Barista POS or Order Queue.

---

## System Outline & File Alignment

```text
1. Integrated System
     1.1. Requirements Analysis
          1.1.1. Interview Manager
          1.1.2. Interview Employees
          1.1.3. Scouting the Establishment
2. System Design
     2.1. User Interface and Experience — assets/styles.css, assets/base.css, assets/login.css, assets/layout.css, assets/dashboard.css, assets/pos.css, assets/queue.css, assets/ordering.css, assets/inventory.css, assets/modals.css, assets/forecast.css, assets/responsive.css
     2.2. Database Design — database.sql, database_infinityfree.sql, Model/config.php, Controller/db_sync.php, Controller/orders_bridge.php
3. System Development
     3.1. Authentication
          3.1.1. Login Module — View/index.php, Model/AuthModel.js, Controller/AccountsController.js, View/AdminView.js
     3.2. POS
          3.2.1. Dashboard — View/DashboardView.js
          3.2.2. Order Module — View/PosView.js, Controller/PosController.js, Model/PosModel.js
          3.2.3. Status Module — View/QueueView.js, Controller/QueueController.js, View/AppView.js
          3.2.4. Transaction Logs — View/SalesView.js, Controller/SalesController.js, Model/SalesModel.js
     3.3. Inventory Management
          3.3.1. Dashboard — View/DashboardView.js
          3.3.2. Stock Monitor — View/InventoryView.js, Controller/InventoryController.js, Model/InventoryModel.js
          3.3.3. Alert Module — View/InventoryView.js
          3.3.4. Restock Module — View/InventoryView.js, Model/InventoryModel.js, Controller/InventoryController.js
          3.3.5. Request Stock Module — View/InventoryView.js, Model/InventoryModel.js, Controller/InventoryController.js
          3.3.6. Backup Data Module — View/InventoryView.js, Controller/InventoryController.js
     3.4. Ordering System
          3.4.1. Dashboard — order.php, Controller/orders_bridge.php
          3.4.2. Menu Board — order.php, Controller/db_sync.php
          3.4.3. Ordering Module — order.php, Controller/orders_bridge.php
          3.4.4. Cart Module — order.php, assets/ordering.css
          3.4.5. Status Module — order.php, Controller/orders_bridge.php
     3.5. Sales Forecasting API
          3.5.1. Sales Revenue Forecast — Controller/api.php, Model/sales_forecast.py, View/AdminView.js
          3.5.2. Sales Trend and Growth — Controller/api.php, Model/sales_forecast.py, View/AdminView.js
          3.5.3. Product Demand Forecast — Controller/api.php, Model/sales_forecast.py, View/AdminView.js
4. Testing
     4.1. Alpha Testing
     4.2. Beta Testing
5. Deployment — index.php, Model/config.php, database_infinityfree.sql, data/barista_session.json, data/qr_orders.json, data/shift_sales_archive.json
6. Maintenance
     6.1. Bug Fixing
     6.2. System Updates
7. Documentation
     7.1. System Guidelines — README.md
     7.2. Manuscript
```
