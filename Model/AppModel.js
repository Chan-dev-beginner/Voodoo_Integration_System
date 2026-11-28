class Product {
  constructor(id, name, category, price, stock, image, cupVariant, tempType, hotCup, icedCup, ventiPrice) {
    const isRef = category === 'Refresher';
    const inferredCup = isRef
      ? (['16oz', '22oz'].includes(cupVariant) ? cupVariant : '22oz')
      : 'hot';
    const vPrice = ventiPrice !== undefined && ventiPrice !== null && ventiPrice !== ''
      ? Number(ventiPrice)
      : (isRef ? Number(price) + 20 : null);
    Object.assign(this, {
      id, name, category,
      price: Number(price),
      ventiPrice: vPrice,
      stock, image,
      cupVariant: inferredCup,
      tempType: tempType || 'both',
      hotCup: hotCup !== undefined && hotCup !== null && hotCup !== '' ? hotCup : (isRef ? '16oz' : (category === 'Coffee' || category === 'Frappe' ? 'hot' : '')),
      icedCup: icedCup !== undefined && icedCup !== null && icedCup !== '' ? icedCup : (isRef ? '22oz' : (category === 'Coffee' ? '16oz' : ''))
    });
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

    const savedCups = this.load('voodooCupVariants', null);
    this.cupVariants = Array.isArray(savedCups) && savedCups.length ? savedCups : this.defaultCupVariants();
    if (!savedCups) this.save('voodooCupVariants', this.cupVariants);

    const saved = this.load('voodooProducts', null);
    this.products = (saved || this.defaultProducts())
      .map(p => new Product(p.id, p.name, p.category, p.price, p.stock, p.image, p.cupVariant, p.tempType, p.hotCup, p.icedCup, p.ventiPrice));
    this.syncProductStocksFromCups();
    if (!saved) this.saveProducts();
  }

  defaultCupVariants() {
    return [
      { key: '16oz', name: '16oz Cup', usedFor: 'Cold Coffee & Refreshers', stock: 50, minStock: 10 },
      { key: '22oz', name: '22oz Cup', usedFor: 'Refreshers', stock: 50, minStock: 10 },
      { key: 'hot', name: 'Hot Cup (12oz)', usedFor: 'Hot Coffee & Frappe', stock: 50, minStock: 10 }
    ];
  }

  getAllowedCupKeys(category) {
    if (category === 'Refresher') return ['16oz', '22oz'];
    if (category === 'Coffee') return ['hot', '16oz'];
    if (category === 'Non-coffee') return ['16oz', '22oz', 'hot'];
    return ['hot'];
  }

  getAllowedCupVariants(category) {
    const allowed = this.getAllowedCupKeys(category);
    return (this.cupVariants || []).filter(c => allowed.includes(c.key));
  }

  getCupVariant(key) {
    return this.cupVariants.find(c => c.key === key) || this.cupVariants[0] || { key: '16oz', name: '16oz Cup', usedFor: 'Iced Coffee & Frappe', stock: 0, minStock: 10 };
  }

  getCupStock(key) {
    return Number(this.getCupVariant(key)?.stock || 0);
  }

  getCupLabel(key) {
    return this.getCupVariant(key)?.name || '16oz Cup';
  }

  getCartCupUsage(cupVariant) {
    return this.cart.reduce((sum, item) => {
      const prod = this.products.find(p => p.id === item.id);
      const itemCup = item.cupVariant || prod?.cupVariant || '16oz';
      return itemCup === cupVariant ? sum + Number(item.quantity || 0) : sum;
    }, 0);
  }

  syncProductStocksFromCups() {
    this.products.forEach(p => {
      p.stock = this.getCupStock(p.cupVariant);
    });
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
      { id: 5, name: 'Berry Refresher', category: 'Refresher', price: 155, ventiPrice: 175, stock: 3, image: 'assets/refreshers.png' },
      { id: 6, name: 'Iced Americano', category: 'Coffee', price: 120, stock: 22, image: 'assets/3.png' },
      { id: 7, name: 'Chocolate Frappe', category: 'Frappe', price: 180, stock: 8, image: 'assets/4.png' },
      { id: 8, name: 'Strawberry Matcha', category: 'Refresher', price: 160, ventiPrice: 180, stock: 0, image: 'assets/1.png' },
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

  async syncToDb(action, payload) {
    try {
      const resp = await fetch(`Controller/db_sync.php?action=${encodeURIComponent(action)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload || {})
      });
      return await resp.json();
    } catch (err) {
      return { ok: false, error: err.message };
    }
  }

  async bootstrapFromDatabase() {
    try {
      const resp = await fetch('Controller/db_sync.php?action=bootstrap');
      const data = await resp.json();
      if (!data.ok) return false;

      if (Array.isArray(data.users) && data.users.length) {
        this.accounts = data.users;
        this.save('voodooAccounts', this.accounts);
      }
      if (Array.isArray(data.cupVariants) && data.cupVariants.length) {
        const notes = { '16oz': 'Cold Coffee & Refreshers', '22oz': 'Refreshers', 'hot': 'Hot Coffee & Frappe' };
        const names = { 'hot': 'Hot Cup (12oz)' };
        this.cupVariants = data.cupVariants.map(c => ({ ...c, name: names[c.key] || c.name, usedFor: notes[c.key] || c.usedFor }));
        this.save('voodooCupVariants', this.cupVariants);
      }
      if (Array.isArray(data.products) && data.products.length) {
        this.products = data.products.map(p => new Product(p.id, p.name, p.category, p.price, p.stock, p.image, p.cupVariant, p.tempType, p.hotCup, p.icedCup, p.ventiPrice));
        this.syncProductStocksFromCups();
        this.save('voodooProducts', this.products);
      }
      if (Array.isArray(data.orders)) {
        const byId = new Map(data.orders.map(o => [o.id, o]));
        for (const localOrder of this.load('voodooShiftOrders', [])) {
          if (!byId.has(localOrder.id)) byId.set(localOrder.id, localOrder);
        }
        this.orders = Array.from(byId.values());
        this.save('voodooShiftOrders', this.orders);
      }
      if (Array.isArray(data.restockRequests)) {
        this.restockRequests = data.restockRequests;
        this.save('voodooRestockRequests', this.restockRequests);
      }
      if (Array.isArray(data.shiftSales)) {
        this.savedShiftSales = data.shiftSales;
        this.save('voodooSavedShiftSales', this.savedShiftSales);
      }
      return true;
    } catch (err) {
      return false;
    }
  }
}
