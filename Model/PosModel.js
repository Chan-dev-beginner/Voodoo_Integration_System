Object.assign(AppModel.prototype, {
  addProductToCart(id, cupVariant, quantity = 1) {
    const product = this.products.find(item => item.id === Number(id));
    if (!product) return false;
    const allowed = this.getAllowedCupKeys(product.category);
    const cupKey = allowed.includes(cupVariant) ? cupVariant : allowed[0];
    const cupStock = this.getCupStock(cupKey);
    const usedInCart = this.getCartCupUsage(cupKey);
    const qty = Math.max(1, Number(quantity) || 1);
    if (cupStock <= 0 || usedInCart + qty > cupStock) return false;
    const cartKey = `${product.id}_${cupKey}`;
    const cartItem = this.cart.find(item => (item.cartKey || `${item.id}_${item.cupVariant || allowed[0]}`) === cartKey);
    if (cartItem) {
      cartItem.quantity += qty;
    } else {
      this.cart.push({
        ...product,
        cupVariant: cupKey,
        cupLabel: this.getCupLabel(cupKey),
        cartKey,
        quantity: qty
      });
    }
    return true;
  },

  changeCartQuantity(cartKey, change) {
    const keyStr = String(cartKey);
    const item = this.cart.find(cartItem => (cartItem.cartKey || String(cartItem.id)) === keyStr);
    if (!item) return false;
    const product = this.products.find(p => p.id === item.id);
    const cupVariant = item.cupVariant || product?.cupVariant || '16oz';
    if (change > 0 && this.getCartCupUsage(cupVariant) >= this.getCupStock(cupVariant)) return false;
    item.quantity += change;
    if (item.quantity <= 0) {
      this.cart = this.cart.filter(cartItem => (cartItem.cartKey || String(cartItem.id)) !== keyStr);
    }
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
    const savedCups = this.load('voodooCupVariants', null);
    if (Array.isArray(savedCups) && savedCups.length) {
      this.cupVariants = savedCups;
    }
    const saved = this.load('voodooProducts', null);
    if (saved) {
      this.products = saved.map(p => new Product(p.id, p.name, p.category, p.price, p.stock, p.image, p.cupVariant));
      this.syncProductStocksFromCups();
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

  placePosOrder(paymentMethod, customerName, amountPaid) {
    if (!this.cart.length) throw new Error('Cart is empty');
    const cleanName = String(customerName || '').trim();
    if (!cleanName) throw new Error('Customer name is required');
    const totals = this.totals();
    const paid = Number(amountPaid);
    if (isNaN(paid) || paid < totals.total) {
      throw new Error('Payment amount must cover the total');
    }
    const order = {
      id: '#P' + String(Date.now()).slice(-6),
      customerName: cleanName,
      tableNote: '',
      source: 'pos',
      orderType: this.orderType || 'dine-in',
      status: 'pending',
      paymentMethod,
      amountPaid: paid,
      changeAmount: Math.max(0, paid - totals.total),
      cashierId: this.account?.id || null,
      cashierUsername: this.account?.username || 'barista',
      account: this.account?.name || 'Barista',
      time: new Date().toISOString(),
      items: this.cart.map(item => ({
        productId: item.id,
        name: item.name,
        cupVariant: item.cupVariant || '16oz',
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
      const neededByCup = {};
      for (const item of order.items) {
        const product = this.products.find(p => p.id === Number(item.productId) || p.name === item.name);
        const cupKey = item.cupVariant || product?.cupVariant || '16oz';
        neededByCup[cupKey] = (neededByCup[cupKey] || 0) + Number(item.quantity || 0);
      }
      for (const [cupKey, needed] of Object.entries(neededByCup)) {
        const cup = this.getCupVariant(cupKey);
        if (cup && cup.stock < needed) {
          throw new Error(`Insufficient ${cup.name} stock (${cup.stock} left, need ${needed}).`);
        }
      }
      for (const [cupKey, needed] of Object.entries(neededByCup)) {
        const cup = this.getCupVariant(cupKey);
        if (cup) cup.stock = Math.max(0, Number(cup.stock || 0) - needed);
      }
      this.saveCupVariants();
    } else if ((order.status === 'queue' || order.status === 'preparing') && nextStatus === 'cancelled') {
      for (const item of order.items) {
        const product = this.products.find(p => p.id === Number(item.productId) || p.name === item.name);
        const cupKey = item.cupVariant || product?.cupVariant || '16oz';
        const cup = this.getCupVariant(cupKey);
        if (cup) cup.stock = Number(cup.stock || 0) + Number(item.quantity || 0);
      }
      this.saveCupVariants();
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
    const host = window.location.hostname || 'localhost';
    const isLocal = ['localhost', '127.0.0.1', '::1', ''].includes(host.toLowerCase());
    if (!isLocal) {
      const basePath = window.location.pathname.replace(/\/View\/.*$/i, '').replace(/\/[^/]*$/, '');
      const liveUrl = `${window.location.origin}${basePath}/order.php`;
      this.customerOrderingUrl = liveUrl;
      return {
        orderingUrl: liveUrl,
        detectedIp: host,
        networkAdapter: 'Live Domain',
        availableNetworks: [{ adapter: 'Live Domain', ip: host, url: liveUrl }]
      };
    }
    if (window.VOODOO_QR_INFO && window.VOODOO_QR_INFO.orderingUrl) {
      this.customerOrderingUrl = window.VOODOO_QR_INFO.orderingUrl;
      return window.VOODOO_QR_INFO;
    }
    const basePath = window.location.pathname.replace(/\/View\/.*$/i, '').replace(/\/[^/]*$/, '');
    const fallbackUrl = `${window.location.origin}${basePath}/order.php`;
    this.customerOrderingUrl = fallbackUrl;
    return {
      orderingUrl: fallbackUrl,
      detectedIp: host,
      networkAdapter: 'Local Network',
      availableNetworks: []
    };
  }
});
