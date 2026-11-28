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
        const cup = this.model.cupVariants.find(item => item.key === document.getElementById('restockProduct').value);
        const qty = Number(document.getElementById('restockQuantity').value);
        if (!cup || qty <= 0) return this.view.toast('Invalid restock quantity');
        cup.stock += qty;
        this.model.saveCupVariants();
        this.model.syncToDb('save_cup_variant', { key: cup.key, stock: cup.stock, minStock: cup.minStock || 10 });
        this.view.toast(`${cup.name} restocked`);
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

  manageCup(button) {
    const cup = this.model.getCupVariant(button.dataset.id);
    if (!cup) return;
    this.view.modal('Manage ' + cup.name, `<div class="form-grid"><label>Cup Variant<input value="${cup.name}" disabled></label><label>Used For<input value="${cup.usedFor}" disabled></label><label>Available Cups<input id="cupStock" type="number" min="0" value="${cup.stock}"></label></div><button class="primary-action" type="button" data-action="save-cup" data-id="${cup.key}">Save Cup Stock</button>`);
    this.bindDynamic();
  },

  saveCup(button) {
    const cup = this.model.cupVariants.find(c => c.key === button.dataset.id);
    if (!cup) return;
    const stock = Number(document.getElementById('cupStock').value);
    if (isNaN(stock) || stock < 0) return this.view.toast('Stock cannot be negative');
    cup.stock = stock;
    this.model.saveCupVariants();
    this.model.syncToDb('save_cup_variant', { key: cup.key, stock, minStock: cup.minStock || 10 });
    this.view.closeModal();
    this.view.toast(`${cup.name} updated`);
    this.navigate('inventory');
  },

  manageProduct(button) {
    const product = button.dataset.id ? this.model.products.find(i => i.id === Number(button.dataset.id)) : null;
    const categoryOptions = ['Coffee', 'Frappe', 'Refresher', 'Non-coffee']
      .map(cat => `<option ${product?.category === cat ? 'selected' : ''}>${cat}</option>`)
      .join('');
    const isRefresher = (product?.category || 'Coffee') === 'Refresher';
    const curHot = product
      ? (product.hotCup !== undefined && product.hotCup !== null && product.hotCup !== '' ? product.hotCup : (isRefresher ? '16oz' : (product.category === 'Coffee' || product.category === 'Frappe' ? 'hot' : '')))
      : (isRefresher ? '16oz' : 'hot');
    const curIced = product
      ? (product.icedCup !== undefined && product.icedCup !== null && product.icedCup !== '' ? product.icedCup : (isRefresher ? '22oz' : (product.category === 'Coffee' ? '16oz' : '')))
      : (isRefresher ? '22oz' : '16oz');
    const curVentiPrice = product?.ventiPrice ? product.ventiPrice : (product ? product.price + 20 : 170);
    const buildCupOpts = selectedVal => [
      `<option value="" ${!selectedVal ? 'selected' : ''}>None</option>`,
      ...(this.model.cupVariants || []).map(cup => `<option value="${cup.key}" ${selectedVal === cup.key ? 'selected' : ''}>${cup.name} (${cup.stock} left)</option>`)
    ].join('');
    this.view.modal(product ? 'Manage ' + product.name : 'Add Product', `<div class="form-grid"><label>Product name<input id="productName" value="${product ? product.name : ''}"></label><label>Category<select id="productCategory">${categoryOptions}</select></label><label><span id="labelCupSlot1">${isRefresher ? 'Grande Cup Variant' : 'Hot Cup Variant'}</span><select id="productHotCup">${buildCupOpts(curHot)}</select></label><label><span id="labelCupSlot2">${isRefresher ? 'Venti Cup Variant' : 'Iced Cup Variant'}</span><select id="productIcedCup">${buildCupOpts(curIced)}</select></label><label id="wrapPrice"><span id="labelProductPrice">${isRefresher ? 'Grande Price (₱)' : 'Price (₱)'}</span><input id="productPrice" type="number" min="1" value="${product ? product.price : 150}"></label><label id="wrapVentiPrice" style="${isRefresher ? '' : 'display:none;'}"><span id="labelVentiPrice">Venti Price (₱)</span><input id="productVentiPrice" type="number" min="1" value="${curVentiPrice}"></label></div><button class="primary-action" type="button" data-action="save" data-id="${product ? product.id : ''}">Save</button>`);
    const catSel = document.getElementById('productCategory');
    const lbl1 = document.getElementById('labelCupSlot1');
    const lbl2 = document.getElementById('labelCupSlot2');
    const sel1 = document.getElementById('productHotCup');
    const sel2 = document.getElementById('productIcedCup');
    const lblPrice = document.getElementById('labelProductPrice');
    const wrapVenti = document.getElementById('wrapVentiPrice');
    const updateCupLabelsAndDefaults = (forceDefaults = false) => {
      const cat = catSel.value;
      const ref = cat === 'Refresher';
      if (lbl1) lbl1.textContent = ref ? 'Grande Cup Variant' : (cat === 'Coffee' ? 'Hot Cup Variant' : (cat === 'Frappe' ? 'Hot Cup (12oz) Variant' : 'Hot / Regular Cup Variant'));
      if (lbl2) lbl2.textContent = ref ? 'Venti Cup Variant' : (cat === 'Coffee' ? 'Iced Cup Variant' : (cat === 'Frappe' ? 'Iced Cup Variant (Optional)' : 'Iced / Large Cup Variant'));
      if (lblPrice) lblPrice.textContent = ref ? 'Grande Price (₱)' : 'Price (₱)';
      if (wrapVenti) wrapVenti.style.display = ref ? '' : 'none';
      if (forceDefaults || !product) {
        if (ref) {
          if (sel1) sel1.value = '16oz';
          if (sel2) sel2.value = '22oz';
        } else if (cat === 'Coffee') {
          if (sel1) sel1.value = 'hot';
          if (sel2) sel2.value = '16oz';
        } else if (cat === 'Frappe') {
          if (sel1) sel1.value = 'hot';
          if (sel2) sel2.value = '';
        } else if (cat === 'Non-coffee') {
          if (sel1 && !sel1.value) sel1.value = '16oz';
          if (sel2 && !sel2.value) sel2.value = '22oz';
        }
      }
    };
    if (catSel) {
      catSel.onchange = () => updateCupLabelsAndDefaults(true);
      catSel.oninput = () => updateCupLabelsAndDefaults(true);
    }
    this.bindDynamic();
  },

  saveProduct(button) {
    const name = document.getElementById('productName').value.trim();
    if (!name) return this.view.toast('Product name required');
    const category = document.getElementById('productCategory').value;
    const hotCup = document.getElementById('productHotCup')?.value || '';
    const icedCup = document.getElementById('productIcedCup')?.value || '';
    const isRef = category === 'Refresher';
    if (!hotCup && !icedCup) {
      return this.view.toast(isRef ? 'Please select at least one cup variant (Grande or Venti)' : 'Please select at least one cup variant (Hot or Iced)');
    }
    const cupVariant = isRef ? (icedCup || hotCup || '22oz') : (icedCup || hotCup || '16oz');
    const tempType = hotCup && icedCup ? 'both' : (hotCup ? (isRef ? 'Grande' : 'Hot') : (isRef ? 'Venti' : 'Iced'));
    const stock = this.model.getCupStock(cupVariant);
    const price = Number(document.getElementById('productPrice').value);
    if (isNaN(price) || price <= 0) return this.view.toast('Price must be greater than 0');
    let ventiPrice = null;
    if (isRef) {
      const vVal = Number(document.getElementById('productVentiPrice')?.value);
      if (isNaN(vVal) || vVal <= 0) return this.view.toast('Venti price must be greater than 0');
      ventiPrice = vVal;
    }
    const id = button.dataset.id;
    let targetProduct;
    if (id) {
      targetProduct = this.model.products.find(i => i.id === Number(id));
      Object.assign(targetProduct, { name, category, tempType, hotCup, icedCup, cupVariant, stock, price, ventiPrice });
    } else {
      targetProduct = new Product(Date.now(), name, category, price, stock, 'assets/2.png', cupVariant, tempType, hotCup, icedCup, ventiPrice);
      this.model.products.push(targetProduct);
    }
    this.model.saveProducts();
    this.model.syncToDb('save_product', {
      id: id ? Number(id) : 0,
      name,
      category,
      cupVariant,
      hotCup,
      icedCup,
      price,
      ventiPrice,
      stock,
      image: targetProduct.image || 'assets/2.png',
      userId: this.model.account?.id || null
    }).then(res => {
      if (res.ok && res.id && !id) {
        targetProduct.id = res.id;
        this.model.saveProducts();
      }
    });
    this.view.closeModal();
    this.navigate('inventory');
  },

  deleteProduct(button) {
    const id = Number(button.dataset.id);
    const product = this.model.products.find(p => p.id === id);
    if (!product) return;
    if (!confirm(`Delete "${product.name}" from the menu?`)) return;
    this.model.products = this.model.products.filter(p => p.id !== id);
    this.model.saveProducts();
    this.model.syncToDb('delete_product', { id });
    this.view.toast(`${product.name} deleted`);
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
    const json = JSON.stringify(data, null, 2);
    const fileName = `voodoo-backup-${this.stamp()}.json`;
    this.download(fileName, json, 'application/json');
    try { localStorage.setItem('voodooLastBackup', data.createdAt); } catch (error) { /* ignore */ }
    this.model.syncToDb('log_backup', {
      userId: this.model.account?.id || null,
      fileName,
      fileSizeKb: Math.max(1, Math.round(json.length / 1024))
    });
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
        const categories = ['Coffee', 'Frappe', 'Refresher', 'Non-coffee'];
        const lines = String(reader.result).split(/\r?\n/).filter(line => line.trim());
        let count = 0;
        lines.slice(1).forEach(line => {
          const cols = line.split(',').map(value => value.replace(/^"|"$/g, '').replace(/""/g, '"').trim());
          const [name, category, price, stock] = cols;
          if (!name || isNaN(Number(price)) || isNaN(Number(stock))) return;
          const cat = categories.includes(category) ? category : 'Coffee';
          const existing = this.model.products.find(p => p.name.toLowerCase() === name.toLowerCase());
          let target;
          if (existing) {
            Object.assign(existing, { category: cat, price: Number(price), stock: Number(stock) });
            target = existing;
          } else {
            target = new Product(Date.now() + count, name, cat, Number(price), Number(stock), 'assets/2.png');
            this.model.products.push(target);
          }
          this.model.syncToDb('save_product', {
            id: existing ? existing.id : 0,
            name,
            category: cat,
            price: Number(price),
            stock: Number(stock),
            image: target.image || 'assets/2.png',
            userId: this.model.account?.id || null
          }).then(res => {
            if (res.ok && res.id && !existing) {
              target.id = res.id;
              this.model.saveProducts();
            }
          });
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
