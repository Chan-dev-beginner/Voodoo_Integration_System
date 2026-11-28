Object.assign(AppView.prototype, {
  productCardHtml(product) {
    const allowedCups = this.model.getAllowedCupVariants(product.category);
    const totalAvailable = allowedCups.reduce((sum, c) => sum + Number(c.stock || 0), 0);
    const priceDisplay = product.category === 'Refresher' && product.ventiPrice && product.ventiPrice !== product.price
      ? `${this.money(product.price)} / ${this.money(product.ventiPrice)}`
      : this.money(product.price);
    return `<article class="product-card" data-product-card="${product.id}" data-action="pick-cup" data-id="${product.id}" data-category="${product.category}" style="cursor:pointer;">
      <div class="product-image"><img src="${product.image}" alt="${product.name}"></div>
      <div class="product-info">
        <div class="product-details">
          <h3>${product.name}</h3>
          <p>${priceDisplay}</p>
        </div>
        <button class="add-button" type="button" data-action="pick-cup" data-id="${product.id}" ${totalAvailable <= 0 ? 'disabled' : ''}>&#65291;</button>
      </div>
    </article>`;
  },

  productGrid(category) {
    const products = category && category !== 'All'
      ? this.model.products.filter(p => p.category === category)
      : this.model.products;
    return `<div class="menu-grid">${products.map(p => this.productCardHtml(p)).join('')}</div>`;
  },

  pos() {
    const savedName = (this.model.posCustomerName || '').replace(/"/g, '&quot;');
    return `<div class="pos-layout">
      <section class="catalog-panel">
        <div class="catalog-toolbar">
          <label class="search"><span>&#8981;</span><input type="search" data-action="menu-search" placeholder="Search menu"></label>
          <div class="module-actions">
            <button class="secondary-action" type="button" data-action="show-qr">Customer QR</button>
          </div>
        </div>
        <div class="category-tabs" id="posCategoryTabs">
          <button type="button" class="active" data-pos-cat="All">All</button>
          <button type="button" data-pos-cat="Coffee">Coffee</button>
          <button type="button" data-pos-cat="Frappe">Frappe</button>
          <button type="button" data-pos-cat="Refresher">Refresher</button>
          <button type="button" data-pos-cat="Non-coffee">Non-coffee</button>
        </div>
        <div id="posQueueStrip">${this.posQueueStrip()}</div>
        <div id="posGrid">${this.productGrid()}</div>
      </section>
      <aside class="order-panel">
        <div class="order-heading">
          <div><p>Current order</p><h2>POS Order</h2></div>
          <button type="button" data-action="clear">Clear</button>
        </div>
        <div class="order-meta">
          <button type="button" class="meta-active" data-action="order-type">Dine in</button>
          <button type="button" data-action="order-type">Take out</button>
        </div>
        <div class="cart-items" id="cartItems"></div>
        <div class="order-total">
          <input type="text" id="posCustomerName" class="pos-customer-input" value="${savedName}" placeholder="Customer name * (required)" required>
          <div><span>Subtotal</span><strong id="subtotal">&#8369;0.00</strong></div>
          <div class="grand-total"><span>Total</span><strong id="grandTotal">&#8369;0.00</strong></div>
          <button class="charge-button" type="button" data-action="checkout"><span>Charge</span><strong id="chargeTotal">&#8369;0.00</strong></button>
        </div>
      </aside>
    </div>`;
  },

  ordering() {
    return `<div class="ordering-layout">
      <section class="catalog-panel">
        <div class="kiosk-hero"><p>Voodoo eSports Café</p><h2>Fuel your game</h2><p>Fresh drinks, bold flavors, fast service</p></div>
        <div class="catalog-toolbar">
          <label class="search"><span>&#8981;</span><input type="search" data-action="menu-search" placeholder="Search menu"></label>
        </div>
        <div id="orderingGrid">${this.productGrid()}</div>
      </section>
      <aside class="kiosk-cart">
        <div class="order-heading"><div><p>Your order</p><h2>Cart</h2></div></div>
        <div id="kioskCart" class="cart-items"></div>
        <div class="order-total">
          <div class="grand-total"><span>Total</span><strong id="kioskTotal">&#8369;0.00</strong></div>
          <button class="charge-button" type="button" data-action="checkout"><span>Place order</span><strong>&#8594;</strong></button>
        </div>
      </aside>
    </div>`;
  },

  renderCart() {
    const totals = this.model.totals();
    const html = this.model.cart.length ? this.model.cart.map(item => {
      const cupLabel = item.cupLabel || this.model.getCupLabel(item.cupVariant || '16oz');
      const key = item.cartKey || item.id;
      return `<div class="cart-item"><img src="${item.image}" alt=""><div><h4>${item.name}</h4><small>${cupLabel} · ${this.money(item.price)}</small></div><div class="quantity"><button type="button" data-action="minus" data-id="${key}">&#8722;</button><span>${item.quantity}</span><button type="button" data-action="plus" data-id="${key}">&#65291;</button></div></div>`;
    }).join('') : '<div class="empty-cart">Your cart is empty.</div>';
    ['cartItems','kioskCart'].forEach(id => { const element = document.getElementById(id); if (element) element.innerHTML = html; });
    [['subtotal',totals.subtotal],['grandTotal',totals.total],['chargeTotal',totals.total],['kioskTotal',totals.total]].forEach(([id,value]) => { const element = document.getElementById(id); if (element) element.textContent = this.money(value); });
  }
});
