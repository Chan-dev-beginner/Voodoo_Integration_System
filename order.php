<?php
require_once __DIR__ . '/Model/config.php';
$pageTitle = APP_TITLE . ' — Self-Service Ordering';
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?= htmlspecialchars($pageTitle) ?></title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=DM+Sans:wght@500;600;700&family=Oxanium:wght@600;700;800&display=swap" rel="stylesheet">
  <link rel="stylesheet" href="assets/styles.css?v=20261125-MOD12">
</head>
<body class="customer-ordering-body">
  <header class="customer-header">
    <div class="customer-brand">
      <span class="brand-kicker">Voodoo</span>
      <strong>ESports Cafe · Customer Order</strong>
    </div>
    <button class="secondary-action" type="button" id="trackLookupBtn">Track Order</button>
  </header>

  <div id="orderingClosedNotice" class="ordering-closed hidden">
    <div class="ordering-closed-card">
      <span class="brand-kicker">Voodoo eSports Café</span>
      <h2>Ordering is Currently Closed</h2>
      <p>No barista is currently signed in. Customer ordering will open automatically once a barista logs in.</p>
      <small>Checking barista status automatically...</small>
    </div>
  </div>

  <main class="ordering-layout customer-ordering-layout" id="orderingMain">
    <section class="catalog-panel">
      <div class="kiosk-hero">
        <p>Voodoo eSports Café · QR Self-Order</p>
        <h2>Fuel your game</h2>
        <p>Order straight from your phone. Your order goes directly to our barista for approval.</p>
      </div>

      <div id="liveTrackerCard" class="tracker-card hidden"></div>

      <div class="catalog-toolbar">
        <label class="search"><span>⌕</span><input type="search" id="customerSearch" placeholder="Search menu"></label>
        <div class="category-tabs" id="customerCategories">
          <button type="button" class="active" data-cat="All">All</button>
          <button type="button" data-cat="Coffee">Coffee</button>
          <button type="button" data-cat="Frappe">Frappe</button>
          <button type="button" data-cat="Refresher">Refresher</button>
        </div>
      </div>

      <div id="customerMenuGrid" class="menu-grid">
        <p>Loading menu...</p>
      </div>
    </section>

    <aside class="kiosk-cart">
      <div class="order-heading">
        <div>
          <p>Your order</p>
          <h2>Cart</h2>
        </div>
        <button type="button" id="customerClearCart">Clear</button>
      </div>

      <div class="order-meta" id="customerOrderType">
        <button type="button" class="meta-active" data-type="dine-in">Dine in</button>
        <button type="button" data-type="take-out">Take out</button>
      </div>

      <div id="customerCartItems" class="cart-items"></div>

      <div class="order-total">
        <div class="customer-fields">
          <input type="text" id="customerName" placeholder="Your name * (required)" required>
          <input type="text" id="customerTable" placeholder="PC / Table # * (required)" required>
          <select id="customerPayment" aria-label="Payment method">
            <option value="Cash">Pay with Cash</option>
            <option value="GCash">Pay with GCash</option>
          </select>
        </div>
        <div class="grand-total"><span>Total</span><strong id="customerTotal">₱0.00</strong></div>
        <button class="charge-button" type="button" id="placeCustomerOrder"><span>Place order</span><strong>→</strong></button>
      </div>
    </aside>
  </main>

  <div class="toast" id="toast" role="status"></div>

  <script>
    (() => {
      const DEFAULT_PRODUCTS = [
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

      const loadStore = (key, fallback) => {
        try {
          const parsed = JSON.parse(localStorage.getItem(key));
          return parsed === null || parsed === undefined ? fallback : parsed;
        } catch (err) {
          return fallback;
        }
      };

      const saveStore = (key, value) => {
        try { localStorage.setItem(key, JSON.stringify(value)); } catch (err) { /* ignore */ }
      };

      const state = {
        products: [],
        cart: [],
        category: 'All',
        search: '',
        orderType: 'dine-in',
        trackedName: localStorage.getItem('voodooCustomerOrderName') || ''
      };

      const money = value => `₱${Number(value || 0).toFixed(2)}`;
      let toastTimer;
      const toast = message => {
        const el = document.getElementById('toast');
        el.textContent = message;
        el.classList.add('show');
        clearTimeout(toastTimer);
        toastTimer = setTimeout(() => el.classList.remove('show'), 2200);
      };

      const statusLabel = status => ({
        pending: 'Pending Barista Approval',
        queue: 'In Queue',
        preparing: 'Preparing',
        completed: 'Completed',
        cancelled: 'Cancelled'
      }[status] || status);

      const renderMenu = () => {
        const grid = document.getElementById('customerMenuGrid');
        const query = state.search.toLowerCase();
        const filtered = state.products.filter(p =>
          (state.category === 'All' || p.category === state.category) &&
          p.name.toLowerCase().includes(query)
        );
        grid.innerHTML = filtered.map(product => `
          <article class="product-card">
            <div class="product-image"><img src="${product.image}" alt="${product.name}"></div>
            <div class="product-info">
              <div>
                <h3>${product.name}</h3>
                <p>${money(product.price)} · ${product.stock > 0 ? product.stock + ' left' : 'Out of stock'}</p>
              </div>
              <div class="card-order-controls">
                <div class="card-qty-stepper">
                  <button type="button" data-step="-1" data-id="${product.id}" ${product.stock <= 0 ? 'disabled' : ''}>−</button>
                  <input type="number" class="card-qty-input" data-card-qty="${product.id}" value="1" min="1" max="${Math.max(1, product.stock)}" ${product.stock <= 0 ? 'disabled' : ''} aria-label="Quantity for ${product.name}">
                  <button type="button" data-step="1" data-id="${product.id}" ${product.stock <= 0 ? 'disabled' : ''}>＋</button>
                </div>
                <button class="add-button" type="button" data-add="${product.id}" ${product.stock <= 0 ? 'disabled' : ''}>＋ Add</button>
              </div>
            </div>
          </article>
        `).join('') || '<p>No products found.</p>';
      };

      const renderCart = () => {
        const list = document.getElementById('customerCartItems');
        const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        list.innerHTML = state.cart.length
          ? state.cart.map(item => `
            <div class="cart-item">
              <img src="${item.image}" alt="">
              <div><h4>${item.name}</h4><small>${money(item.price)}</small></div>
              <div class="quantity">
                <button type="button" data-qty="-1" data-id="${item.id}">−</button>
                <span>${item.quantity}</span>
                <button type="button" data-qty="1" data-id="${item.id}">＋</button>
              </div>
            </div>
          `).join('')
          : '<div class="empty-cart">Tap ＋ on a drink to start your order.</div>';
        document.getElementById('customerTotal').textContent = money(total);
      };

      const renderTracker = order => {
        const card = document.getElementById('liveTrackerCard');
        if (!order) {
          card.classList.add('hidden');
          card.innerHTML = '';
          return;
        }
        const steps = ['pending', 'queue', 'preparing', 'completed'];
        const currentIndex = steps.indexOf(order.status);
        const stepHtml = order.status === 'cancelled'
          ? '<p class="stock-out">This order was cancelled by the barista.</p>'
          : `<div class="tracker-steps">${steps.map((s, idx) => `
              <span class="tracker-step ${idx <= currentIndex ? 'done' : ''} ${s === order.status ? 'current' : ''}">
                ${s === 'pending' ? 'Approval' : s.toUpperCase()}
              </span>
            `).join('')}</div>`;

        card.classList.remove('hidden');
        card.innerHTML = `
          <div class="tracker-top">
            <div>
              <small>Live Order Status${order.tableNote ? ' · ' + order.tableNote : ''}</small>
              <h3>${order.customerName || 'Customer'} · ${statusLabel(order.status)}</h3>
            </div>
            <strong>${money(order.total)}</strong>
          </div>
          ${stepHtml}
          <p class="tracker-items">${order.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}</p>
        `;
      };

      const loadProducts = () => {
        state.products = loadStore('voodooProducts', DEFAULT_PRODUCTS);
        renderMenu();
      };

      const pollTrackedOrder = async (notifyIfMissing = false) => {
        if (!state.trackedName) return false;
        const needle = state.trackedName.trim().toLowerCase();
        // Try server bridge first (works across devices)
        try {
          const resp = await fetch('Controller/orders_bridge.php?action=track&name=' + encodeURIComponent(state.trackedName));
          const data = await resp.json();
          if (data.ok && data.order) { renderTracker(data.order); return true; }
        } catch (err) { /* fall through to localStorage */ }
        // Fallback: same-browser localStorage (latest matching order)
        const orders = loadStore('voodooShiftOrders', []);
        const order = orders.find(o => String(o.customerName || '').trim().toLowerCase() === needle || String(o.id || '').trim().toLowerCase() === needle);
        if (order) { renderTracker(order); return true; }
        if (notifyIfMissing) toast('No order found for that name');
        return false;
      };

      document.addEventListener('click', event => {
        const stepBtn = event.target.closest('[data-step]');
        if (stepBtn) {
          const id = Number(stepBtn.dataset.id);
          const delta = Number(stepBtn.dataset.step);
          const input = document.querySelector(`[data-card-qty="${id}"]`);
          const product = state.products.find(p => p.id === id);
          if (!input || !product) return;
          const next = Math.max(1, Math.min(product.stock, (parseInt(input.value, 10) || 1) + delta));
          input.value = next;
          return;
        }

        const addBtn = event.target.closest('[data-add]');
        if (addBtn) {
          const id = Number(addBtn.dataset.add);
          const product = state.products.find(p => p.id === id);
          if (!product || product.stock <= 0) return toast('Out of stock');
          const qtyInput = document.querySelector(`[data-card-qty="${id}"]`);
          const qtyToAdd = Math.max(1, parseInt(qtyInput?.value, 10) || 1);
          const existing = state.cart.find(c => c.id === id);
          const currentQty = existing ? existing.quantity : 0;
          if (currentQty + qtyToAdd > product.stock) {
            return toast(`Only ${product.stock - currentQty} left in stock`);
          }
          if (existing) {
            existing.quantity += qtyToAdd;
          } else {
            state.cart.push({ ...product, quantity: qtyToAdd });
          }
          if (qtyInput) qtyInput.value = 1;
          renderCart();
          return toast(`Added ${qtyToAdd}× ${product.name}`);
        }

        const qtyBtn = event.target.closest('[data-qty]');
        if (qtyBtn) {
          const id = Number(qtyBtn.dataset.id);
          const change = Number(qtyBtn.dataset.qty);
          const item = state.cart.find(c => c.id === id);
          const product = state.products.find(p => p.id === id);
          if (!item) return;
          if (change > 0 && product && item.quantity >= product.stock) return toast('Not enough stock');
          item.quantity += change;
          if (item.quantity <= 0) state.cart = state.cart.filter(c => c.id !== id);
          renderCart();
          return;
        }

        const catBtn = event.target.closest('[data-cat]');
        if (catBtn) {
          document.querySelectorAll('#customerCategories button').forEach(b => b.classList.remove('active'));
          catBtn.classList.add('active');
          state.category = catBtn.dataset.cat;
          renderMenu();
          return;
        }

        const typeBtn = event.target.closest('[data-type]');
        if (typeBtn) {
          document.querySelectorAll('#customerOrderType button').forEach(b => b.classList.remove('meta-active'));
          typeBtn.classList.add('meta-active');
          state.orderType = typeBtn.dataset.type;
        }
      });

      document.getElementById('customerSearch').oninput = event => {
        state.search = event.target.value;
        renderMenu();
      };

      document.getElementById('customerClearCart').onclick = () => {
        state.cart = [];
        renderCart();
      };

      document.getElementById('trackLookupBtn').onclick = async () => {
        const defaultName = state.trackedName || document.getElementById('customerName').value.trim() || '';
        const name = prompt('Enter your name to track your order:', defaultName);
        if (!name || !name.trim()) return;
        state.trackedName = name.trim();
        localStorage.setItem('voodooCustomerOrderName', state.trackedName);
        await pollTrackedOrder(true);
      };

      document.getElementById('placeCustomerOrder').onclick = async () => {
        if (!state.cart.length) return toast('Your cart is empty');
        const nameInput = document.getElementById('customerName');
        const tableInput = document.getElementById('customerTable');
        const customerName = nameInput.value.trim();
        const tableNote = tableInput.value.trim();
        if (!customerName) {
          nameInput.focus();
          return toast('Please enter your name');
        }
        if (!tableNote) {
          tableInput.focus();
          return toast('Please enter your PC # or Table #');
        }

        const paymentMethod = document.getElementById('customerPayment').value;
        if (paymentMethod !== 'Cash' && paymentMethod !== 'GCash') {
          return toast('Payment must be Cash or GCash only');
        }

        loadProducts();
        for (const cartItem of state.cart) {
          const product = state.products.find(p => p.id === cartItem.id);
          if (!product || product.stock < cartItem.quantity) {
            return toast(`Not enough stock for ${cartItem.name}`);
          }
        }

        const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const order = {
          id: '#Q' + String(Date.now()).slice(-6),
          customerName,
          tableNote,
          source: 'qr',
          orderType: state.orderType,
          status: 'pending',
          paymentMethod,
          account: 'QR Customer',
          time: new Date().toISOString(),
          items: state.cart.map(item => ({
            productId: item.id,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            total: item.price * item.quantity
          })),
          subtotal,
          tax: 0,
          total: subtotal
        };

        // Save to localStorage (same-browser fallback)
        const orders = loadStore('voodooShiftOrders', []);
        orders.unshift(order);
        saveStore('voodooShiftOrders', orders);

        // Send to server bridge so barista on another device can see it
        try {
          await fetch('Controller/orders_bridge.php?action=place', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(order)
          });
        } catch (err) { /* offline fallback — localStorage only */ }

        state.cart = [];
        renderCart();
        state.trackedName = customerName;
        localStorage.setItem('voodooCustomerOrderName', customerName);
        renderTracker(order);
        toast(`Order for ${customerName} sent for barista approval`);
      };

      const checkBaristaOnline = async () => {
        const notice = document.getElementById('orderingClosedNotice');
        const main = document.getElementById('orderingMain');
        try {
          const resp = await fetch('Controller/orders_bridge.php?action=barista_status');
          const data = await resp.json();
          const open = Boolean(data.ok && data.loggedIn);
          state.baristaOnline = open;
          if (notice) notice.classList.toggle('hidden', open);
          if (main) main.classList.toggle('hidden', !open);
        } catch (err) {
          // Keep current state if network blips
        }
      };

      window.addEventListener('storage', () => {
        loadProducts();
        pollTrackedOrder();
      });

      checkBaristaOnline();
      loadProducts();
      renderCart();
      pollTrackedOrder();
      setInterval(() => {
        checkBaristaOnline();
        loadProducts();
        pollTrackedOrder();
      }, 3000);
    })();
  </script>
</body>
</html>
