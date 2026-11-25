Object.assign(AppModel.prototype, {
  getCurrentShiftOrders() {
    return this.orders.filter(order =>
      !order.archived &&
      new Date(order.time) >= new Date(this.shiftStartedAt) &&
      (!order.status || order.status === 'completed') &&
      (!this.account || !order.cashierUsername || order.cashierUsername === this.account.username)
    );
  },

  recordOrder(paymentMethod) {
    const totals = this.totals();
    const order = {
      id: '#S' + String(Date.now()).slice(-6),
      account: this.account.name,
      orderType: this.orderType || 'dine-in',
      time: new Date().toISOString(),
      paymentMethod,
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
    this.orders.push(order);
    this.save('voodooShiftOrders', this.orders);

    this.cart.forEach(item => {
      const product = this.products.find(p => p.id === item.id);
      if (product) product.stock = Math.max(0, product.stock - item.quantity);
    });
    this.saveProducts();
    return order;
  },

  async saveShiftSalesToDatabase(customOrders = null, customStart = null) {
    if (!this.account || this.account.role !== 'barista') {
      return { ok: false, skipped: true };
    }

    const orders = customOrders || this.getCurrentShiftOrders();
    const loggedOutAt = new Date().toISOString();
    const startedAt = customStart || this.shiftStartedAt;
    const shiftKey = `${this.account.username}_${startedAt}`;

    let totalItems = 0;
    let cashTotal = 0;
    let gcashTotal = 0;
    let otherTotal = 0;
    let totalSales = 0;

    orders.forEach(order => {
      const amount = Number(order.total || 0);
      const method = String(order.paymentMethod || 'Cash').toLowerCase();
      totalSales += amount;
      totalItems += (order.items || []).reduce((sum, item) => sum + Number(item.quantity || 0), 0);
      if (method === 'cash') cashTotal += amount;
      else if (method === 'gcash') gcashTotal += amount;
      else otherTotal += amount;
    });

    this.savedShiftSales = this.load('voodooSavedShiftSales', []);
    const existing = this.savedShiftSales.find(s => s.shift_key === shiftKey);
    const record = {
      id: existing ? existing.id : Date.now(),
      shift_key: shiftKey,
      cashier_id: this.account.id || null,
      account_name: this.account.name,
      shift_started_at: startedAt,
      logged_out_at: loggedOutAt,
      total_orders: orders.length,
      total_items: totalItems,
      cash_total: cashTotal,
      gcash_total: gcashTotal,
      other_total: otherTotal,
      total_sales: totalSales
    };

    if (existing) Object.assign(existing, record);
    else this.savedShiftSales.unshift(record);
    this.save('voodooSavedShiftSales', this.savedShiftSales);

    // Transfer to MySQL database via bridge
    try {
      await fetch('Controller/orders_bridge.php?action=save_shift_sales', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(record)
      });
    } catch (err) { /* offline fallback kept in localStorage */ }

    return {
      ok: true,
      shiftSaleId: record.id,
      totalOrders: orders.length,
      totalItems,
      totalSales,
      loggedOutAt
    };
  },

  async archivePreviousOrdersAndSaveShift() {
    this.orders = this.load('voodooShiftOrders', []);
    const unarchived = this.orders.filter(o => !o.archived);
    if (!unarchived.length) return { archived: 0, saved: false };

    const completedPrev = unarchived.filter(o => !o.status || o.status === 'completed');
    let saved = false;
    if (completedPrev.length) {
      const earliest = completedPrev
        .map(o => o.time)
        .filter(Boolean)
        .sort()[0] || new Date().toISOString();
      await this.saveShiftSalesToDatabase(completedPrev, earliest);
      saved = true;
    }

    unarchived.forEach(o => {
      o.archived = true;
      o.archivedAt = new Date().toISOString();
    });
    this.save('voodooShiftOrders', this.orders);
    return { archived: unarchived.length, saved };
  },

  archiveCurrentShiftOrders() {
    this.orders = this.load('voodooShiftOrders', []);
    this.orders.forEach(o => {
      if (!o.archived) {
        o.archived = true;
        o.archivedAt = new Date().toISOString();
      }
    });
    this.save('voodooShiftOrders', this.orders);
  },

  async notifyBaristaBridge(action, extra = {}) {
    try {
      await fetch(`Controller/orders_bridge.php?action=${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: this.account?.username || 'barista',
          name: this.account?.name || 'Barista',
          ...extra
        })
      });
    } catch (err) { /* ignore if offline */ }
  },

  fetchSavedSalesRecords() {
    this.savedShiftSales = this.load('voodooSavedShiftSales', []);
    return this.savedShiftSales;
  },

  async fetchSalesForecast(horizonDays = 7) {
    const payload = {
      role: this.account?.role || '',
      orders: this.orders || [],
      savedShiftSales: this.load('voodooSavedShiftSales', []),
      products: this.products.map(p => ({ id: p.id, name: p.name, category: p.category, price: p.price, stock: p.stock })),
      horizonDays
    };
    const response = await fetch('Controller/api.php?action=sales_forecast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await response.json();
    if (!data.ok) throw new Error(data.error || 'Forecast request failed.');
    return data;
  }
});
