Object.assign(AppController.prototype, {
  startLivePolling() {
    clearInterval(this.pollTimer);
    this.pollTimer = setInterval(() => this.refreshLiveData(), 3000);
  },

  stopLivePolling() {
    clearInterval(this.pollTimer);
    this.pollTimer = null;
  },

  async refreshLiveData() {
    if (!this.model.account) return;
    const prevOrdersJson = JSON.stringify(this.model.orders);
    const prevProductsJson = JSON.stringify(this.model.products);
    const prevPendingIds = new Set(this.model.orders.filter(o => o.status === 'pending').map(o => o.id));
    this.model.syncOrdersFromServer();
    this.model.syncProductsFromServer();

    // Also poll the server bridge for QR orders from other devices
    await this.model.pollQrOrdersBridge();

    const ordersChanged = JSON.stringify(this.model.orders) !== prevOrdersJson;
    const productsChanged = JSON.stringify(this.model.products) !== prevProductsJson;
    if (!ordersChanged && !productsChanged) return;

    const newPendingQr = this.model.orders.filter(o => o.status === 'pending' && o.source === 'qr' && !prevPendingIds.has(o.id));
    if (newPendingQr.length) {
      newPendingQr.forEach(o => {
        const items = (o.items || []).map(i => `${i.quantity}× ${i.name}`).join(', ');
        this.view.pushNotification(
          'order',
          `New QR Order — ${o.id}`,
          `${o.customerName || 'Customer'} ordered: ${items || 'items'}. Table: ${o.tableNote || 'N/A'}.`
        );
      });
      this.view.toast(`${newPendingQr.length} new QR order${newPendingQr.length > 1 ? 's' : ''} waiting!`);
    }

    if (ordersChanged) {
      const strip = document.getElementById('posQueueStrip');
      if (strip) strip.innerHTML = this.view.posQueueStrip();
      if (this.model.module === 'order-queue') this.navigate('order-queue');
      if (this.model.module === 'dashboard') this.navigate('dashboard');
    }
    if (productsChanged) {
      const grid = document.getElementById('posGrid');
      const searchVal = document.querySelector('[data-action="menu-search"]')?.value?.trim();
      if (grid && !searchVal) {
        const activeCat = this.model._posActiveCat || 'All';
        grid.innerHTML = this.view.productGrid(activeCat);
      }
    }
  },

  bindSearchInputs() {
    // Category tab filtering for POS
    const catTabs = document.getElementById('posCategoryTabs');
    if (catTabs) {
      catTabs.addEventListener('click', event => {
        const btn = event.target.closest('[data-pos-cat]');
        if (!btn) return;
        catTabs.querySelectorAll('button').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const cat = btn.dataset.posCat;
        this.model._posActiveCat = cat;
        const grid = document.getElementById('posGrid');
        if (grid) {
          const products = cat && cat !== 'All'
            ? this.model.products.filter(p => p.category === cat)
            : this.model.products;
          grid.innerHTML = `<div class="menu-grid">${products.map(p => this.view.productCardHtml(p)).join('')}</div>`;
        }
      });
    }

    const menuSearch = document.querySelector('[data-action="menu-search"]');
    if (menuSearch) {
      menuSearch.oninput = event => {
        const grid = document.getElementById('posGrid') || document.getElementById('orderingGrid');
        const query = event.target.value.toLowerCase();
        const activeCat = this.model._posActiveCat || 'All';
        const baseProducts = activeCat && activeCat !== 'All'
          ? this.model.products.filter(p => p.category === activeCat)
          : this.model.products;
        const filtered = baseProducts.filter(product => product.name.toLowerCase().includes(query));
        grid.innerHTML = `<div class="menu-grid">${filtered.map(product => this.view.productCardHtml(product)).join('')}</div>`
          || '<p>No products found.</p>';
      };
    }

    const posCustomerInput = document.getElementById('posCustomerName');
    if (posCustomerInput) {
      posCustomerInput.oninput = event => {
        this.model.posCustomerName = event.target.value;
      };
    }

    const grid = document.getElementById('posGrid') || document.getElementById('orderingGrid');
    if (grid) {
      grid.onclick = event => {
        if (event.target.closest('button')) return;
        const card = event.target.closest('[data-product-card]');
        if (card) this.openCupModal(card);
      };
    }

    const inventorySearch = document.querySelector('[data-action="inventory-search"]');
    if (inventorySearch) {
      inventorySearch.oninput = event => {
        const rows = document.getElementById('inventoryRows');
        const query = event.target.value.toLowerCase();
        const isAdmin = this.model.account?.role === 'admin';
        rows.innerHTML = this.model.products
          .filter(product => (product.name + ' ' + product.category + ' ' + this.model.getCupLabel(product.cupVariant)).toLowerCase().includes(query))
          .map(product => {
            const cupLabel = this.model.getCupLabel(product.cupVariant);
            const cupStock = this.model.getCupStock(product.cupVariant);
            const status = cupStock <= 0 ? 'Out of stock' : cupStock <= 10 ? 'Low stock' : 'In stock';
            const statusClass = cupStock <= 0 ? 'stock-out' : cupStock <= 10 ? 'stock-low' : '';
            const actionCell = isAdmin ? `<td><button class="row-action" type="button" data-action="manage" data-id="${product.id}">Manage</button> <button class="row-action queue-reject" type="button" data-action="delete-product" data-id="${product.id}">Delete</button></td>` : '';
            return `<tr><td><strong>${product.name}</strong></td><td>${product.category}</td><td>${cupLabel} (${cupStock} cups)</td><td>${this.view.money(product.price)}</td><td><span class="${statusClass}">${status}</span></td>${actionCell}</tr>`;
          })
          .join('');
      };
    }
  },

  openCupModal(button) {
    const product = this.model.products.find(p => p.id === Number(button.dataset.id));
    if (!product) return;
    const hasCustomCups = product.hotCup || product.icedCup;
    let optionsList;
    if (product.category === 'Refresher') {
      const gPrice = product.price;
      const vPrice = product.ventiPrice || (product.price + 20);
      if (hasCustomCups) {
        optionsList = [];
        if (product.hotCup) {
          const c = this.model.getCupVariant(product.hotCup);
          optionsList.push({ ...c, temp: 'Grande', displayTitle: `Grande (${this.view.money(gPrice)}) — ${c.name}` });
        }
        if (product.icedCup) {
          const c = this.model.getCupVariant(product.icedCup);
          optionsList.push({ ...c, temp: 'Venti', displayTitle: `Venti (${this.view.money(vPrice)}) — ${c.name}` });
        }
      } else {
        optionsList = [
          { ...this.model.getCupVariant('16oz'), temp: 'Grande', displayTitle: `Grande (${this.view.money(gPrice)}) — 16oz Cup` },
          { ...this.model.getCupVariant('22oz'), temp: 'Venti', displayTitle: `Venti (${this.view.money(vPrice)}) — 22oz Cup` }
        ];
      }
    } else if (hasCustomCups) {
      optionsList = [];
      if (product.hotCup) {
        const c = this.model.getCupVariant(product.hotCup);
        optionsList.push({ ...c, temp: 'Hot', displayTitle: `Hot — ${c.name}` });
      }
      if (product.icedCup) {
        const c = this.model.getCupVariant(product.icedCup);
        optionsList.push({ ...c, temp: 'Iced', displayTitle: `Iced — ${c.name}` });
      }
    } else if (product.category === 'Coffee') {
      optionsList = [
        { ...this.model.getCupVariant('hot'), temp: 'Hot', displayTitle: 'Hot — Hot Cup (12oz)' },
        { ...this.model.getCupVariant('16oz'), temp: 'Iced', displayTitle: 'Iced — 16oz Cup' }
      ];
    } else {
      optionsList = this.model.getAllowedCupVariants(product.category).map(c => ({ ...c, temp: '', displayTitle: c.name }));
    }
    const firstAvailable = optionsList.find(c => Number(c.stock) > 0) || optionsList[0];
    const cupCards = optionsList.map(cup => {
      const disabled = Number(cup.stock) <= 0;
      const checked = firstAvailable && cup.key === firstAvailable.key && !disabled ? 'checked' : '';
      return `<label class="cup-option-card ${disabled ? 'disabled' : ''}">
        <input type="radio" name="cupModalVariant" value="${cup.key}" data-temp="${cup.temp}" ${checked} ${disabled ? 'disabled' : ''}>
        <div>
          <strong>${cup.displayTitle}</strong>
          ${disabled ? '<small>Out of stock</small>' : ''}
        </div>
      </label>`;
    }).join('');
    const modalTitle = product.category === 'Refresher'
      ? `Select Size & Cup — ${product.name}`
      : (product.category === 'Coffee' || hasCustomCups ? `Select Hot / Iced & Cup — ${product.name}` : `Select Cup — ${product.name}`);
    const modalPriceDisplay = product.category === 'Refresher' && product.ventiPrice && product.ventiPrice !== product.price
      ? `${this.view.money(product.price)} (Grande) / ${this.view.money(product.ventiPrice)} (Venti)`
      : this.view.money(product.price);
    this.view.modal(modalTitle, `
      <div class="cup-modal-product">
        <img src="${product.image}" alt="${product.name}">
        <div>
          <strong>${product.name}</strong>
          <p>${product.category} · ${modalPriceDisplay}</p>
        </div>
      </div>
      <div class="cup-option-grid">${cupCards}</div>
      <button class="primary-action" type="button" data-action="confirm-add-cup" data-id="${product.id}" style="width:100%;margin-top:14px;">Add to Order</button>
    `);
    this.bindDynamic();
  },

  confirmAddCup(button) {
    const productId = Number(button.dataset.id);
    const selected = document.querySelector('input[name="cupModalVariant"]:checked');
    if (!selected) return this.view.toast('Selected cup variant is out of stock');
    const tempType = selected.dataset.temp || '';
    if (!this.model.addProductToCart(productId, selected.value, 1, tempType)) {
      return this.view.toast(`Not enough ${this.model.getCupLabel(selected.value)} stock`);
    }
    this.view.renderCart();
    this.view.closeModal();
    const product = this.model.products.find(p => p.id === productId);
    const isVenti = (product?.category === 'Refresher' && (tempType === 'Venti' || selected.value === '22oz')) && product?.ventiPrice;
    const finalPrice = isVenti ? product.ventiPrice : product?.price;
    const label = tempType ? `${tempType} (${this.view.money(finalPrice)}) · ${this.model.getCupLabel(selected.value)}` : this.model.getCupLabel(selected.value);
    this.view.toast(`Added (${label})`);
  },

  addItem(button) {
    this.openCupModal(button);
  },

  changeQty(button, change) {
    if (!this.model.changeCartQuantity(button.dataset.id, change) && change > 0) {
      return this.view.toast('Not enough cup stock');
    }
    this.view.renderCart();
  },

  clearCart() {
    this.model.cart = [];
    this.view.renderCart();
  },

  setOrderType(button) {
    document.querySelectorAll('[data-action="order-type"]').forEach(i => i.classList.remove('meta-active'));
    button.classList.add('meta-active');
    this.model.orderType = button.textContent.toLowerCase().includes('take') ? 'take-out' : 'dine-in';
  },

  checkout() {
    if (!this.model.cart.length) return this.view.toast('Cart is empty');
    const nameInput = document.getElementById('posCustomerName');
    const customerName = (nameInput ? nameInput.value : this.model.posCustomerName || '').trim();
    if (!customerName) {
      if (nameInput) nameInput.focus();
      return this.view.toast('Please enter customer name');
    }
    this.model.posCustomerName = customerName;
    const total = this.model.totals().total;
    this.view.modal('Complete Order', `
      <p>Customer: <strong>${customerName}</strong></p>
      <p>Total: <strong id="checkoutTotalDisplay">${this.view.money(total)}</strong></p>
      <label class="modal-field">Payment method<select id="paymentMethod"><option value="Cash">Cash</option><option value="GCash">GCash</option></select></label>
      <div id="cashPaymentFields">
        <label class="modal-field" style="margin-top:10px;">Amount Paid / Money Received (₱)<input id="paymentAmount" type="number" min="0" step="0.01" value="${total.toFixed(2)}"></label>
        <div class="shift-summary-total" style="margin:10px 0 14px;"><span>Change</span><strong id="paymentChange">${this.view.money(0)}</strong></div>
      </div>
      <button class="primary-action" type="button" data-action="confirm" style="margin-top:12px;">Confirm Payment</button>
    `);
    const cashFields = document.getElementById('cashPaymentFields');
    const amountEl = document.getElementById('paymentAmount');
    const changeEl = document.getElementById('paymentChange');
    const methodEl = document.getElementById('paymentMethod');
    const updateChange = () => {
      const paid = Number(amountEl.value || 0);
      const diff = paid - total;
      changeEl.textContent = diff >= 0 ? this.view.money(diff) : `Short ${this.view.money(Math.abs(diff))}`;
      changeEl.style.color = diff >= 0 ? 'var(--green)' : 'var(--red)';
    };
    const toggleCashFields = () => {
      const isCash = (methodEl?.value || 'Cash') === 'Cash';
      if (cashFields) cashFields.style.display = isCash ? 'block' : 'none';
      if (isCash && amountEl) {
        updateChange();
        amountEl.focus();
        amountEl.select();
      }
    };
    if (amountEl) {
      amountEl.oninput = updateChange;
    }
    if (methodEl) {
      methodEl.onchange = toggleCashFields;
    }
    toggleCashFields();
    this.bindDynamic();
  },

  confirmPayment() {
    const method = document.getElementById('paymentMethod')?.value || 'Cash';
    const total = this.model.totals().total;
    const isCash = method === 'Cash';
    const amountPaid = isCash ? Number(document.getElementById('paymentAmount')?.value || 0) : total;
    const customerName = (document.getElementById('posCustomerName')?.value || this.model.posCustomerName || '').trim();
    if (!customerName) return this.view.toast('Customer name is required');
    if (isCash && (isNaN(amountPaid) || amountPaid < total)) {
      return this.view.toast(`Insufficient cash payment (need ${this.view.money(total)})`);
    }
    try {
      const order = this.model.placePosOrder(method, customerName, amountPaid);
      this.model.cart = [];
      this.model.posCustomerName = '';
      const nameInput = document.getElementById('posCustomerName');
      if (nameInput) nameInput.value = '';
      this.view.renderCart();
      this.view.closeModal();
      const strip = document.getElementById('posQueueStrip');
      if (strip) strip.innerHTML = this.view.posQueueStrip();
      this.view.toast(isCash
        ? `Order ${order.id} queued · Change: ${this.view.money(order.changeAmount || 0)}`
        : `Order ${order.id} queued (GCash)`);
    } catch (error) {
      this.view.toast(error.message || 'Failed to queue order');
    }
  }
});
