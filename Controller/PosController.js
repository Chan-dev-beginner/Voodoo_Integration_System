Object.assign(AppController.prototype, {
  startLivePolling() {
    clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => this.refreshLiveData(), 3000);
  },

  stopLivePolling() {
    clearInterval(this.pollTimer);
    this.pollTimer = null;
  },

  async refreshLiveData() {
    if (!this.model.account) return;
    const prevOrdersJson = JSON.stringify(this.model.orders);
    const prevProductsJson = JSON.stringify(this.model.products);
    const prevPendingIds = new Set(this.model.orders.filter(o => o.status === 'pending').map(o => o.id));
    this.model.syncOrdersFromServer();
    this.model.syncProductsFromServer();

    // Also poll the server bridge for QR orders from other devices
    await this.model.pollQrOrdersBridge();

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
      if (this.model.module === 'dashboard') this.navigate('dashboard');
    }
    if (productsChanged) {
      const grid = document.getElementById('posGrid');
      const searchVal = document.querySelector('[data-action="menu-search"]')?.value?.trim();
      if (grid && !searchVal) grid.innerHTML = this.view.productGrid();
    }
  },

  bindSearchInputs() {
    const menuSearch = document.querySelector('[data-action="menu-search"]');
    if (menuSearch) {
      menuSearch.oninput = event => {
        const grid = document.getElementById('posGrid') || document.getElementById('orderingGrid');
        const query = event.target.value.toLowerCase();
        grid.innerHTML = this.model.products
          .filter(product => product.name.toLowerCase().includes(query))
          .map(product => `<article class="product-card"><div class="product-image"><img src="${product.image}" alt="${product.name}"></div><div class="product-info"><div><h3>${product.name}</h3><p>${this.view.money(product.price)}</p></div><button class="add-button" type="button" data-action="add" data-id="${product.id}" ${product.stock <= 0 ? 'disabled' : ''}>＋</button></div></article>`)
          .join('') || '<p>No products found.</p>';
      };
    }

    const inventorySearch = document.querySelector('[data-action="inventory-search"]');
    if (inventorySearch) {
      inventorySearch.oninput = event => {
        const rows = document.getElementById('inventoryRows');
        const query = event.target.value.toLowerCase();
        rows.innerHTML = this.model.products
          .filter(product => (product.name + ' ' + product.category).toLowerCase().includes(query))
          .map(product => `<tr><td><strong>${product.name}</strong></td><td>${product.category}</td><td>${product.stock} cups</td><td>${this.view.money(product.price)}</td><td>${product.stock === 0 ? 'Out of stock' : product.stock <= 5 ? 'Low stock' : 'In stock'}</td><td><button class="row-action" type="button" data-action="manage" data-id="${product.id}">Manage</button></td></tr>`)
          .join('');
      };
    }
  },

  addItem(button) {
    if (!this.model.addProductToCart(button.dataset.id)) return this.view.toast('Not enough stock');
    this.view.renderCart();
    this.view.toast('Item added');
  },

  changeQty(button, change) {
    if (!this.model.changeCartQuantity(button.dataset.id, change) && change > 0) {
      return this.view.toast('Not enough stock');
    }
    this.view.renderCart();
  },

  clearCart() {
    this.model.cart = [];
    this.view.renderCart();
  },

  setOrderType(button) {
    document.querySelectorAll('[data-action="order-type"]').forEach(i => i.classList.remove('meta-active'));
    button.classList.add('meta-active');
    this.model.orderType = button.textContent.toLowerCase().includes('take') ? 'take-out' : 'dine-in';
  },

  checkout() {
    if (!this.model.cart.length) return this.view.toast('Cart is empty');
    this.view.modal('Complete Order', `<p>Total: <strong>${this.view.money(this.model.totals().total)}</strong></p><label class="modal-field">Payment method<select id="paymentMethod"><option>Cash</option><option>GCash</option></select></label><button class="primary-action" type="button" data-action="confirm">Confirm Payment</button>`);
    this.bindDynamic();
  },

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
});
