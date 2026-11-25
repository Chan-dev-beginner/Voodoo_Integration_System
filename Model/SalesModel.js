Object.assign(AppModel.prototype, {
  getCurrentShiftOrders() {
    return this.orders.filter(order =>
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

  saveShiftSalesToDatabase() {
    if (!this.account || this.account.role !== 'barista') {
      return { ok: false, skipped: true };
    }

    const orders = this.getCurrentShiftOrders();
    const loggedOutAt = new Date().toISOString();
    const shiftKey = `${this.account.username}_${this.shiftStartedAt}`;

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
      account_name: this.account.name,
      shift_started_at: this.shiftStartedAt,
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

    return {
      ok: true,
      shiftSaleId: record.id,
      totalOrders: orders.length,
      totalItems,
      totalSales,
      loggedOutAt
    };
  },

  fetchSavedSalesRecords() {
    this.savedShiftSales = this.load('voodooSavedShiftSales', []);
    return this.savedShiftSales;
  }
});
