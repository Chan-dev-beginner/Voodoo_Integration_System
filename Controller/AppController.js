class AppController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.handlers = {
      'add': b => this.addItem(b),
      'plus': b => this.changeQty(b, 1),
      'minus': b => this.changeQty(b, -1),
      'clear': () => this.clearCart(),
      'checkout': () => this.checkout(),
      'confirm': () => this.confirmPayment(),
      'close': () => this.view.closeModal(),
      'close-summary': () => this.closeSummary(),
      'approve-request': b => this.resolveRestock(b, 'approve'),
      'reject-request': b => this.resolveRestock(b, 'reject'),
      'order-type': b => this.setOrderType(b),
      'manage': b => this.manageProduct(b),
      'save': b => this.saveProduct(b),
      'view-order': b => this.viewOrder(b),
      'backup': () => this.createBackup(),
      'import': () => this.importInventory(),
      'export': () => this.exportInventory(),
      'download-summary': () => this.downloadSummary(),
      'restock': () => this.navigate('restock'),
      'show-qr': () => this.showQrModal(),
      'copy-qr': () => this.copyQrUrl(),
      'refresh-qr': () => this.refreshQrNetwork(),
      'regen-qr': () => this.renderQrCode(),
      'order-status': b => this.changeOrderStatus(b),
      'toggle-user': b => this.toggleUserAccount(b)
    };
    this.pollTimer = null;
    this.qrRefreshTimer = null;
    this.bindGlobal();
  }

  bindGlobal() {
    document.getElementById('togglePassword').onclick = () => { const password = document.getElementById('password'); password.type = password.type === 'password' ? 'text' : 'password'; };
    document.getElementById('loginAccount').onchange = event => { const role = event.target.value; document.getElementById('accountHint').textContent = role === 'admin' ? 'Admin: admin / admin' : 'Barista: barista / barista'; document.getElementById('username').value = role; document.getElementById('password').value = role; };
    document.getElementById('loginForm').onsubmit = event => {
      event.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      try {
        const user = this.model.loginUser(username, password);
        this.login(user);
      } catch (error) {
        this.view.toast(error.message || 'Invalid username or password');
      }
    };
    document.getElementById('logoutButton').onclick = () => this.logout();
    document.getElementById('primaryAction').onclick = () => this.primaryAction();
    document.querySelector('.icon-action').onclick = () => this.view.toast('No new notifications');

    // Delegate module and action button clicks so dynamic re-renders (e.g. cart updates) never lose handlers.
    document.addEventListener('click', event => {
      const moduleButton = event.target.closest('button[data-module]');
      if (moduleButton) {
        document.querySelectorAll('[data-module]').forEach(item => item.classList.remove('active'));
        moduleButton.classList.add('active');
        this.navigate(moduleButton.dataset.module);
        return;
      }

      const actionButton = event.target.closest('button[data-action]');
      if (actionButton) {
        this.action(actionButton);
      }
    });

    // Re-detect active network automatically if the device switches Wi-Fi/network while QR modal is open.
    window.addEventListener('online', () => {
      if (document.getElementById('qrCodeCanvas')) this.refreshQrNetwork();
    });
  }

  login(userOrRole) {
    const user = typeof userOrRole === 'string'
      ? { id: null, username: userOrRole, role: userOrRole, fullName: userOrRole === 'admin' ? 'Admin' : 'Barista' }
      : userOrRole;
    const role = user.role === 'admin' ? 'admin' : 'barista';
    this.model.account = { id: user.id || null, username: user.username || role, role, name: user.fullName || (role === 'admin' ? 'Admin' : 'Barista') };
    this.model.shiftStartedAt = new Date().toISOString();
    this.model.orderType = 'dine-in';
    this.model.cart = [];
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appShell').classList.remove('hidden');
    document.getElementById('staffName').textContent = this.model.account.name;
    document.querySelector('.avatar').textContent = (this.model.account.name || 'U').charAt(0).toUpperCase();
    // The second item is unused: AppView.nav() picks icons by the first item (the module key).
    this.view.nav(role === 'admin'
      ? [['dashboard','','Dashboard'],['inventory','','Stock Monitor'],['alerts','','Alerts'],['restock','','Restock Requests'],['order-log','','Order Log'],['accounts','','Accounts'],['backup','','Backup Data']]
      : [['pos','','POS'],['order-queue','','Order Queue'],['dashboard','','Dashboard'],['restock','','Request Restock'],['order-log','','Order Log']]);
    this.navigate(role === 'barista' ? 'pos' : 'dashboard');
    this.view.clock();
    this.refreshLiveData();
    this.startLivePolling();
  }

  startLivePolling() {
    clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => this.refreshLiveData(), 3000);
  }

  stopLivePolling() {
    clearInterval(this.pollTimer);
    this.pollTimer = null;
  }

  refreshLiveData() {
    if (!this.model.account) return;
    const prevOrdersJson = JSON.stringify(this.model.orders);
    const prevProductsJson = JSON.stringify(this.model.products);
    const prevPendingIds = new Set(this.model.orders.filter(o => o.status === 'pending').map(o => o.id));
    this.model.syncOrdersFromServer();
    this.model.syncProductsFromServer();

    const ordersChanged = JSON.stringify(this.model.orders) !== prevOrdersJson;
    const productsChanged = JSON.stringify(this.model.products) !== prevProductsJson;
    if (!ordersChanged && !productsChanged) return;

    const newPendingQr = this.model.orders.filter(o => o.status === 'pending' && o.source === 'qr' && !prevPendingIds.has(o.id));
    if (newPendingQr.length && this.model.account.role === 'barista') {
      this.view.toast(`New QR order ${newPendingQr[0].id} awaiting approval`);
    }

    if (ordersChanged) {
      const strip = document.getElementById('posQueueStrip');
      if (strip) strip.innerHTML = this.view.posQueueStrip();
      if (this.model.module === 'order-queue') this.navigate('order-queue');
    }
    if (productsChanged) {
      const grid = document.getElementById('posGrid');
      const searchVal = document.querySelector('[data-action="menu-search"]')?.value?.trim();
      if (grid && !searchVal) grid.innerHTML = this.view.productGrid();
    }
  }

  navigate(module) {
    this.model.module = module;
    if (['inventory','alerts','restock','backup','order-log','accounts'].includes(module)) this.model.module = 'inventory';
    else if (module === 'pos' || module === 'ordering' || module === 'order-queue') this.model.module = module;
    else this.model.module = 'dashboard';
    document.getElementById('pageLabel').textContent = this.model.account.role === 'admin' ? 'Inventory management' : 'Barista workspace';
    const titles = { dashboard:'Dashboard', pos:'POS', 'order-queue':'Order Queue', ordering:'Ordering', inventory:'Stock Monitor', alerts:'Alert Module', restock:'Restock Requests', backup:'Backup Data', 'order-log':'Shift Order Log', accounts:'Staff Accounts' };
    document.getElementById('pageTitle').textContent = titles[module];
    let html;
    if (module === 'pos') html = this.view.pos();
    else if (module === 'order-queue') html = this.view.orderQueue();
    else if (module === 'ordering') html = this.view.ordering();
    else if (module === 'inventory') html = this.view.inventory();
    else if (module === 'alerts') html = this.view.alerts();
    else if (module === 'restock') html = this.view.restock();
    else if (module === 'order-log') html = this.view.shiftOrders();
    else if (module === 'accounts') html = this.view.accounts();
    else if (module === 'backup') html = this.view.backup();
    else html = this.view.dashboard();
    document.getElementById('viewContainer').innerHTML = `<section class="module-view">${html}</section>`;
    this.view.renderCart();
    this.bindDynamic();
    if (module === 'order-log') this.loadSavedSalesRecords();
    if (module === 'accounts') this.loadAccounts();
  }

  bindDynamic() {
    const menuSearch = document.querySelector('[data-action="menu-search"]');
    if (menuSearch) menuSearch.oninput = event => { const grid = document.getElementById('posGrid') || document.getElementById('orderingGrid'); const query = event.target.value.toLowerCase(); grid.innerHTML = this.model.products.filter(product => product.name.toLowerCase().includes(query)).map(product => `<article class="product-card"><div class="product-image"><img src="${product.image}" alt="${product.name}"></div><div class="product-info"><div><h3>${product.name}</h3><p>${this.view.money(product.price)}</p></div><button class="add-button" type="button" data-action="add" data-id="${product.id}" ${product.stock <= 0 ? 'disabled' : ''}>＋</button></div></article>`).join('') || '<p>No products found.</p>'; };

    const inventorySearch = document.querySelector('[data-action="inventory-search"]');
    if (inventorySearch) inventorySearch.oninput = event => { const rows = document.getElementById('inventoryRows'); const query = event.target.value.toLowerCase(); rows.innerHTML = this.model.products.filter(product => (product.name + ' ' + product.category).toLowerCase().includes(query)).map(product => `<tr><td><strong>${product.name}</strong></td><td>${product.category}</td><td>${product.stock} cups</td><td>${this.view.money(product.price)}</td><td>${product.stock === 0 ? 'Out of stock' : product.stock <= 5 ? 'Low stock' : 'In stock'}</td><td><button class="row-action" type="button" data-action="manage" data-id="${product.id}">Manage</button></td></tr>`).join(''); };

    const restockForm = document.getElementById('restockForm');
    if (restockForm) restockForm.onsubmit = event => { event.preventDefault(); if (this.model.account.role === 'barista') { if (this.model.requestRestock(document.getElementById('restockProduct').value, document.getElementById('restockQuantity').value)) { this.view.toast('Restock request submitted'); this.navigate('restock'); } } else { const product = this.model.products.find(item => item.id === Number(document.getElementById('restockProduct').value)); product.stock += Number(document.getElementById('restockQuantity').value); this.model.saveProducts(); this.view.toast('Product restocked'); this.navigate('inventory'); } };

    const createAccountForm = document.getElementById('createAccountForm');
    if (createAccountForm) {
      createAccountForm.onsubmit = event => {
        event.preventDefault();
        try {
          this.model.createUser({
            fullName: document.getElementById('newFullName').value.trim(),
            role: document.getElementById('newRole').value,
            username: document.getElementById('newUsername').value.trim(),
            password: document.getElementById('newPassword').value
          });
          createAccountForm.reset();
          this.view.toast('Account created');
          this.loadAccounts();
        } catch (error) {
          this.view.toast(error.message || 'Could not create account');
        }
      };
    }
  }

  loadAccounts() {
    const tbody = document.getElementById('accountsTableBody');
    if (!tbody) return;
    const users = this.model.fetchUsers();
    tbody.innerHTML = users.length
      ? users.map(u => `<tr><td><strong>${u.full_name}</strong></td><td>${u.username}</td><td>${u.role === 'admin' ? 'Admin' : 'Barista'}</td><td><span class="status ${Number(u.is_active) === 1 ? 'done' : 'pending'}">${Number(u.is_active) === 1 ? 'Active' : 'Disabled'}</span></td><td>${u.username === 'admin' ? '—' : `<button class="row-action" type="button" data-action="toggle-user" data-id="${u.id}">${Number(u.is_active) === 1 ? 'Disable' : 'Enable'}</button>`}</td></tr>`).join('')
      : '<tr><td colspan="5">No accounts found.</td></tr>';
  }

  toggleUserAccount(button) {
    try {
      this.model.toggleUser(button.dataset.id);
      this.view.toast('Account status updated');
      this.loadAccounts();
    } catch (error) {
      this.view.toast(error.message || 'Could not update account');
    }
  }

  action(button) {
    const handler = this.handlers[button.dataset.action];
    if (handler) handler(button);
  }

  download(filename, text, mime) {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  stamp() { return new Date().toISOString().slice(0, 10); }

  createBackup() {
    const data = { createdAt: new Date().toISOString(), products: this.model.products, orders: this.model.orders, restockRequests: this.model.restockRequests };
    this.download(`voodoo-backup-${this.stamp()}.json`, JSON.stringify(data, null, 2), 'application/json');
    try { localStorage.setItem('voodooLastBackup', data.createdAt); } catch (error) { /* ignore */ }
    this.view.toast('Backup downloaded');
    if (this.model.module === 'inventory') this.navigate('backup');
  }

  exportInventory() {
    const cell = value => `"${String(value).replace(/"/g, '""')}"`;
    const rows = [['name', 'category', 'price', 'stock'], ...this.model.products.map(p => [p.name, p.category, p.price, p.stock])];
    this.download(`voodoo-inventory-${this.stamp()}.csv`, rows.map(row => row.map(cell).join(',')).join('\n'), 'text/csv');
    this.view.toast('Inventory exported');
  }

  importInventory() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';
    input.onchange = () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const categories = ['Coffee', 'Frappe', 'Refresher'];
        const lines = String(reader.result).split(/\r?\n/).filter(line => line.trim());
        let count = 0;
        lines.slice(1).forEach(line => {
          const cols = line.split(',').map(value => value.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
          const [name, category, price, stock] = cols;
          if (!name || isNaN(Number(price)) || isNaN(Number(stock))) return;
          const cat = categories.includes(category) ? category : 'Coffee';
          const existing = this.model.products.find(p => p.name.toLowerCase() === name.toLowerCase());
          if (existing) Object.assign(existing, { category: cat, price: Number(price), stock: Number(stock) });
          else this.model.products.push(new Product(Date.now() + count, name, cat, Number(price), Number(stock), 'assets/2.png'));
          count++;
        });
        this.model.saveProducts();
        this.view.toast(count ? `${count} product(s) imported` : 'No valid rows found (expected: name,category,price,stock)');
        this.navigate('inventory');
      };
      reader.readAsText(file);
    };
    input.click();
  }

  downloadSummary() {
    const element = document.querySelector('.shift-summary');
    if (!element) return;
    if (typeof html2pdf === 'undefined') {
      this.view.toast('PDF library not loaded, opening print dialog');
      return window.print();
    }
    const actions = element.querySelector('.summary-actions');
    if (actions) actions.style.display = 'none';
    html2pdf().set({
      margin: 10,
      filename: `shift-summary-${this.stamp()}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(element).save()
      .then(() => this.view.toast('PDF downloaded'))
      .catch(() => this.view.toast('Could not create PDF'))
      .finally(() => { if (actions) actions.style.display = ''; });
  }

  addItem(button) {
    if (!this.model.addProductToCart(button.dataset.id)) return this.view.toast('Not enough stock');
    this.view.renderCart();
    this.view.toast('Item added');
  }

  changeQty(button, change) {
    if (!this.model.changeCartQuantity(button.dataset.id, change) && change > 0) {
      return this.view.toast('Not enough stock');
    }
    this.view.renderCart();
  }

  clearCart() {
    this.model.cart = [];
    this.view.renderCart();
  }

  checkout() {
    if (!this.model.cart.length) return this.view.toast('Cart is empty');
    this.view.modal('Complete Order', `<p>Total: <strong>${this.view.money(this.model.totals().total)}</strong></p><label class="modal-field">Payment method<select id="paymentMethod"><option>Cash</option><option>GCash</option></select></label><button class="primary-action" type="button" data-action="confirm">Confirm Payment</button>`);
    this.bindDynamic();
  }

  confirmPayment() {
    const method = document.getElementById('paymentMethod')?.value || 'Cash';
    try {
      const order = this.model.placePosOrder(method);
      this.model.cart = [];
      this.view.renderCart();
      this.view.closeModal();
      const strip = document.getElementById('posQueueStrip');
      if (strip) strip.innerHTML = this.view.posQueueStrip();
      this.view.toast(`Order ${order.id} queued for barista approval`);
    } catch (error) {
      this.view.toast(error.message || 'Failed to queue order');
    }
  }

  changeOrderStatus(button) {
    const orderNumber = button.dataset.id;
    const nextStatus = button.dataset.status;
    button.disabled = true;
    try {
      this.model.updateOrderStatus(orderNumber, nextStatus);
      const strip = document.getElementById('posQueueStrip');
      if (strip) strip.innerHTML = this.view.posQueueStrip();
      const grid = document.getElementById('posGrid');
      if (grid) grid.innerHTML = this.view.productGrid();
      if (this.model.module === 'order-queue') this.navigate('order-queue');
      const labels = { queue: 'Approved to Queue', preparing: 'Moved to Preparing', completed: 'Order Completed', cancelled: 'Order Rejected' };
      this.view.toast(`${orderNumber}: ${labels[nextStatus] || nextStatus}`);
    } catch (error) {
      button.disabled = false;
      this.view.toast(error.message || 'Status update failed');
    }
  }

  showQrModal() {
    const qrInfo = this.model.fetchQrInfo();
    this.view.modal('Customer Ordering QR Code', this.view.qrModal(qrInfo));
    this.bindQrControls();
    this.renderQrCode();
  }

  bindQrControls() {
    const select = document.getElementById('qrNetworkSelect');
    const urlInput = document.getElementById('qrUrlInput');
    if (select && urlInput) {
      select.onchange = () => {
        urlInput.value = select.value;
        this.renderQrCode();
      };
    }
    if (urlInput) {
      urlInput.oninput = () => this.renderQrCode();
    }
  }

  refreshQrNetwork() {
    const qrInfo = this.model.fetchQrInfo();
    const urlInput = document.getElementById('qrUrlInput');
    const label = document.getElementById('qrNetworkLabel');
    if (!urlInput) return;
    urlInput.value = qrInfo.orderingUrl;
    if (label) label.textContent = `Network: ${qrInfo.networkAdapter} (${qrInfo.detectedIp})`;
    this.renderQrCode();
    this.view.toast(`QR configured for ${qrInfo.networkAdapter} (${qrInfo.detectedIp})`);
  }

  renderQrCode() {
    const container = document.getElementById('qrCodeCanvas');
    const input = document.getElementById('qrUrlInput');
    if (!container || !input) return;
    const url = input.value.trim();
    container.innerHTML = '';
    const link = document.querySelector('.qr-open-link');
    if (link) link.href = url;
    if (typeof QRCode !== 'undefined') {
      new QRCode(container, { text: url, width: 210, height: 210, colorDark: '#101725', colorLight: '#ffffff' });
    } else {
      container.innerHTML = '<p class="login-hint">QR library offline — share or open the URL below.</p>';
    }
  }

  copyQrUrl() {
    const input = document.getElementById('qrUrlInput');
    if (!input) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(input.value).then(() => this.view.toast('Ordering link copied'));
    } else {
      input.select();
      document.execCommand('copy');
      this.view.toast('Ordering link copied');
    }
  }

  closeSummary() {
    this.stopLivePolling();
    this.view.closeModal();
    this.model.account = null;
    this.model.cart = [];
    document.getElementById('appShell').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
  }

  resolveRestock(button, type) {
    const ok = type === 'approve'
      ? this.model.approveRestock(button.dataset.id)
      : this.model.rejectRestock(button.dataset.id);
    if (!ok) return;
    this.view.toast(`Restock request ${type === 'approve' ? 'approved' : 'rejected'}`);
    this.navigate('restock');
  }

  setOrderType(button) {
    document.querySelectorAll('[data-action="order-type"]').forEach(i => i.classList.remove('meta-active'));
    button.classList.add('meta-active');
    this.model.orderType = button.textContent.toLowerCase().includes('take') ? 'take-out' : 'dine-in';
  }

  manageProduct(button) {
    const product = button.dataset.id ? this.model.products.find(i => i.id === Number(button.dataset.id)) : null;
    this.view.modal(product ? 'Manage ' + product.name : 'Add Product', `<div class="form-grid"><label>Product name<input id="productName" value="${product ? product.name : ''}"></label><label>Category<select id="productCategory"><option>Coffee</option><option>Frappe</option><option>Refresher</option></select></label><label>Stock<input id="productStock" type="number" value="${product ? product.stock : 10}"></label><label>Price<input id="productPrice" type="number" value="${product ? product.price : 150}"></label></div><button class="primary-action" type="button" data-action="save" data-id="${product ? product.id : ''}">Save</button>`);
    this.bindDynamic();
  }

  saveProduct(button) {
    const name = document.getElementById('productName').value.trim();
    if (!name) return this.view.toast('Product name required');
    const category = document.getElementById('productCategory').value;
    const stock = Number(document.getElementById('productStock').value);
    const price = Number(document.getElementById('productPrice').value);
    const id = button.dataset.id;
    if (id) {
      Object.assign(this.model.products.find(i => i.id === Number(id)), { name, category, stock, price });
    } else {
      this.model.products.push(new Product(Date.now(), name, category, price, stock, 'assets/2.png'));
    }
    this.model.saveProducts();
    this.view.closeModal();
    this.navigate('inventory');
  }

  viewOrder(button) {
    const order = this.model.orders.find(i => i.id === button.dataset.id);
    if (!order) return this.view.toast('Order not found');
    const items = order.items.map(i => `<tr><td>${i.name}</td><td>${i.quantity}</td><td>${this.view.money(i.price)}</td><td><strong>${this.view.money(i.total)}</strong></td></tr>`).join('');
    this.view.modal(`Order ${order.id}`, `
      <div class="order-detail-meta">
        <p>Cashier<br><strong>${order.account}</strong></p>
        <p>Payment<br><strong>${order.paymentMethod}</strong></p>
        <p>Time<br><strong>${new Date(order.time).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}</strong></p>
      </div>
      <table class="summary-table"><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${items}</tbody></table>
      <div class="shift-summary-total"><span>Total</span><strong>${this.view.money(order.total)}</strong></div>
    `);
    this.bindDynamic();
  }

  logout() {
    this.view.modal('Shift Summary', this.view.shiftSummary());
    this.bindDynamic();
    if (this.model.account?.role === 'barista') {
      this.saveBaristaShiftSales();
    }
  }

  saveBaristaShiftSales() {
    const statusEl = document.getElementById('shiftSaveStatus');
    try {
      const result = this.model.saveShiftSalesToDatabase();
      const shift = this.view.formatShiftPeriod(this.model.shiftStartedAt, result.loggedOutAt || new Date());
      if (statusEl) {
        statusEl.className = 'status done';
        statusEl.textContent = `Saved (${shift.label} · ${result.totalOrders} order(s))`;
      }
      this.view.toast('Shift sales record saved');
    } catch (error) {
      if (statusEl) {
        statusEl.className = 'status pending';
        statusEl.textContent = `Save failed: ${error.message}`;
      }
    }
  }

  loadSavedSalesRecords() {
    const tbody = document.getElementById('savedShiftSalesBody');
    if (!tbody) return;
    const records = this.model.fetchSavedSalesRecords();
    tbody.innerHTML = records.length
      ? records.map(record => {
          const shift = this.view.formatShiftPeriod(record.shift_started_at, record.logged_out_at);
          return `<tr><td><strong>${shift.label}</strong><br><small style="color:var(--muted)">${shift.range}</small></td><td>${record.account_name}</td><td>${record.total_orders}</td><td>${record.total_items}</td><td>${this.view.money(record.cash_total)}</td><td>${this.view.money(record.gcash_total)}</td><td><strong>${this.view.money(record.total_sales)}</strong></td><td>${new Date(record.logged_out_at.replace(' ', 'T')).toLocaleString('en-PH', { hour12: true })}</td></tr>`;
        }).join('')
      : '<tr><td colspan="8">No saved shift sales records yet.</td></tr>';
  }

  primaryAction() { if (this.model.account.role === 'admin') this.navigate('restock'); else if (this.model.module === 'ordering') document.querySelector('[data-action="checkout"]')?.click(); else { this.model.cart = []; this.view.renderCart(); this.view.toast('New POS order started'); } }
}