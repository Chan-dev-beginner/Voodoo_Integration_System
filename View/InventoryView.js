Object.assign(AppView.prototype, {
  inventory() {
    const rows = this.model.products.map(product => {
      const status = product.stock === 0 ? 'Out of stock' : product.stock <= 5 ? 'Low stock' : 'In stock';
      const statusClass = status === 'Out of stock' ? 'stock-out' : status === 'Low stock' ? 'stock-low' : '';
      return `<tr><td><strong>${product.name}</strong></td><td>${product.category}</td><td>${product.stock} cups</td><td>${this.money(product.price)}</td><td><span class="${statusClass}">${status}</span></td><td><button class="row-action" type="button" data-action="manage" data-id="${product.id}">Manage</button></td></tr>`;
    }).join('');
    return `<div class="inventory-tools"><label class="search"><span>⌕</span><input type="search" data-action="inventory-search" placeholder="Search product inventory"></label><div class="module-actions"><button class="secondary-action" type="button" data-action="import">Import</button><button class="primary-action" type="button" data-action="manage">＋ Add Product</button></div></div><div class="data-card"><div class="data-head"><h2>Product inventory</h2><button class="secondary-action" type="button" data-action="export">Export</button></div><div class="table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Available</th><th>Selling price</th><th>Status</th><th>Action</th></tr></thead><tbody id="inventoryRows">${rows}</tbody></table></div></div>`;
  },

  alerts() {
    const low = this.model.products.filter(product => product.stock <= 5);
    if (!low.length) return '<div class="alert-grid"><article class="alert-card warning"><strong>All good</strong><p>No products are low on stock.</p></article></div>';
    return `<div class="alert-grid">${low.map(product => `<article class="alert-card ${product.stock ? 'warning' : ''}"><strong>${product.name} — ${product.stock ? product.stock + ' cups remaining' : 'Out of stock'}</strong><p>${product.stock ? 'Below minimum stock level.' : 'Immediate restock required.'}</p><button class="secondary-action" type="button" data-action="restock" data-id="${product.id}">Restock</button></article>`).join('')}</div>`;
  },

  restock() {
    if (this.model.account.role === 'admin') {
      const pending = this.model.restockRequests.filter(request => request.status === 'Pending').length;
      const rows = this.model.restockRequests.map(request => `<tr><td><strong>${request.id}</strong></td><td>${request.productName}</td><td>${request.quantity} cups</td><td>${request.requestedBy}</td><td><span class="status ${request.status === 'Approved' ? 'done' : 'pending'}">${request.status}</span></td><td>${request.status === 'Pending' ? `<button class="row-action" type="button" data-action="approve-request" data-id="${request.id}">Approve</button> <button class="row-action" type="button" data-action="reject-request" data-id="${request.id}">Reject</button>` : '—'}</td></tr>`).join('');
      return `<div class="inventory-tools"><div><h2>Restock Requests</h2><p>${pending} request(s) awaiting approval</p></div></div><div class="data-card"><div class="table-wrap"><table><thead><tr><th>Request</th><th>Product</th><th>Quantity</th><th>Requested by</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows || '<tr><td colspan="6">No restock requests.</td></tr>'}</tbody></table></div></div>`;
    }
    const history = this.model.restockRequests.filter(request => request.requestedBy === this.model.account.name).map(request => `<p><strong>${request.productName}</strong> · ${request.quantity} cups · <span class="status ${request.status === 'Approved' ? 'done' : 'pending'}">${request.status}</span></p>`).join('');
    const availabilityRows = this.model.products.map(product => {
      const status = product.stock <= 0 ? 'Out of stock' : product.stock <= 5 ? 'Low stock' : 'In stock';
      const statusClass = product.stock <= 0 ? 'stock-out' : product.stock <= 5 ? 'stock-low' : 'status done';
      return `<tr><td><strong>${product.name}</strong></td><td>${product.category}</td><td>${product.stock} cups</td><td><span class="${statusClass}">${status}</span></td></tr>`;
    }).join('');
    const productOptions = this.model.products.map(product => {
      const status = product.stock <= 0 ? 'Out of stock' : product.stock <= 5 ? 'Low stock' : 'In stock';
      return `<option value="${product.id}">${product.name} (${product.stock} cups — ${status})</option>`;
    }).join('');
    return `<div class="restock-grid"><section class="form-card"><h2>Request restock</h2><form id="restockForm" class="form-grid"><label>Product<select id="restockProduct">${productOptions}</select></label><label>Quantity (cups)<input id="restockQuantity" type="number" value="10" min="1"></label><button class="primary-action" type="submit">Submit Request</button></form></section><section class="form-card"><h2>My requests</h2>${history || '<p>No restock requests submitted.</p>'}</section></div><div class="data-card"><div class="data-head"><h2>Product Availability</h2></div><div class="table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Available Quantity</th><th>Status</th></tr></thead><tbody>${availabilityRows}</tbody></table></div></div>`;
  },

  backup() {
    let last = 'Never';
    try { const saved = localStorage.getItem('voodooLastBackup'); if (saved) last = new Date(saved).toLocaleString(); } catch (error) { /* ignore */ }
    return `<div class="inventory-header"><div class="inventory-stats"><article><span>Last backup</span><strong>${last}</strong></article><article><span>Products</span><strong>${this.model.products.length} items</strong></article><article><span>Orders saved</span><strong>${this.model.orders.length}</strong></article></div><button class="primary-action" type="button" data-action="backup">↓ Create Backup</button></div>`;
  }
});
