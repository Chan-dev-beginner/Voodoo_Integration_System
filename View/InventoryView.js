Object.assign(AppView.prototype, {
  inventory() {
    const isAdmin = this.model.account?.role === 'admin';
    const cupRows = (this.model.cupVariants || []).map(cup => {
      const min = Number(cup.minStock || 10);
      const status = cup.stock <= 0 ? 'Out of stock' : cup.stock <= min ? 'Low stock' : 'In stock';
      const statusClass = cup.stock <= 0 ? 'stock-out' : cup.stock <= min ? 'stock-low' : 'status done';
      const actionCell = isAdmin ? `<td><button class="row-action" type="button" data-action="manage-cup" data-id="${cup.key}">Manage</button></td>` : '';
      return `<tr><td><strong>${cup.name}</strong></td><td>${cup.usedFor || '—'}</td><td><strong>${cup.stock} cups</strong></td><td><span class="${statusClass}">${status}</span></td>${actionCell}</tr>`;
    }).join('');
    const rows = this.model.products.map(product => {
      const cupLabel = this.model.getCupLabel(product.cupVariant);
      const cupStock = this.model.getCupStock(product.cupVariant);
      const status = cupStock <= 0 ? 'Out of stock' : cupStock <= 10 ? 'Low stock' : 'In stock';
      const statusClass = cupStock <= 0 ? 'stock-out' : cupStock <= 10 ? 'stock-low' : '';
      const actionCell = isAdmin ? `<td><button class="row-action" type="button" data-action="manage" data-id="${product.id}">Manage</button></td>` : '';
      return `<tr><td><strong>${product.name}</strong></td><td>${product.category}</td><td>${cupLabel} (${cupStock} cups)</td><td>${this.money(product.price)}</td><td><span class="${statusClass}">${status}</span></td>${actionCell}</tr>`;
    }).join('');
    const topBar = isAdmin
      ? `<div class="inventory-tools"><label class="search"><span>⌕</span><input type="search" data-action="inventory-search" placeholder="Search product or cup variant"></label><div class="module-actions"><button class="secondary-action" type="button" data-action="import">Import</button><button class="primary-action" type="button" data-action="manage">＋ Add Product</button></div></div>`
      : `<div class="inventory-tools"><div><h2>Cup Variants Inventory</h2><p>Live available cup counts</p></div><div class="module-actions"><button class="primary-action" type="button" data-action="restock">Request Restock</button></div></div>`;
    const exportBtn = isAdmin ? `<button class="secondary-action" type="button" data-action="export">Export</button>` : '';
    const cupActionHead = isAdmin ? '<th>Action</th>' : '';
    const cupCard = `<div class="data-card" style="margin-bottom:20px;">${isAdmin ? `<div class="data-head"><h2>Cup Variants Inventory</h2>${exportBtn}</div>` : ''}<div class="table-wrap"><table><thead><tr><th>Cup Variant</th><th>Used For</th><th>Available</th><th>Status</th>${cupActionHead}</tr></thead><tbody>${cupRows}</tbody></table></div></div>`;
    const productsCard = isAdmin
      ? `<div class="data-card"><div class="data-head"><h2>Menu Products (Linked to Cup Variants)</h2></div><div class="table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Cup Variant</th><th>Selling price</th><th>Status</th>${cupActionHead}</tr></thead><tbody id="inventoryRows">${rows}</tbody></table></div></div>`
      : '';
    return topBar + cupCard + productsCard;
  },

  alerts() {
    const low = (this.model.cupVariants || []).filter(cup => cup.stock <= (cup.minStock || 10));
    if (!low.length) return '<div class="alert-grid"><article class="alert-card warning"><strong>All good</strong><p>All cup variants (16oz Cup, 22oz Cup, Hot Cup) have sufficient stock.</p></article></div>';
    return `<div class="alert-grid">${low.map(cup => `<article class="alert-card ${cup.stock ? 'warning' : ''}"><strong>${cup.name} — ${cup.stock ? cup.stock + ' cups remaining' : 'Out of stock'}</strong><p>Used for: ${cup.usedFor}. ${cup.stock ? 'Below minimum stock level.' : 'Immediate restock required.'}</p><button class="secondary-action" type="button" data-action="restock" data-id="${cup.key}">Restock</button></article>`).join('')}</div>`;
  },

  restock() {
    if (this.model.account.role === 'admin') {
      const pending = this.model.restockRequests.filter(request => request.status === 'Pending').length;
      const rows = this.model.restockRequests.map(request => `<tr><td><strong>${request.id}</strong></td><td>${request.productName}</td><td>${request.quantity} cups</td><td>${request.requestedBy}</td><td><span class="status ${request.status === 'Approved' ? 'done' : 'pending'}">${request.status}</span></td><td>${request.status === 'Pending' ? `<button class="row-action" type="button" data-action="approve-request" data-id="${request.id}">Approve</button> <button class="row-action" type="button" data-action="reject-request" data-id="${request.id}">Reject</button>` : '—'}</td></tr>`).join('');
      return `<div class="inventory-tools"><div><h2>Cup Restock Requests</h2><p>${pending} request(s) awaiting approval</p></div></div><div class="data-card"><div class="table-wrap"><table><thead><tr><th>Request</th><th>Cup Variant</th><th>Quantity</th><th>Requested by</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows || '<tr><td colspan="6">No restock requests.</td></tr>'}</tbody></table></div></div>`;
    }
    const history = this.model.restockRequests.filter(request => request.requestedBy === this.model.account.name).map(request => `<p><strong>${request.productName}</strong> · ${request.quantity} cups · <span class="status ${request.status === 'Approved' ? 'done' : 'pending'}">${request.status}</span></p>`).join('');
    const availabilityRows = (this.model.cupVariants || []).map(cup => {
      const min = Number(cup.minStock || 10);
      const status = cup.stock <= 0 ? 'Out of stock' : cup.stock <= min ? 'Low stock' : 'In stock';
      const statusClass = cup.stock <= 0 ? 'stock-out' : cup.stock <= min ? 'stock-low' : 'status done';
      return `<tr><td><strong>${cup.name}</strong></td><td>${cup.usedFor}</td><td>${cup.stock} cups</td><td><span class="${statusClass}">${status}</span></td></tr>`;
    }).join('');
    const cupOptions = (this.model.cupVariants || []).map(cup => {
      const min = Number(cup.minStock || 10);
      const status = cup.stock <= 0 ? 'Out of stock' : cup.stock <= min ? 'Low stock' : 'In stock';
      return `<option value="${cup.key}">${cup.name} (${cup.stock} cups — ${status})</option>`;
    }).join('');
    return `<div class="restock-grid"><section class="form-card"><h2>Request cup restock</h2><form id="restockForm" class="form-grid"><label>Cup Variant<select id="restockProduct">${cupOptions}</select></label><label>Quantity (cups)<input id="restockQuantity" type="number" value="20" min="1"></label><button class="primary-action" type="submit">Submit Request</button></form></section><section class="form-card"><h2>My requests</h2>${history || '<p>No restock requests submitted.</p>'}</section></div><div class="data-card"><div class="data-head"><h2>Cup Variants Availability</h2></div><div class="table-wrap"><table><thead><tr><th>Cup Variant</th><th>Used For</th><th>Available Quantity</th><th>Status</th></tr></thead><tbody>${availabilityRows}</tbody></table></div></div>`;
  },

  backup() {
    let last = 'Never';
    try { const saved = localStorage.getItem('voodooLastBackup'); if (saved) last = new Date(saved).toLocaleString(); } catch (error) { /* ignore */ }
    return `<div class="inventory-header"><div class="inventory-stats"><article><span>Last backup</span><strong>${last}</strong></article><article><span>Products</span><strong>${this.model.products.length} items</strong></article><article><span>Orders saved</span><strong>${this.model.orders.length}</strong></article></div><button class="primary-action" type="button" data-action="backup">↓ Create Backup</button></div>`;
  }
});
