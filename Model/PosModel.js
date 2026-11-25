Object.assign(AppModel.prototype, {
  addProductToCart(id) {
    const product = this.products.find(item => item.id === Number(id));
    if (!product || product.stock <= 0) return false;
    const cartItem = this.cart.find(item => item.id === product.id);
    if (cartItem) {
      if (cartItem.quantity >= product.stock) return false;
      cartItem.quantity++;
    } else {
      this.cart.push({ ...product, quantity: 1 });
    }
    return true;
  },

  changeCartQuantity(id, change) {
    const item = this.cart.find(cartItem => cartItem.id === Number(id));
    if (!item) return false;
    const product = this.products.find(p => p.id === item.id);
    if (change > 0 && product && item.quantity >= product.stock) return false;
    item.quantity += change;
    if (item.quantity <= 0) this.cart = this.cart.filter(cartItem => cartItem.id !== Number(id));
    return true;
  },

  totals() {
    const subtotal = this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return { subtotal, tax: 0, total: subtotal };
  },

  getActiveOrders() {
    return this.orders.filter(order => !order.archived && ['pending', 'queue', 'preparing'].includes(order.status));
  },

  syncProductsFromServer() {
    const saved = this.load('voodooProducts', null);
    if (saved) {
      this.products = saved.map(p => new Product(p.id, p.name, p.category, p.price, p.stock, p.image));
    }
    return this.products;
  },

  syncOrdersFromServer() {
    this.orders = this.load('voodooShiftOrders', []);
    return this.orders;
  },

  async pollQrOrdersBridge() {
    try {
      const resp = await fetch('Controller/orders_bridge.php?action=poll');
      const data = await resp.json();
      if (data.ok && Array.isArray(data.orders)) {
        let changed = false;
        for (const qrOrder of data.orders) {
          if (!this.orders.find(o => o.id === qrOrder.id)) {
            this.orders.unshift(qrOrder);
            this.syncToDb('save_order', qrOrder);
            changed = true;
          }
        }
        if (changed) this.save('voodooShiftOrders', this.orders);
        return changed;
      }
    } catch (err) { /* offline or bridge unavailable */ }
    return false;
  },

  async updateQrOrderBridge(orderId, status) {
    try {
      await fetch('Controller/orders_bridge.php?action=update_status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status })
      });
    } catch (err) { /* silent — localStorage is primary */ }
  },

  placePosOrder(paymentMethod) {
    if (!this.cart.length) throw new Error('Cart is empty');
    const totals = this.totals();
    const order = {
      id: '#P' + String(Date.now()).slice(-6),
      customerName: 'Walk-in Customer',
      tableNote: '',
      source: 'pos',
      orderType: this.orderType || 'dine-in',
      status: 'pending',
      paymentMethod,
      cashierId: this.account?.id || null,
      cashierUsername: this.account?.username || 'barista',
      account: this.account?.name || 'Barista',
      time: new Date().toISOString(),
      items: this.cart.map(item => ({
        productId: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        total: item.price * item.quantity
      })),
      subtotal: totals.subtotal,
      tax: totals.tax,
      total: totals.total
    };
    this.orders = this.load('voodooShiftOrders', []);
    this.orders.unshift(order);
    this.save('voodooShiftOrders', this.orders);
    this.syncToDb('save_order', order);
    return order;
  },

  updateOrderStatus(orderNumber, nextStatus) {
    this.orders = this.load('voodooShiftOrders', []);
    this.syncProductsFromServer();

    const order = this.orders.find(o => o.id === orderNumber);
    if (!order) throw new Error('Order not found.');

    const allowed = {
      pending: ['queue', 'cancelled'],
      queue: ['preparing', 'cancelled'],
      preparing: ['completed', 'cancelled']
    };
    if (!(allowed[order.status] || []).includes(nextStatus)) {
      throw new Error(`Cannot change order from ${order.status} to ${nextStatus}.`);
    }

    if (order.status === 'pending' && nextStatus === 'queue') {
      for (const item of order.items) {
        const product = this.products.find(p => p.id === Number(item.productId) || p.name === item.name);
        if (product && product.stock < item.quantity) {
          throw new Error(`Insufficient stock to approve ${product.name}.`);
        }
      }
      for (const item of order.items) {
        const product = this.products.find(p => p.id === Number(item.productId) || p.name === item.name);
        if (product) product.stock = Math.max(0, product.stock - item.quantity);
      }
      this.saveProducts();
    } else if ((order.status === 'queue' || order.status === 'preparing') && nextStatus === 'cancelled') {
      for (const item of order.items) {
        const product = this.products.find(p => p.id === Number(item.productId) || p.name === item.name);
        if (product) product.stock += item.quantity;
      }
      this.saveProducts();
    }

    order.status = nextStatus;
    if (!order.cashierUsername && this.account) {
      order.cashierId = this.account.id || null;
      order.cashierUsername = this.account.username;
      order.account = order.source === 'qr' ? `QR (${this.account.name})` : this.account.name;
    }
    this.save('voodooShiftOrders', this.orders);
    this.syncToDb('update_order_status', {
      id: orderNumber,
      status: nextStatus,
      userId: this.account?.id || null
    });
    return order;
  },

  fetchQrInfo() {
    if (window.VOODOO_QR_INFO && window.VOODOO_QR_INFO.orderingUrl) {
      this.customerOrderingUrl = window.VOODOO_QR_INFO.orderingUrl;
      return window.VOODOO_QR_INFO;
    }
    const fallbackUrl = `${window.location.origin}${window.location.pathname.replace(/\/[^/]*$/, '')}/order.php`;
    this.customerOrderingUrl = fallbackUrl;
    return {
      orderingUrl: fallbackUrl,
      detectedIp: window.location.hostname || 'localhost',
      networkAdapter: 'Local Network',
      availableNetworks: []
    };
  }
});
