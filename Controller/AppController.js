class AppController {
  constructor(model, view) { this.model = model; this.view = view; this.bindGlobal(); }

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
    this.view.nav(role === 'admin'
      ? [['dashboard','â–¦','Dashboard'],['inventory','â—ˆ','Stock Monitor'],['alerts','!','Alerts'],['restock','â†»','Restock Requests'],['order-log','â‰¡','Order Log'],['backup','â†“','Backup Data']]
      : [['dashboard','â–¦','Dashboard'],['pos','âŠž','POS'],['ordering','ï¼‹','Ordering'],['restock','â†»','Request Restock'],['order-log','â‰¡','Order Log']]);
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
    if (menuSearch) menuSearch.oninput = event => { const grid = document.getElementById('posGrid') || document.getElementById('orderingGrid'); const query = event.target.value.toLowerCase(); grid.innerHTML = this.model.products.filter(product => product.name.toLowerCase().includes(query)).map(product => `<article class="product-card"><div class="product-image"><img src="${product.image}" alt="${product.name}"></div><div class="product-info"><div><h3>${product.name}</h3><p>${this.view.money(product.price)}</p></div><button class="add-button" type="button" data-action="add" data-id="${product.id}">ï¼‹</button></div></article>`).join('') || '<p>No products found.</p>'; this.bindDynamic(); };

    const inventorySearch = document.querySelector('[data-action="inventory-search"]');
    if (inventorySearch) inventorySearch.oninput = event => { const rows = document.getElementById('inventoryRows'); const query = event.target.value.toLowerCase(); rows.innerHTML = this.model.products.filter(product => (product.name + ' ' + product.category).toLowerCase().includes(query)).map(product => `<tr><td><strong>${product.name}</strong></td><td>${product.category}</td><td>${product.stock} cups</td><td>${this.view.money(product.price)}</td><td>${product.stock === 0 ? 'Out of stock' : product.stock <= 5 ? 'Low stock' : 'In stock'}</td><td><button class="row-action" type="button" data-action="manage" data-id="${product.id}">Manage</button></td></tr>`).join(''); this.bindDynamic(); };

    const restockForm = document.getElementById('restockForm');
    if (restockForm) restockForm.onsubmit = event => { event.preventDefault(); if (this.model.account.role === 'barista') { if (this.model.requestRestock(document.getElementById('restockProduct').value, document.getElementById('restockQuantity').value)) { this.view.toast('Restock request submitted'); this.navigate('restock'); } } else { const product = this.model.products.find(item => item.id === Number(document.getElementById('restockProduct').value)); product.stock += Number(document.getElementById('restockQuantity').value); this.view.toast('Product restocked'); this.navigate('inventory'); } };
  }

  action(button) {
    const action = button.dataset.action;
    if (action === 'add') {
      if (!this.model.addProductToCart(button.dataset.id)) return this.view.toast('Product is out of stock');
      this.view.renderCart(); this.view.toast('Item added');
    } else if (action === 'plus' || action === 'minus') {
      this.model.changeCartQuantity(button.dataset.id, action === 'plus' ? 1 : -1); this.view.renderCart();
    } else if (action === 'clear') {
      this.model.cart = []; this.view.renderCart();
    } else if (action === 'checkout') {
      if (!this.model.cart.length) return this.view.toast('Cart is empty');
      this.view.modal('Complete Order', `<p>Total: <strong>${this.view.money(this.model.totals().total)}</strong></p><label class="modal-field">Payment method<select id="paymentMethod"><option>Cash</option><option>GCash</option></select></label><button class="primary-action" type="button" data-action="confirm">Confirm Payment</button>`); this.bindDynamic();
    } else if (action === 'confirm') {
      const paymentMethod = document.getElementById('paymentMethod')?.value || 'Cash';
      this.model.recordOrder(paymentMethod); this.model.cart = []; this.view.renderCart(); this.view.closeModal(); this.view.toast('Order completed and logged');
    } else if (action === 'close' || action === 'close-summary') {
      this.view.closeModal();
      if (action === 'close-summary') { document.getElementById('appShell').classList.add('hidden'); document.getElementById('loginScreen').classList.remove('hidden'); }
    } else if (action === 'print-summary') {
      window.print();
    } else if (action === 'approve-request') {
      if (this.model.approveRestock(button.dataset.id)) { this.view.toast('Restock request approved'); this.navigate('restock'); }
    } else if (action === 'reject-request') {
      if (this.model.rejectRestock(button.dataset.id)) { this.view.toast('Restock request rejected'); this.navigate('restock'); }
    } else if (action === 'order-type') {
      document.querySelectorAll('[data-action="order-type"]').forEach(item => item.classList.remove('meta-active')); button.classList.add('meta-active');
    } else if (action === 'manage') {
      const product = button.dataset.id ? this.model.products.find(item => item.id === Number(button.dataset.id)) : null;
      this.view.modal(product ? 'Manage ' + product.name : 'Add Product', `<div class="form-grid"><label>Product name<input id="productName" value="${product ? product.name : ''}"></label><label>Category<select id="productCategory"><option>Coffee</option><option>Frappe</option><option>Refresher</option></select></label><label>Stock<input id="productStock" type="number" value="${product ? product.stock : 10}"></label><label>Price<input id="productPrice" type="number" value="${product ? product.price : 150}"></label></div><button class="primary-action" type="button" data-action="save" data-id="${product ? product.id : ''}">Save</button>`); this.bindDynamic();
    } else if (action === 'save') {
      const name = document.getElementById('productName').value.trim();
      if (!name) return this.view.toast('Product name required');
      const id = button.dataset.id;
      if (id) { const product = this.model.products.find(item => item.id === Number(id)); product.name = name; product.category = document.getElementById('productCategory').value; product.stock = Number(document.getElementById('productStock').value); product.price = Number(document.getElementById('productPrice').value); }
      else this.model.products.push(new Product(Date.now(), name, document.getElementById('productCategory').value, Number(document.getElementById('productPrice').value), Number(document.getElementById('productStock').value), 'assets/2.png'));
      this.view.closeModal(); this.navigate('inventory');
    } else if (action === 'backup') this.view.toast('Inventory backup created');
    else if (action === 'import') this.view.toast('Import window opened');
    else if (action === 'export') this.view.toast('Inventory exported');
    else if (action === 'restock') this.navigate('restock');
  }

  logout() { this.view.modal('Shift Summary', this.view.shiftSummary()); this.bindDynamic(); }
  primaryAction() { if (this.model.account.role === 'admin') this.navigate('restock'); else if (this.model.module === 'ordering') document.querySelector('[data-action="checkout"]')?.click(); else { this.model.cart = []; this.view.renderCart(); this.view.toast('New POS order started'); } }
}

