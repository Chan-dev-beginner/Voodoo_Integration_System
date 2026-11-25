Object.assign(AppController.prototype, {
  bindRestockForm() {
    const restockForm = document.getElementById('restockForm');
    if (!restockForm) return;
    restockForm.onsubmit = event => {
      event.preventDefault();
      if (this.model.account.role === 'barista') {
        if (this.model.requestRestock(document.getElementById('restockProduct').value, document.getElementById('restockQuantity').value)) {
          this.view.toast('Restock request submitted');
          this.navigate('restock');
        }
      } else {
        const product = this.model.products.find(item => item.id === Number(document.getElementById('restockProduct').value));
        product.stock += Number(document.getElementById('restockQuantity').value);
        this.model.saveProducts();
        this.view.toast('Product restocked');
        this.navigate('inventory');
      }
    };
  },

  resolveRestock(button, type) {
    const ok = type === 'approve'
      ? this.model.approveRestock(button.dataset.id)
      : this.model.rejectRestock(button.dataset.id);
    if (!ok) return;
    this.view.toast(`Restock request ${type === 'approve' ? 'approved' : 'rejected'}`);
    this.navigate('restock');
  },

  manageProduct(button) {
    const product = button.dataset.id ? this.model.products.find(i => i.id === Number(button.dataset.id)) : null;
    this.view.modal(product ? 'Manage ' + product.name : 'Add Product', `<div class="form-grid"><label>Product name<input id="productName" value="${product ? product.name : ''}"></label><label>Category<select id="productCategory"><option>Coffee</option><option>Frappe</option><option>Refresher</option></select></label><label>Stock<input id="productStock" type="number" value="${product ? product.stock : 10}"></label><label>Price<input id="productPrice" type="number" value="${product ? product.price : 150}"></label></div><button class="primary-action" type="button" data-action="save" data-id="${product ? product.id : ''}">Save</button>`);
    this.bindDynamic();
  },

  saveProduct(button) {
    const name = document.getElementById('productName').value.trim();
    if (!name) return this.view.toast('Product name required');
    const category = document.getElementById('productCategory').value;
    const stock = Number(document.getElementById('productStock').value);
    const price = Number(document.getElementById('productPrice').value);
    const id = button.dataset.id;
    if (id) {
      Object.assign(this.model.products.find(i => i.id === Number(id)), { name, category, stock, price });
    } else {
      this.model.products.push(new Product(Date.now(), name, category, price, stock, 'assets/2.png'));
    }
    this.model.saveProducts();
    this.view.closeModal();
    this.navigate('inventory');
  },

  download(filename, text, mime) {
    const blob = new Blob([text], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  },

  stamp() { return new Date().toISOString().slice(0, 10); },

  createBackup() {
    const data = {
      createdAt: new Date().toISOString(),
      products: this.model.products,
      orders: this.model.orders,
      restockRequests: this.model.restockRequests,
      savedShiftSales: this.model.savedShiftSales
    };
    this.download(`voodoo-backup-${this.stamp()}.json`, JSON.stringify(data, null, 2), 'application/json');
    try { localStorage.setItem('voodooLastBackup', data.createdAt); } catch (error) { /* ignore */ }
    this.view.toast('Backup downloaded');
    if (this.model.module === 'inventory') this.navigate('backup');
  },

  exportInventory() {
    const cell = value => `"${String(value).replace(/"/g, '""')}"`;
    const rows = [['name', 'category', 'price', 'stock'], ...this.model.products.map(p => [p.name, p.category, p.price, p.stock])];
    this.download(`voodoo-inventory-${this.stamp()}.csv`, rows.map(row => row.map(cell).join(',')).join('\n'), 'text/csv');
    this.view.toast('Inventory exported');
  },

  importInventory() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv,text/csv';
    input.onchange = () => {
      const file = input.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        const categories = ['Coffee', 'Frappe', 'Refresher'];
        const lines = String(reader.result).split(/\r?\n/).filter(line => line.trim());
        let count = 0;
        lines.slice(1).forEach(line => {
          const cols = line.split(',').map(value => value.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
          const [name, category, price, stock] = cols;
          if (!name || isNaN(Number(price)) || isNaN(Number(stock))) return;
          const cat = categories.includes(category) ? category : 'Coffee';
          const existing = this.model.products.find(p => p.name.toLowerCase() === name.toLowerCase());
          if (existing) Object.assign(existing, { category: cat, price: Number(price), stock: Number(stock) });
          else this.model.products.push(new Product(Date.now() + count, name, cat, Number(price), Number(stock), 'assets/2.png'));
          count++;
        });
        this.model.saveProducts();
        this.view.toast(count ? `${count} product(s) imported` : 'No valid rows found (expected: name,category,price,stock)');
        this.navigate('inventory');
      };
      reader.readAsText(file);
    };
    input.click();
  }
});
