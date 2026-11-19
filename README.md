# Voodoo eSports Café Management System

A responsive POS, Ordering, and Inventory management system built with PHP, JavaScript, HTML, and CSS.

## Run Locally

Start PHP's built-in server from the project directory:

```powershell
C:\xampp\php\php.exe -S localhost:8000
```

Open:

```text
http://localhost:8000
```

## MVC Structure

```text
Model/
  AppModel.js
  config.php

View/
  AppView.js
  index.php

Controller/
  AppController.js
  AppBootstrap.js
  index.php
```

- `Model` manages products, cart, orders, inventory, and restock requests.
- `View` renders pages, tables, dialogs, and shift summaries.
- `Controller` handles login, navigation, permissions, and button actions.

## Accounts

### Admin

- Username: `admin`
- Password: `admin`
- Access: Dashboard, Inventory, Restock Requests, Order Log, and Backup

### Barista

- Username: `barista`
- Password: `barista`
- Access: Dashboard, POS, Ordering, Restock Requests, and Order Log

## Features

- Role-based account access
- POS and Ordering workflows
- Product-level inventory monitoring
- Barista restock requests
- Admin restock approval and rejection
- Per-shift order logging
- Printable shift sales summary
- Cart quantity controls
- Product and inventory search
- Responsive desktop and mobile layouts

## Database

The MySQL schema is available in:

```text
database.sql
```
