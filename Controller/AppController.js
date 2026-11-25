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
      'restock': () => this.navigate('restock')
    };
    this.bindGlobal();
  }

  bindGlobal() {
    document.getElementById('togglePassword').onclick = () => { const password = document.getElementById('password'); password.type = password.type === 'password' ? 'text' : 'password'; };
    document.getElementById('loginAccount').onchange = event => { const role = event.target.value; document.getElementById('accountHint').textContent = role === 'admin' ? 'Admin: admin / admin' : 'Barista: barista / barista'; document.getElementById('username').value = role; document.getElementById('password').value = role; };
    document.getElementById('loginForm').onsubmit = event => { event.preventDefault(); const role = document.getElementById('loginAccount').value; const username = document.getElementById('username').value; const password = document.getElementById('password').value; const valid = (role === 'admin' && username === 'admin' && password === 'admin') || (role === 'barista' && username === 'barista' && password === 'barista'); if (!valid) return this.view.toast('Invalid username or password'); this.login(role); };
    document.getElementById('logoutButton').onclick = () => this.logout();
    document.getElementById('primaryAction').onclick = () => this.primaryAction();
    document.querySelector('.icon-action').onclick = () => this.view.toast('No new notifications');
  }

  login(role) {
    this.model.account = { role, name: role === 'admin' ? 'Admin' : 'Barista' };
    this.model.shiftStartedAt = new Date().toISOString();
    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appShell').classList.remove('hidden');
    document.getElementById('staffName').textContent = this.model.account.name;
    document.querySelector('.avatar').textContent = role === 'admin' ? 'A' : 'B';
    // The second item is unused: AppView.nav() picks icons by the first item (the module key).
    this.view.nav(role === 'admin'
      ? [['dashboard','','Dashboard'],['inventory','','Stock Monitor'],['alerts','','Alerts'],['restock','','Restock Requests'],['order-log','','Order Log'],['backup','','Backup Data']]
      : [['dashboard','','Dashboard'],['pos','','POS'],['ordering','','Ordering'],['restock','','Request Restock'],['order-log','','Order Log']]);
    this.navigate('dashboard');
    this.view.clock();
  }

  navigate(module) {
    this.model.module = module;
    if (['inventory','alerts','restock','backup','order-log'].includes(module)) this.model.module = 'inventory';
    else if (module === 'pos' || module === 'ordering') this.model.module = module;
    else this.model.module = 'dashboard';
    document.getElementById('pageLabel').textContent = this.model.account.role === 'admin' ? 'Inventory management' : 'Barista workspace';
    const titles = { dashboard:'Dashboard', pos:'POS', ordering:'Ordering', inventory:'Stock Monitor', alerts:'Alert Module', restock:'Restock Requests', backup:'Backup Data', 'order-log':'Shift Order Log' };
    document.getElementById('pageTitle').textContent = titles[module];
    let html;
    if (module === 'pos') html = this.view.pos();
    else if (module === 'ordering') html = this.view.ordering();
    else if (module === 'inventory') html = this.view.inventory();
    else if (module === 'alerts') html = this.view.alerts();
    else if (module === 'restock') html = this.view.restock();
    else if (module === 'order-log') html = this.view.shiftOrders();
    else if (module === 'backup') html = this.view.backup();
    else html = this.view.dashboard();
    document.getElementById('viewContainer').innerHTML = `<section class="module-view">${html}</section>`;
    this.view.renderCart();
    this.bindDynamic();
  }

  bindDynamic() {
    document.querySelectorAll('[data-module]').forEach(button => button.onclick = () => { document.querySelectorAll('[data-module]').forEach(item => item.classList.remove('active')); button.classList.add('active'); this.navigate(button.dataset.module); });
    document.querySelectorAll('[data-action]').forEach(button => button.onclick = () => this.action(button));

    const menuSearch = document.querySelector('[data-action="menu-search"]');
    if (menuSearch) menuSearch.oninput = event => { const grid = document.getElementById('posGrid') || document.getElementById('orderingGrid'); const query = event.target.value.toLowerCase(); grid.innerHTML = this.model.products.filter(product => product.name.toLowerCase().includes(query)).map(product => `<article class="product-card"><div class="product-image"><img src="${product.image}" alt="${product.name}"></div><div class="product-info"><div><h3>${product.name}</h3><p>${this.view.money(product.price)}</p></div><button class="add-button" type="button" data-action="add" data-id="${product.id}">＋</button></div></article>`).join('') || '<p>No products found.</p>'; this.bindDynamic(); };

    const inventorySearch = document.querySelector('[data-action="inventory-search"]');
    if (inventorySearch) inventorySearch.oninput = event => { const rows = document.getElementById('inventoryRows'); const query = event.target.value.toLowerCase(); rows.innerHTML = this.model.products.filter(product => (product.name + ' ' + product.category).toLowerCase().includes(query)).map(product => `<tr><td><strong>${product.name}</strong></td><td>${product.category}</td><td>${product.stock} cups</td><td>${this.view.money(product.price)}</td><td>${product.stock === 0 ? 'Out of stock' : product.stock <= 5 ? 'Low stock' : 'In stock'}</td><td><button class="row-action" type="button" data-action="manage" data-id="${product.id}">Manage</button></td></tr>`).join(''); this.bindDynamic(); };

    const restockForm = document.getElementById('restockForm');
    if (restockForm) restockForm.onsubmit = event => { event.preventDefault(); if (this.model.account.role === 'barista') { if (this.model.requestRestock(document.getElementById('restockProduct').value, document.getElementById('restockQuantity').value)) { this.view.toast('Restock request submitted'); this.navigate('restock'); } } else { const product = this.model.products.find(item => item.id === Number(document.getElementById('restockProduct').value)); product.stock += Number(document.getElementById('restockQuantity').value); this.model.saveProducts(); this.view.toast('Product restocked'); this.navigate('inventory'); } };
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
    this.model.changeCartQuantity(button.dataset.id, change);
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
    this.model.recordOrder(method);
    this.model.cart = [];
    this.view.renderCart();
    this.view.closeModal();
    this.view.toast('Order completed and logged');
  }

  closeSummary() {
    this.view.closeModal();
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

  logout() { this.view.modal('Shift Summary', this.view.shiftSummary()); this.bindDynamic(); }

  primaryAction() { if (this.model.account.role === 'admin') this.navigate('restock'); else if (this.model.module === 'ordering') document.querySelector('[data-action="checkout"]')?.click(); else { this.model.cart = []; this.view.renderCart(); this.view.toast('New POS order started'); } }
}