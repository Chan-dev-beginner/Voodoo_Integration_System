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
}
