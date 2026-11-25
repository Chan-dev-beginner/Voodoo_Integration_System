class AppView {
  constructor(model) { this.model = model; }

  money(value) { return `₱${Number(value).toFixed(2)}`; }

  toast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  clock() {
    document.getElementById('clock').textContent = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date());
  }

  nav(items) {
    const icons = {
      dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
      inventory: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/></svg>',
      alerts: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/></svg>',
      restock: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.34 5.66"/><path d="M20 4v7h-7"/></svg>',
      'order-log': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h6"/></svg>',
      backup: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5M5 21h14"/></svg>',
      pos: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h3M14 12h3M7 16h3M14 16h3"/></svg>',
      'order-queue': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/><circle cx="19" cy="18" r="2"/></svg>',
      accounts: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M3 19c0-3.2 2.7-5 6-5s6 1.8 6 5"/><path d="M16 11h5M18.5 8.5v5"/></svg>',
      ordering: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M3 4h2l2.5 11h11l2-7H7"/></svg>'
    };

    document.getElementById('sideNav').innerHTML = items.map((item, index) => `
      <button class="nav-item ${index === 0 ? 'active' : ''}" type="button" data-module="${item[0]}" aria-label="${item[2]}">
        <span class="nav-icon">${icons[item[0]] || icons.dashboard}</span>
        <span class="nav-label">${item[2]}</span>
      </button>
    `).join('');
  }

  dashboard() {
    const inventory = this.model.module === 'inventory';
    const metrics = inventory
      ? [['Product stock','₱38,920','9 products'],['Low stock','3 items','Needs attention'],['Out of stock','1 item','Urgent'],['Pending restocks',String(this.model.restockRequests.filter(item => item.status === 'Pending').length),'Awaiting approval']]
      : [["Today's sales","₱12,480","+8.4%"],["Orders","86","12 pending"],["Average order","₱145.12","+3.1%"],["Transactions","64","+6 today"]];
    return `<div class="dashboard-grid">${metrics.map(metric => `<article class="metric-card"><span>${metric[0]}</span><strong>${metric[1]}</strong><small>${metric[2]}</small></article>`).join('')}</div><div class="dashboard-split"><section class="chart-card"><h2>${inventory?'Inventory overview':'Sales overview'}</h2><div class="chart-bars"><i style="height:42%"></i><i style="height:67%"></i><i style="height:54%"></i><i style="height:78%"></i><i style="height:64%"></i><i style="height:92%"></i><i style="height:72%"></i></div></section><section class="activity-card"><h2>Recent activity</h2><div class="activity-list"><div class="activity-item"><i class="activity-dot"></i><div><strong>Order #1008</strong><br><span>Added 3 items · 10:42 AM</span></div></div><div class="activity-item"><i class="activity-dot"></i><div><strong>Stock adjusted</strong><br><span>Matcha Frappe · 10:31 AM</span></div></div></div></section></div>`;
  }

  productGrid() {
    return `<div class="menu-grid">${this.model.products.map(product => `<article class="product-card"><div class="product-image"><img src="${product.image}" alt="${product.name}"></div><div class="product-info"><div><h3>${product.name}</h3><p>${this.money(product.price)}</p></div><button class="add-button" type="button" data-action="add" data-id="${product.id}" ${product.stock <= 0 ? 'disabled' : ''}>＋</button></div></article>`).join('')}</div>`;
  }

  pos() {
    return `<div class="pos-layout"><section class="catalog-panel"><div class="catalog-toolbar"><label class="search"><span>⌕</span><input type="search" data-action="menu-search" placeholder="Search menu"></label><div class="module-actions"><button class="secondary-action" type="button" data-action="show-qr">Customer QR</button></div></div><div id="posQueueStrip">${this.posQueueStrip()}</div><div id="posGrid">${this.productGrid()}</div></section><aside class="order-panel"><div class="order-heading"><div><p>Current order</p><h2>POS Order</h2></div><button type="button" data-action="clear">Clear</button></div><div class="order-meta"><button type="button" class="meta-active" data-action="order-type">Dine in</button><button type="button" data-action="order-type">Take out</button></div><div class="cart-items" id="cartItems"></div><div class="order-total"><div><span>Subtotal</span><strong id="subtotal">₱0.00</strong></div><div class="grand-total"><span>Total</span><strong id="grandTotal">₱0.00</strong></div><button class="charge-button" type="button" data-action="checkout"><span>Charge</span><strong id="chargeTotal">₱0.00</strong></button></div></aside></div>`;
  }

  orderCardActions(order) {
    if (order.status === 'pending') {
      return `<button class="row-action queue-approve" type="button" data-action="order-status" data-id="${order.id}" data-status="queue">Approve → Queue</button><button class="row-action queue-reject" type="button" data-action="order-status" data-id="${order.id}" data-status="cancelled">Reject</button>`;
    }
    if (order.status === 'queue') {
      return `<button class="row-action queue-prepare" type="button" data-action="order-status" data-id="${order.id}" data-status="preparing">Start Preparing</button>`;
    }
    if (order.status === 'preparing') {
      return `<button class="row-action queue-complete" type="button" data-action="order-status" data-id="${order.id}" data-status="completed">Mark Completed</button>`;
    }
    return '';
  }

  posQueueStrip() {
    const active = this.model.getActiveOrders();
    if (!active.length) {
      return `<div class="queue-strip-empty"><span>Live Queue: No pending or active orders.</span><button class="row-action" type="button" data-action="show-qr">Show QR Code</button></div>`;
    }
    const statusText = { pending: 'Pending Approval', queue: 'Queue', preparing: 'Preparing' };
    return `<div class="queue-strip"><div class="queue-strip-head"><strong>Live Order Queue (${active.length})</strong><small>Approve incoming QR &amp; POS orders to queue</small></div><div class="queue-cards">${active.map(order => `<article class="queue-card status-${order.status}"><div class="queue-card-top"><div><strong>${order.id}</strong> <span class="source-pill ${order.source === 'qr' ? 'source-qr' : ''}">${order.source === 'qr' ? 'QR Order' : 'POS'}</span></div><span class="status ${order.status === 'pending' ? 'pending' : 'done'}">${statusText[order.status] || order.status}</span></div><p class="queue-meta">${order.customerName || 'Walk-in'}${order.tableNote ? ' · ' + order.tableNote : ''} · ${order.orderType} · ${order.paymentMethod}</p><p class="queue-items">${order.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}</p><div class="queue-card-foot"><strong>${this.money(order.total)}</strong><div class="queue-actions">${this.orderCardActions(order)}</div></div></article>`).join('')}</div></div>`;
  }

  orderQueue() {
    const byStatus = status => this.model.orders.filter(o => o.status === status);
    const renderTickets = (list, emptyMsg) => list.length
      ? list.map(order => `<div class="status-ticket"><div class="queue-card-top"><strong>${order.id} · ${this.money(order.total)}</strong><span class="source-pill ${order.source === 'qr' ? 'source-qr' : ''}">${order.source === 'qr' ? 'QR' : 'POS'}</span></div><span>${order.customerName || 'Walk-in'}${order.tableNote ? ' · ' + order.tableNote : ''} · ${order.orderType} · ${order.paymentMethod}</span><p class="queue-items">${order.items.map(i => `${i.quantity}× ${i.name}`).join(', ')}</p><div class="queue-actions" style="margin-top:8px;">${this.orderCardActions(order)}</div></div>`).join('')
      : `<p class="queue-empty-col">${emptyMsg}</p>`;

    const completed = byStatus('completed').slice(0, 10);
    return `<div class="inventory-tools"><div><h2>Order Approval &amp; Queue</h2><p>Approve orders into Queue, move to Preparing, then mark Completed</p></div><div class="module-actions"><button class="secondary-action" type="button" data-action="show-qr">Customer QR Code</button></div></div><div id="orderQueueBoard" class="status-list"><section class="status-column"><h3>Pending Approval (${byStatus('pending').length})</h3>${renderTickets(byStatus('pending'), 'No orders awaiting approval.')}</section><section class="status-column"><h3>Queue (${byStatus('queue').length})</h3>${renderTickets(byStatus('queue'), 'No orders in queue.')}</section><section class="status-column"><h3>Preparing (${byStatus('preparing').length})</h3>${renderTickets(byStatus('preparing'), 'No orders preparing.')}</section></div><div class="data-card"><div class="data-head"><h2>Recently Completed (${completed.length})</h2></div><div class="table-wrap"><table><thead><tr><th>Order</th><th>Source</th><th>Customer</th><th>Payment</th><th>Total</th><th>Time</th></tr></thead><tbody>${completed.map(o => `<tr><td><strong>${o.id}</strong></td><td>${o.source === 'qr' ? 'QR' : 'POS'}</td><td>${o.customerName || 'Walk-in'}</td><td>${o.paymentMethod}</td><td><strong>${this.money(o.total)}</strong></td><td>${new Date(o.time).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}</td></tr>`).join('') || '<tr><td colspan="6">No completed orders yet.</td></tr>'}</tbody></table></div></div>`;
  }

  ordering() {
    return `<div class="ordering-layout"><section class="catalog-panel"><div class="kiosk-hero"><p>Voodoo eSports Café</p><h2>Fuel your game</h2><p>Fresh drinks, bold flavors, fast service</p></div><div class="catalog-toolbar"><label class="search"><span>⌕</span><input type="search" data-action="menu-search" placeholder="Search menu"></label></div><div id="orderingGrid">${this.productGrid()}</div></section><aside class="kiosk-cart"><div class="order-heading"><div><p>Your order</p><h2>Cart</h2></div></div><div id="kioskCart" class="cart-items"></div><div class="order-total"><div class="grand-total"><span>Total</span><strong id="kioskTotal">₱0.00</strong></div><button class="charge-button" type="button" data-action="checkout"><span>Place order</span><strong>→</strong></button></div></aside></div>`;
  }

  inventory() {
    const rows = this.model.products.map(product => {
      const status = product.stock === 0 ? 'Out of stock' : product.stock <= 5 ? 'Low stock' : 'In stock';
      const statusClass = status === 'Out of stock' ? 'stock-out' : status === 'Low stock' ? 'stock-low' : '';
      return `<tr><td><strong>${product.name}</strong></td><td>${product.category}</td><td>${product.stock} cups</td><td>${this.money(product.price)}</td><td><span class="${statusClass}">${status}</span></td><td><button class="row-action" type="button" data-action="manage" data-id="${product.id}">Manage</button></td></tr>`;
    }).join('');
    return `<div class="inventory-tools"><label class="search"><span>⌕</span><input type="search" data-action="inventory-search" placeholder="Search product inventory"></label><div class="module-actions"><button class="secondary-action" type="button" data-action="import">Import</button><button class="primary-action" type="button" data-action="manage">＋ Add Product</button></div></div><div class="data-card"><div class="data-head"><h2>Product inventory</h2><button class="secondary-action" type="button" data-action="export">Export</button></div><div class="table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Available</th><th>Selling price</th><th>Status</th><th>Action</th></tr></thead><tbody id="inventoryRows">${rows}</tbody></table></div></div>`;
  }

  restock() {
    if (this.model.account.role === 'admin') {
      const pending = this.model.restockRequests.filter(request => request.status === 'Pending').length;
      const rows = this.model.restockRequests.map(request => `<tr><td><strong>${request.id}</strong></td><td>${request.productName}</td><td>${request.quantity} cups</td><td>${request.requestedBy}</td><td><span class="status ${request.status === 'Approved' ? 'done' : 'pending'}">${request.status}</span></td><td>${request.status === 'Pending' ? `<button class="row-action" type="button" data-action="approve-request" data-id="${request.id}">Approve</button> <button class="row-action" type="button" data-action="reject-request" data-id="${request.id}">Reject</button>` : '—'}</td></tr>`).join('');
      return `<div class="inventory-tools"><div><h2>Restock Requests</h2><p>${pending} request(s) awaiting approval</p></div></div><div class="data-card"><div class="table-wrap"><table><thead><tr><th>Request</th><th>Product</th><th>Quantity</th><th>Requested by</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows || '<tr><td colspan="6">No restock requests.</td></tr>'}</tbody></table></div></div>`;
    }
    const history = this.model.restockRequests.filter(request => request.requestedBy === this.model.account.name).map(request => `<p><strong>${request.productName}</strong> · ${request.quantity} cups · <span class="status ${request.status === 'Approved' ? 'done' : 'pending'}">${request.status}</span></p>`).join('');
    return `<div class="restock-grid"><section class="form-card"><h2>Request restock</h2><form id="restockForm" class="form-grid"><label>Product<select id="restockProduct">${this.model.products.map(product => `<option value="${product.id}">${product.name}</option>`).join('')}</select></label><label>Quantity (cups)<input id="restockQuantity" type="number" value="10" min="1"></label><button class="primary-action" type="submit">Submit Request</button></form></section><section class="form-card"><h2>My requests</h2>${history || '<p>No restock requests submitted.</p>'}</section></div>`;
  }

  accounts() {
    return `<div class="restock-grid"><section class="form-card"><h2>Add Staff Account</h2><form id="createAccountForm" class="form-grid"><label>Full Name<input id="newFullName" required placeholder="e.g. Maria Santos"></label><label>Role<select id="newRole"><option value="barista">Barista</option><option value="admin">Admin</option></select></label><label>Username<input id="newUsername" required placeholder="e.g. barista2"></label><label>Password<input id="newPassword" type="password" required placeholder="Enter password"></label><button class="primary-action" type="submit">Create Account</button></form></section><section class="form-card"><h2>Staff Accounts</h2><div class="table-wrap"><table><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody id="accountsTableBody"><tr><td colspan="5">Loading accounts...</td></tr></tbody></table></div></section></div>`;
  }

  shiftOrders() {
    const orders = this.model.getCurrentShiftOrders();
    const rows = orders.map(order => `<tr><td><strong>${order.id}</strong></td><td>${order.account}</td><td>${order.paymentMethod}</td><td>${order.items.reduce((sum,item)=>sum+item.quantity,0)} items</td><td><strong>${this.money(order.total)}</strong></td><td>${new Date(order.time).toLocaleTimeString('en-PH',{hour:'numeric',minute:'2-digit'})}</td><td><button class="row-action" type="button" data-action="view-order" data-id="${order.id}">View</button></td></tr>`).join('');
    return `<div class="inventory-tools"><div><h2>Shift Order Log</h2><p>${orders.length} completed order(s)</p></div></div><div class="data-card"><div class="table-wrap"><table><thead><tr><th>Order</th><th>Cashier</th><th>Payment</th><th>Items</th><th>Total</th><th>Time</th><th>Action</th></tr></thead><tbody>${rows || '<tr><td colspan="7">No completed orders in this shift.</td></tr>'}</tbody></table></div></div><div class="inventory-tools" style="margin-top:20px;"><div><h2>Saved Shift Sales</h2><p>Automatically recorded when a barista logs out</p></div></div><div class="data-card"><div class="table-wrap"><table><thead><tr><th>Shift</th><th>Account</th><th>Orders</th><th>Items</th><th>Cash</th><th>GCash</th><th>Total Sales</th><th>Logged Out</th></tr></thead><tbody id="savedShiftSalesBody"><tr><td colspan="8">Loading saved records...</td></tr></tbody></table></div></div>`;
  }

  formatShiftPeriod(startValue, endValue) {
    const parse = value => (value instanceof Date ? value : new Date(String(value).replace(' ', 'T')));
    const start = parse(startValue);
    const end = parse(endValue || new Date());
    const period = date => (date.getHours() >= 12 ? 'PM' : 'AM');
    const formatTime = date => date.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true });
    const startPeriod = period(start);
    const endPeriod = period(end);
    const label = startPeriod === endPeriod ? `${startPeriod} Shift` : `${startPeriod} – ${endPeriod} Shift`;
    return { label, range: `${formatTime(start)} – ${formatTime(end)}` };
  }

  shiftSummary() {
    const orders = this.model.getCurrentShiftOrders();
    const total = orders.reduce((sum,order)=>sum+order.total,0), items = orders.reduce((sum,order)=>sum+order.items.reduce((count,item)=>count+item.quantity,0),0);
    const paymentTotals = orders.reduce((totals,order)=>{totals[order.paymentMethod]=(totals[order.paymentMethod]||0)+order.total;return totals;},{});
    const paymentRows = Object.entries(paymentTotals).map(([method,amount])=>`<tr><td>${method}</td><td><strong>${this.money(amount)}</strong></td></tr>`).join('') || '<tr><td colspan="2">No payments recorded</td></tr>';
    const now = new Date();
    const shift = this.formatShiftPeriod(this.model.shiftStartedAt, now);
    const saveBadge = this.model.account?.role === 'barista'
      ? '<p style="margin-top:8px;"><span id="shiftSaveStatus" class="status pending">Saving shift sales record...</span></p>'
      : '';
    return `<div class="shift-summary"><div class="shift-summary-header"><span>VOODOO ESPORTS CAFÉ</span><h2>Shift Sales Summary</h2><p><strong>${shift.label}</strong> (${shift.range})</p><p>${new Date(this.model.shiftStartedAt).toLocaleDateString('en-PH')} · User: ${this.model.account.name}</p>${saveBadge}</div><div class="shift-summary-stats"><div><span>Orders</span><strong>${orders.length}</strong></div><div><span>Items sold</span><strong>${items}</strong></div><div><span>Net sales</span><strong>${this.money(total)}</strong></div></div><table class="summary-table"><thead><tr><th>Payment method</th><th>Amount</th></tr></thead><tbody>${paymentRows}</tbody></table><div class="shift-summary-total"><span>Total sales</span><strong>${this.money(total)}</strong></div><div class="summary-actions"><button class="secondary-action" type="button" data-action="close-summary">Close</button><button class="primary-action" type="button" data-action="download-summary">Download PDF</button></div></div>`;
  }

  alerts() {
    const low = this.model.products.filter(product => product.stock <= 5);
    if (!low.length) return '<div class="alert-grid"><article class="alert-card warning"><strong>All good</strong><p>No products are low on stock.</p></article></div>';
    return `<div class="alert-grid">${low.map(product => `<article class="alert-card ${product.stock ? 'warning' : ''}"><strong>${product.name} — ${product.stock ? product.stock + ' cups remaining' : 'Out of stock'}</strong><p>${product.stock ? 'Below minimum stock level.' : 'Immediate restock required.'}</p><button class="secondary-action" type="button" data-action="restock" data-id="${product.id}">Restock</button></article>`).join('')}</div>`;
  }

  backup() {
    let last = 'Never';
    try { const saved = localStorage.getItem('voodooLastBackup'); if (saved) last = new Date(saved).toLocaleString(); } catch (error) { /* ignore */ }
    return `<div class="inventory-header"><div class="inventory-stats"><article><span>Last backup</span><strong>${last}</strong></article><article><span>Products</span><strong>${this.model.products.length} items</strong></article><article><span>Orders saved</span><strong>${this.model.orders.length}</strong></article></div><button class="primary-action" type="button" data-action="backup">↓ Create Backup</button></div>`;
  }

  renderCart() {
    const totals = this.model.totals();
    const html = this.model.cart.length ? this.model.cart.map(item => `<div class="cart-item"><img src="${item.image}" alt=""><div><h4>${item.name}</h4><small>${this.money(item.price)}</small></div><div class="quantity"><button type="button" data-action="minus" data-id="${item.id}">−</button><span>${item.quantity}</span><button type="button" data-action="plus" data-id="${item.id}">＋</button></div></div>`).join('') : '<div class="empty-cart">Your cart is empty.</div>';
    ['cartItems','kioskCart'].forEach(id => { const element = document.getElementById(id); if (element) element.innerHTML = html; });
    [['subtotal',totals.subtotal],['grandTotal',totals.total],['chargeTotal',totals.total],['kioskTotal',totals.total]].forEach(([id,value]) => { const element = document.getElementById(id); if (element) element.textContent = this.money(value); });
  }

  qrModal(qrInfo) {
    const url = typeof qrInfo === 'string' ? qrInfo : qrInfo.orderingUrl;
    const adapter = typeof qrInfo === 'string' ? 'Current Network' : `${qrInfo.networkAdapter} (${qrInfo.detectedIp})`;
    const networks = Array.isArray(qrInfo?.availableNetworks) ? qrInfo.availableNetworks : [];
    const selector = networks.length > 1
      ? `<label class="modal-field">Connected Network<select id="qrNetworkSelect">${networks.map(n => `<option value="${n.url}" ${n.url === url ? 'selected' : ''}>${n.adapter} (${n.ip})</option>`).join('')}</select></label>`
      : '';
    return `<div class="qr-modal-box"><p>Customers can scan this QR code on their phone to open the <strong>Customer Ordering</strong> page. Orders will automatically appear in your POS for approval.</p><p class="qr-network-badge"><span id="qrNetworkLabel" class="status done">Network: ${adapter}</span></p>${selector}<div id="qrCodeCanvas" class="qr-code-canvas"></div><label class="modal-field">Customer Ordering URL<input id="qrUrlInput" type="text" value="${url}"></label><div class="summary-actions"><button class="secondary-action" type="button" data-action="refresh-qr">Refresh Network</button><button class="secondary-action" type="button" data-action="copy-qr">Copy Link</button><a class="primary-action qr-open-link" href="${url}" target="_blank" rel="noopener">Open Page</a></div></div>`;
  }

  modal(title, body, variant = '') {
    if (title === 'Complete Order') {
      title = 'Confirm Payment';
      variant = 'payment-confirmation';
    }

    const modal = document.getElementById('actionModal');
    modal.innerHTML = `<div class="modal-backdrop"><div class="modal-card ${variant}"><div class="data-head"><h2>${title}</h2><button class="row-action" type="button" data-action="close">×</button></div><div class="modal-body">${body}</div></div></div>`;
    modal.classList.add('open');
  }

  closeModal() { const modal = document.getElementById('actionModal'); modal.classList.remove('open'); modal.innerHTML = ''; }
}