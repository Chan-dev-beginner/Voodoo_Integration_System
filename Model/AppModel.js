class Product {
  constructor(id, name, category, price, stock, image) {
    Object.assign(this, { id, name, category, price, stock, image });
  }
}

class AppModel {
  constructor() {
    this.account = null;
    this.module = 'dashboard';
    this.orderType = 'dine-in';
    this.customerOrderingUrl = '';
    this.cart = [];
    this.shiftStartedAt = new Date().toISOString();
    this.orders = this.load('voodooShiftOrders', []);
    this.restockRequests = this.load('voodooRestockRequests', []);
    this.savedShiftSales = this.load('voodooSavedShiftSales', []);
    this.accounts = this.load('voodooAccounts', this.defaultAccounts());
    this.save('voodooAccounts', this.accounts);

    const saved = this.load('voodooProducts', null);
    this.products = (saved || this.defaultProducts())
      .map(p => new Product(p.id, p.name, p.category, p.price, p.stock, p.image));
    if (!saved) this.saveProducts();
  }

  defaultAccounts() {
    return [
      { id: 1, username: 'admin', password: 'admin', full_name: 'Admin', role: 'admin', is_active: 1 },
      { id: 2, username: 'barista', password: 'barista', full_name: 'Barista', role: 'cashier', is_active: 1 }
    ];
  }

  defaultProducts() {
    return [
      { id: 1, name: 'Vanilla Latte', category: 'Coffee', price: 150, stock: 18, image: 'assets/2.png' },
      { id: 2, name: 'Caramel Machiato', category: 'Coffee', price: 165, stock: 12, image: 'assets/3.png' },
      { id: 3, name: 'Mocha Iced', category: 'Coffee', price: 170, stock: 9, image: 'assets/4.png' },
      { id: 4, name: 'Matcha Frappe', category: 'Frappe', price: 185, stock: 4, image: 'assets/1.png' },
      { id: 5, name: 'Berry Refresher', category: 'Refresher', price: 155, stock: 3, image: 'assets/refreshers.png' },
      { id: 6, name: 'Iced Americano', category: 'Coffee', price: 120, stock: 22, image: 'assets/3.png' },
      { id: 7, name: 'Chocolate Frappe', category: 'Frappe', price: 180, stock: 8, image: 'assets/4.png' },
      { id: 8, name: 'Strawberry Matcha', category: 'Refresher', price: 160, stock: 0, image: 'assets/1.png' },
      { id: 9, name: 'Salted Caramel', category: 'Coffee', price: 175, stock: 14, image: 'assets/2.png' }
    ];
  }

  load(key, fallback) {
    try {
      const value = JSON.parse(localStorage.getItem(key));
      return value === null || value === undefined ? fallback : value;
    } catch (error) {
      return fallback;
    }
  }

  save(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) { /* storage unavailable */ }
  }

  saveProducts() { this.save('voodooProducts', this.products); }

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
  }

  changeCartQuantity(id, change) {
    const item = this.cart.find(cartItem => cartItem.id === Number(id));
    if (!item) return false;
    const product = this.products.find(p => p.id === item.id);
    if (change > 0 && product && item.quantity >= product.stock) return false;
    item.quantity += change;
    if (item.quantity <= 0) this.cart = this.cart.filter(cartItem => cartItem.id !== Number(id));
    return true;
  }

  totals() {
    const subtotal = this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return { subtotal, tax: 0, total: subtotal };
  }

  getCurrentShiftOrders() {
    return this.orders.filter(order =>
      new Date(order.time) >= new Date(this.shiftStartedAt) &&
      (!order.status || order.status === 'completed') &&
      (!this.account || !order.cashierUsername || order.cashierUsername === this.account.username)
    );
  }

  getActiveOrders() {
    return this.orders.filter(order => ['pending', 'queue', 'preparing'].includes(order.status));
  }

  loginUser(username, password) {
    this.accounts = this.load('voodooAccounts', this.defaultAccounts());
    const user = this.accounts.find(
      u => u.username.toLowerCase() === String(username).trim().toLowerCase() && Number(u.is_active) === 1
    );
    if (!user || user.password !== String(password)) {
      throw new Error('Invalid username or password');
    }
    return {
      id: user.id,
      username: user.username,
      fullName: user.full_name || user.username,
      role: user.role === 'admin' ? 'admin' : 'barista'
    };
  }

  fetchUsers() {
    this.accounts = this.load('voodooAccounts', this.defaultAccounts());
    return this.accounts;
  }

  createUser(payload) {
    this.accounts = this.load('voodooAccounts', this.defaultAccounts());
    const username = String(payload.username || '').trim();
    const fullName = String(payload.fullName || '').trim();
    const password = String(payload.password || '');
    const role = payload.role === 'admin' ? 'admin' : 'cashier';

    if (!username || !fullName || !password) {
      throw new Error('Full name, username, and password are required.');
    }
    if (this.accounts.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      throw new Error(`Username '${username}' already exists.`);
    }

    const user = {
      id: Date.now(),
      username,
      password,
      full_name: fullName,
      role,
      is_active: 1
    };
    this.accounts.push(user);
    this.save('voodooAccounts', this.accounts);
    return user;
  }

  toggleUser(userId) {
    this.accounts = this.load('voodooAccounts', this.defaultAccounts());
    const user = this.accounts.find(u => u.id === Number(userId));
    if (!user) throw new Error('User not found.');
    if (user.username.toLowerCase() === 'admin') {
      throw new Error('Default admin account cannot be disabled.');
    }
    user.is_active = Number(user.is_active) === 1 ? 0 : 1;
    this.save('voodooAccounts', this.accounts);
    return user;
  }

  syncProductsFromServer() {
    const saved = this.load('voodooProducts', null);
    if (saved) {
      this.products = saved.map(p => new Product(p.id, p.name, p.category, p.price, p.stock, p.image));
    }
    return this.products;
  }

  syncOrdersFromServer() {
    this.orders = this.load('voodooShiftOrders', []);
    return this.orders;
  }

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
    return order;
  }

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
    return order;
  }

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
  }

  fetchSavedSalesRecords() {
    this.savedShiftSales = this.load('voodooSavedShiftSales', []);
    return this.savedShiftSales;
  }

  requestRestock(productId, quantity) {
    const product = this.products.find(item => item.id === Number(productId));
    if (!product || Number(quantity) <= 0) return false;
    this.restockRequests.push({
      id: 'RR-' + String(Date.now()).slice(-6),
      productId: product.id,
      productName: product.name,
      quantity: Number(quantity),
      requestedBy: this.account.name,
      status: 'Pending',
      requestedAt: new Date().toISOString(),
      approvedAt: null
    });
    this.save('voodooRestockRequests', this.restockRequests);
    return true;
  }

  approveRestock(requestId) {
    const request = this.restockRequests.find(item => item.id === requestId);
    if (!request || request.status !== 'Pending') return false;
    const product = this.products.find(item => item.id === request.productId);
    if (product) product.stock += request.quantity;
    request.status = 'Approved';
    request.approvedAt = new Date().toISOString();
    this.save('voodooRestockRequests', this.restockRequests);
    this.saveProducts();
    return true;
  }

  rejectRestock(requestId) {
    const request = this.restockRequests.find(item => item.id === requestId);
    if (!request || request.status !== 'Pending') return false;
    request.status = 'Rejected';
    request.approvedAt = new Date().toISOString();
    this.save('voodooRestockRequests', this.restockRequests);
    return true;
  }
}
