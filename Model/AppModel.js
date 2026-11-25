class Product {
  constructor(id, name, category, price, stock, image) {
    Object.assign(this, { id, name, category, price, stock, image });
  }
}

class AppModel {
  constructor() {
    this.account = null;
    this.module = 'dashboard';
    this.cart = [];
    this.shiftStartedAt = new Date().toISOString();
    this.orders = this.load('voodooShiftOrders', []);
    this.restockRequests = this.load('voodooRestockRequests', []);

    const saved = this.load('voodooProducts', null);
    this.products = saved
      ? saved.map(p => new Product(p.id, p.name, p.category, p.price, p.stock, p.image))
      : [
          new Product(1, 'Vanilla Latte', 'Coffee', 150, 18, 'assets/2.png'),
          new Product(2, 'Caramel Machiato', 'Coffee', 165, 12, 'assets/3.png'),
          new Product(3, 'Mocha Iced', 'Coffee', 170, 9, 'assets/4.png'),
          new Product(4, 'Matcha Frappe', 'Frappe', 185, 4, 'assets/1.png'),
          new Product(5, 'Berry Refresher', 'Refresher', 155, 3, 'assets/refreshers.png'),
          new Product(6, 'Iced Americano', 'Coffee', 120, 22, 'assets/3.png'),
          new Product(7, 'Chocolate Frappe', 'Frappe', 180, 8, 'assets/4.png'),
          new Product(8, 'Strawberry Matcha', 'Refresher', 160, 0, 'assets/1.png'),
          new Product(9, 'Salted Caramel', 'Coffee', 175, 14, 'assets/2.png')
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
    if (!item) return;
    const product = this.products.find(p => p.id === item.id);
    if (change > 0 && product && item.quantity >= product.stock) return;
    item.quantity += change;
    if (item.quantity <= 0) this.cart = this.cart.filter(cartItem => cartItem.id !== Number(id));
  }

  totals() {
    const subtotal = this.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
    return { subtotal, tax: 0, total: subtotal };
  }

  recordOrder(paymentMethod) {
    const totals = this.totals();
    const order = {
      id: '#S' + String(Date.now()).slice(-6), account: this.account.name,
      time: new Date().toISOString(), paymentMethod,
      items: this.cart.map(item => ({ name: item.name, quantity: item.quantity, price: item.price, total: item.price * item.quantity })),
      subtotal: totals.subtotal, tax: totals.tax, total: totals.total
    };
    this.orders.push(order);
    this.save('voodooShiftOrders', this.orders);

    // Deduct sold cups from inventory.
    this.cart.forEach(item => {
      const product = this.products.find(p => p.id === item.id);
      if (product) product.stock = Math.max(0, product.stock - item.quantity);
    });
    this.saveProducts();
    return order;
  }

  requestRestock(productId, quantity) {
    const product = this.products.find(item => item.id === Number(productId));
    if (!product || Number(quantity) <= 0) return false;
    this.restockRequests.push({ id: 'RR-' + String(Date.now()).slice(-6), productId: product.id, productName: product.name, quantity: Number(quantity), requestedBy: this.account.name, status: 'Pending', requestedAt: new Date().toISOString(), approvedAt: null });
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