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
  <link rel="stylesheet" href="assets/styles.css?v=20261128-PAY1">
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
          <div id="customerCashFields">
            <input type="number" id="customerCashPaid" min="0" step="0.01" placeholder="Cash amount / money to pay * (₱)">
            <div class="customer-change-row"><span>Change</span><strong id="customerChange">₱0.00</strong></div>
          </div>
        </div>
        <div class="grand-total"><span>Total</span><strong id="customerTotal">₱0.00</strong></div>
        <button class="charge-button" type="button" id="placeCustomerOrder"><span>Place order</span><strong>→</strong></button>
      </div>
    </aside>
  </main>

  <div id="actionModal"></div>
  <div class="toast" id="toast" role="status"></div>

  <script>
    (() => {
      const DEFAULT_CUP_VARIANTS = [
        { key: '16oz', name: '16oz Cup', usedFor: 'Refreshers', stock: 50, minStock: 10 },
        { key: '22oz', name: '22oz Cup', usedFor: 'Refreshers', stock: 50, minStock: 10 },
        { key: 'hot', name: 'Hot Cup', usedFor: 'Coffee & Frappe', stock: 50, minStock: 10 }
      ];

      const DEFAULT_PRODUCTS = [
        { id: 1, name: 'Vanilla Latte', category: 'Coffee', price: 150, cupVariant: 'hot', stock: 50, image: 'assets/2.png' },
        { id: 2, name: 'Caramel Machiato', category: 'Coffee', price: 165, cupVariant: 'hot', stock: 50, image: 'assets/3.png' },
        { id: 3, name: 'Mocha Iced', category: 'Coffee', price: 170, cupVariant: 'hot', stock: 50, image: 'assets/4.png' },
        { id: 4, name: 'Matcha Frappe', category: 'Frappe', price: 185, cupVariant: 'hot', stock: 50, image: 'assets/1.png' },
        { id: 5, name: 'Berry Refresher', category: 'Refresher', price: 155, cupVariant: '22oz', stock: 50, image: 'assets/refreshers.png' },
        { id: 6, name: 'Iced Americano', category: 'Coffee', price: 120, cupVariant: 'hot', stock: 50, image: 'assets/3.png' },
        { id: 7, name: 'Chocolate Frappe', category: 'Frappe', price: 180, cupVariant: 'hot', stock: 50, image: 'assets/4.png' },
        { id: 8, name: 'Strawberry Matcha', category: 'Refresher', price: 160, cupVariant: '22oz', stock: 50, image: 'assets/1.png' },
        { id: 9, name: 'Salted Caramel', category: 'Coffee', price: 175, cupVariant: 'hot', stock: 50, image: 'assets/2.png' }
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
        cupVariants: [],
        cart: [],
        category: 'All',
        search: '',
        orderType: 'dine-in',
        trackedName: localStorage.getItem('voodooCustomerOrderName') || ''
      };

      const getAllowedCupKeys = category => (category === 'Refresher' ? ['16oz', '22oz'] : ['hot']);
      const getAllowedCupVariants = category => {
        const keys = getAllowedCupKeys(category);
        return (state.cupVariants || []).filter(c => keys.includes(c.key));
      };
      const inferCupVariant = p => (p.category === 'Refresher' ? (['16oz', '22oz'].includes(p.cupVariant) ? p.cupVariant : '22oz') : 'hot');
      const getCupVariant = key => state.cupVariants.find(c => c.key === key) || { key: 'hot', name: 'Hot Cup', stock: 0 };
      const getCupStock = key => Number(getCupVariant(key)?.stock || 0);
      const getCupLabel = key => getCupVariant(key)?.name || '16oz Cup';
      const getCartCupUsage = cupKey => state.cart.reduce((sum, item) => (inferCupVariant(item) === cupKey ? sum + Number(item.quantity || 0) : sum), 0);

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
        grid.innerHTML = filtered.map(product => {
          const allowedCups = getAllowedCupVariants(product.category);
          const totalAvailable = allowedCups.reduce((sum, c) => sum + Number(c.stock || 0), 0);
          return `
          <article class="product-card" data-product-card="${product.id}" style="cursor:pointer;">
            <div class="product-image"><img src="${product.image}" alt="${product.name}"></div>
            <div class="product-info">
              <div>
                <h3>${product.name}</h3>
                <p>${money(product.price)}${totalAvailable <= 0 ? ' · Out of stock' : ''}</p>
              </div>
              <button class="add-button" type="button" data-open-cup="${product.id}" ${totalAvailable <= 0 ? 'disabled' : ''}>＋ Add</button>
            </div>
          </article>
        `; }).join('') || '<p>No products found.</p>';
      };

      const closeCupModal = () => {
        const modal = document.getElementById('actionModal');
        if (!modal) return;
        modal.classList.remove('open');
        modal.innerHTML = '';
      };

      const openCustomerCupModal = productId => {
        const product = state.products.find(p => p.id === productId);
        if (!product) return;
        const allowedCups = getAllowedCupVariants(product.category);
        const firstAvailable = allowedCups.find(c => Number(c.stock) > 0) || allowedCups[0];
        const cupCards = allowedCups.map(cup => {
          const disabled = Number(cup.stock) <= 0;
          const checked = firstAvailable && cup.key === firstAvailable.key && !disabled ? 'checked' : '';
          return `<label class="cup-option-card ${disabled ? 'disabled' : ''}">
            <input type="radio" name="customerCupVariant" value="${cup.key}" ${checked} ${disabled ? 'disabled' : ''}>
            <div>
              <strong>${cup.name}</strong>
              ${disabled ? '<small>Out of stock</small>' : ''}
            </div>
          </label>`;
        }).join('');
        const modal = document.getElementById('actionModal');
        modal.classList.add('open');
        modal.innerHTML = `<div class="modal-backdrop"><div class="modal-card">
          <div class="data-head"><h2>Select Cup — ${product.name}</h2><button class="row-action" type="button" id="closeCustomerCupModal">×</button></div>
          <div class="modal-body">
            <div class="cup-modal-product">
              <img src="${product.image}" alt="${product.name}">
              <div><strong>${product.name}</strong><p>${product.category} · ${money(product.price)}</p></div>
            </div>
            <div class="cup-option-grid">${cupCards}</div>
            <button class="primary-action" type="button" id="confirmCustomerCupAdd" data-id="${product.id}" style="width:100%;margin-top:14px;">Add to Cart</button>
          </div>
        </div></div>`;
      };

      const renderCart = () => {
        const list = document.getElementById('customerCartItems');
        const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        list.innerHTML = state.cart.length
          ? state.cart.map(item => {
            const key = item.cartKey || `${item.id}_${inferCupVariant(item)}`;
            const cupLabel = getCupLabel(item.cupVariant || inferCupVariant(item));
            return `
            <div class="cart-item">
              <img src="${item.image}" alt="">
              <div><h4>${item.name}</h4><small>${cupLabel} · ${money(item.price)}</small></div>
              <div class="quantity">
                <button type="button" data-qty="-1" data-id="${key}">−</button>
                <span>${item.quantity}</span>
                <button type="button" data-qty="1" data-id="${key}">＋</button>
              </div>
            </div>
          `; }).join('')
          : '<div class="empty-cart">Tap ＋ on a drink to start your order.</div>';
        document.getElementById('customerTotal').textContent = money(total);
        updateCustomerPaymentUi();
      };

      const updateCustomerPaymentUi = () => {
        const method = document.getElementById('customerPayment')?.value || 'Cash';
        const cashFields = document.getElementById('customerCashFields');
        const cashInput = document.getElementById('customerCashPaid');
        const changeEl = document.getElementById('customerChange');
        const total = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const isCash = method === 'Cash';
        if (cashFields) cashFields.style.display = isCash ? 'block' : 'none';
        if (isCash && changeEl) {
          const paid = Number(cashInput?.value || 0);
          const diff = paid - total;
          if (!cashInput?.value) {
            changeEl.textContent = money(0);
            changeEl.style.color = 'var(--muted)';
          } else {
            changeEl.textContent = diff >= 0 ? money(diff) : `Short ${money(Math.abs(diff))}`;
            changeEl.style.color = diff >= 0 ? 'var(--green)' : 'var(--red)';
          }
        }
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

      let lastDbProductSync = 0;
      const loadProducts = async (forceDb = false) => {
        const now = Date.now();
        if (forceDb || now - lastDbProductSync > 15000) {
          lastDbProductSync = now;
          try {
            const resp = await fetch('Controller/db_sync.php?action=get_products');
            const data = await resp.json();
            if (data.ok && Array.isArray(data.products) && data.products.length) {
              if (Array.isArray(data.cupVariants) && data.cupVariants.length) {
                state.cupVariants = data.cupVariants;
                saveStore('voodooCupVariants', state.cupVariants);
              }
              state.products = data.products;
              saveStore('voodooProducts', state.products);
              renderMenu();
              return;
            }
          } catch (err) { /* fallback to localStorage */ }
        }
        state.cupVariants = loadStore('voodooCupVariants', DEFAULT_CUP_VARIANTS);
        state.products = loadStore('voodooProducts', DEFAULT_PRODUCTS).map(p => ({
          ...p,
          cupVariant: inferCupVariant(p),
          stock: getCupStock(inferCupVariant(p))
        }));
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
        if (event.target.id === 'closeCustomerCupModal' || event.target.classList.contains('modal-backdrop')) {
          closeCupModal();
          return;
        }

        if (event.target.id === 'confirmCustomerCupAdd') {
          const id = Number(event.target.dataset.id);
          const product = state.products.find(p => p.id === id);
          const selected = document.querySelector('input[name="customerCupVariant"]:checked');
          if (!product || !selected) return toast('Selected cup variant is out of stock');
          const cupKey = selected.value;
          const cupStock = getCupStock(cupKey);
          const cupLabel = getCupLabel(cupKey);
          const qtyToAdd = 1;
          const usedCups = getCartCupUsage(cupKey);
          if (usedCups + qtyToAdd > cupStock) {
            return toast(`Only ${Math.max(0, cupStock - usedCups)} ${cupLabel}(s) left`);
          }
          const cartKey = `${id}_${cupKey}`;
          const existing = state.cart.find(c => (c.cartKey || `${c.id}_${inferCupVariant(c)}`) === cartKey);
          if (existing) {
            existing.quantity += qtyToAdd;
          } else {
            state.cart.push({ ...product, cupVariant: cupKey, cartKey, quantity: qtyToAdd });
          }
          renderCart();
          closeCupModal();
          return toast(`Added ${product.name} (${cupLabel})`);
        }

        const openBtn = event.target.closest('[data-open-cup]');
        if (openBtn) {
          openCustomerCupModal(Number(openBtn.dataset.openCup));
          return;
        }

        const card = event.target.closest('[data-product-card]');
        if (card && !event.target.closest('button')) {
          openCustomerCupModal(Number(card.dataset.productCard));
          return;
        }

        const qtyBtn = event.target.closest('[data-qty]');
        if (qtyBtn) {
          const keyStr = String(qtyBtn.dataset.id);
          const change = Number(qtyBtn.dataset.qty);
          const item = state.cart.find(c => (c.cartKey || `${c.id}_${inferCupVariant(c)}`) === keyStr);
          if (!item) return;
          const cupKey = item.cupVariant || inferCupVariant(item);
          if (change > 0 && getCartCupUsage(cupKey) >= getCupStock(cupKey)) {
            return toast(`Not enough ${getCupLabel(cupKey)} stock`);
          }
          item.quantity += change;
          if (item.quantity <= 0) state.cart = state.cart.filter(c => (c.cartKey || `${c.id}_${inferCupVariant(c)}`) !== keyStr);
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
        const cashEl = document.getElementById('customerCashPaid');
        if (cashEl) cashEl.value = '';
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

      document.getElementById('customerPayment').onchange = updateCustomerPaymentUi;
      document.getElementById('customerCashPaid').oninput = updateCustomerPaymentUi;

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

        const subtotal = state.cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
        const isCash = paymentMethod === 'Cash';
        const cashInput = document.getElementById('customerCashPaid');
        const amountPaid = isCash ? Number(cashInput?.value || 0) : subtotal;
        if (isCash && (!cashInput?.value || isNaN(amountPaid) || amountPaid < subtotal)) {
          if (cashInput) cashInput.focus();
          return toast(`Insufficient cash payment (need ${money(subtotal)})`);
        }

        loadProducts();
        const neededByCup = {};
        for (const cartItem of state.cart) {
          const product = state.products.find(p => p.id === cartItem.id);
          const cupKey = cartItem.cupVariant || (product ? inferCupVariant(product) : '16oz');
          neededByCup[cupKey] = (neededByCup[cupKey] || 0) + Number(cartItem.quantity || 0);
        }
        for (const [cupKey, needed] of Object.entries(neededByCup)) {
          if (getCupStock(cupKey) < needed) {
            return toast(`Not enough ${getCupLabel(cupKey)} stock (${getCupStock(cupKey)} left)`);
          }
        }

        const order = {
          id: '#Q' + String(Date.now()).slice(-6),
          customerName,
          tableNote,
          source: 'qr',
          orderType: state.orderType,
          status: 'pending',
          paymentMethod,
          amountPaid,
          changeAmount: isCash ? Math.max(0, amountPaid - subtotal) : 0,
          account: 'QR Customer',
          time: new Date().toISOString(),
          items: state.cart.map(item => ({
            productId: item.id,
            name: item.name,
            cupVariant: item.cupVariant || inferCupVariant(item),
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
        if (cashInput) cashInput.value = '';
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
