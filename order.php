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
  <link rel="stylesheet" href="assets/styles.css?v=20261125-MOD2">
</head>
<body class="customer-ordering-body">
  <header class="customer-header">
    <div class="customer-brand">
      <span class="brand-kicker">Voodoo</span>
      <strong>ESports Cafe · Customer Order</strong>
    </div>
    <button class="secondary-action" type="button" id="trackLookupBtn">Track Order</button>
  </header>

  <main class="ordering-layout customer-ordering-layout">
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
          <input type="text" id="customerName" placeholder="Your name (optional)">
          <input type="text" id="customerTable" placeholder="PC / Table # (optional)">
          <select id="customerPayment">
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
        activeOrderNumber: localStorage.getItem('voodooCustomerOrderNumber') || ''
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
              <button class="add-button" type="button" data-add="${product.id}" ${product.stock <= 0 ? 'disabled' : ''}>＋</button>
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
              <small>Live Order Status</small>
              <h3>${order.id} · ${statusLabel(order.status)}</h3>
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

      const pollTrackedOrder = () => {
        if (!state.activeOrderNumber) return;
        const orders = loadStore('voodooShiftOrders', []);
        const order = orders.find(o => o.id === state.activeOrderNumber);
        if (order) renderTracker(order);
      };

      document.addEventListener('click', event => {
        const addBtn = event.target.closest('[data-add]');
        if (addBtn) {
          const id = Number(addBtn.dataset.add);
          const product = state.products.find(p => p.id === id);
          if (!product || product.stock <= 0) return toast('Out of stock');
          const existing = state.cart.find(c => c.id === id);
          if (existing) {
            if (existing.quantity >= product.stock) return toast('Not enough stock');
            existing.quantity++;
          } else {
            state.cart.push({ ...product, quantity: 1 });
          }
          renderCart();
          return toast('Added to cart');
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

      document.getElementById('trackLookupBtn').onclick = () => {
        const num = prompt('Enter your Order # (for example #Q123456):', state.activeOrderNumber || '#Q');
        if (!num) return;
        state.activeOrderNumber = num.trim();
        localStorage.setItem('voodooCustomerOrderNumber', state.activeOrderNumber);
        pollTrackedOrder();
      };

      document.getElementById('placeCustomerOrder').onclick = () => {
        if (!state.cart.length) return toast('Your cart is empty');
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
          customerName: document.getElementById('customerName').value.trim() || 'QR Customer',
          tableNote: document.getElementById('customerTable').value.trim(),
          source: 'qr',
          orderType: state.orderType,
          status: 'pending',
          paymentMethod: document.getElementById('customerPayment').value,
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

        const orders = loadStore('voodooShiftOrders', []);
        orders.unshift(order);
        saveStore('voodooShiftOrders', orders);

        state.cart = [];
        renderCart();
        state.activeOrderNumber = order.id;
        localStorage.setItem('voodooCustomerOrderNumber', order.id);
        renderTracker(order);
        toast(`Order ${order.id} sent for barista approval`);
      };

      window.addEventListener('storage', () => {
        loadProducts();
        pollTrackedOrder();
      });

      loadProducts();
      renderCart();
      pollTrackedOrder();
      setInterval(() => {
        loadProducts();
        pollTrackedOrder();
      }, 3000);
    })();
  </script>
</body>
</html>
