Object.assign(AppView.prototype, {
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
  },

  paymentSummaryLine(order) {
    if (String(order.paymentMethod || '').toLowerCase() !== 'cash' || order.amountPaid === undefined) return '';
    return `<p class="queue-meta" style="color:var(--ink);font-weight:600;">Paid: ${this.money(order.amountPaid)} · Change: ${this.money(order.changeAmount || 0)}</p>`;
  },

  posQueueStrip() {
    const active = this.model.getActiveOrders();
    if (!active.length) {
      return `<div class="queue-strip-empty"><span>Live Queue: No pending or active orders.</span><button class="row-action" type="button" data-action="show-qr">Show QR Code</button></div>`;
    }
    const statusText = { pending: 'Pending Approval', queue: 'Queue', preparing: 'Preparing' };
    return `<div class="queue-strip"><div class="queue-strip-head"><strong>Live Order Queue (${active.length})</strong><small>Approve incoming QR &amp; POS orders to queue</small></div><div class="queue-cards">${active.map(order => `<article class="queue-card status-${order.status}"><div class="queue-card-top"><div><strong>${order.id}</strong> <span class="source-pill ${order.source === 'qr' ? 'source-qr' : ''}">${order.source === 'qr' ? 'QR Order' : 'POS'}</span></div><span class="status status-${order.status}">${statusText[order.status] || order.status}</span></div><p class="queue-meta">${order.customerName || 'Walk-in'}${order.tableNote ? ' · ' + order.tableNote : ''} · ${order.orderType} · ${order.paymentMethod}</p>${this.paymentSummaryLine(order)}<p class="queue-items">${order.items.map(i => `${i.quantity}× ${i.name}${i.cupVariant ? ' (' + i.cupVariant + ')' : ''}`).join(', ')}</p><div class="queue-card-foot"><strong>${this.money(order.total)}</strong><div class="queue-actions">${this.orderCardActions(order)}</div></div></article>`).join('')}</div></div>`;
  },

  orderQueue() {
    const byStatus = status => this.model.orders.filter(o => !o.archived && o.status === status);
    const renderTickets = (list, emptyMsg) => list.length
      ? list.map(order => `<div class="status-ticket status-${order.status}"><div class="queue-card-top"><strong>${order.id} · ${this.money(order.total)}</strong><span class="source-pill ${order.source === 'qr' ? 'source-qr' : ''}">${order.source === 'qr' ? 'QR' : 'POS'}</span></div><span>${order.customerName || 'Walk-in'}${order.tableNote ? ' · ' + order.tableNote : ''} · ${order.orderType} · ${order.paymentMethod}</span>${this.paymentSummaryLine(order)}<p class="queue-items">${order.items.map(i => `${i.quantity}× ${i.name}${i.cupVariant ? ' (' + i.cupVariant + ')' : ''}`).join(', ')}</p><div class="queue-actions" style="margin-top:8px;">${this.orderCardActions(order)}</div></div>`).join('')
      : `<p class="queue-empty-col">${emptyMsg}</p>`;

    const completed = byStatus('completed')
      .sort((a, b) => (new Date(b.time).getTime() || 0) - (new Date(a.time).getTime() || 0))
      .slice(0, 10);
    const completedRows = completed.map(o => {
      const itemsSummary = (o.items || []).map(i => `${i.quantity}× ${i.name}${i.cupVariant ? ' (' + i.cupVariant + ')' : ''}`).join(', ') || '—';
      const isCash = String(o.paymentMethod || '').toLowerCase() === 'cash' && o.amountPaid !== undefined;
      const paidChange = isCash ? `${this.money(o.amountPaid)} / ${this.money(o.changeAmount || 0)}` : '—';
      const timeLabel = o.time ? new Date(o.time).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' }) : '—';
      return `<tr><td><strong>${o.id}</strong></td><td>${o.source === 'qr' ? 'QR' : 'POS'}</td><td>${o.customerName || 'Walk-in'}</td><td>${itemsSummary}</td><td>${o.paymentMethod || 'Cash'}</td><td><strong>${this.money(o.total)}</strong></td><td>${paidChange}</td><td>${timeLabel}</td><td><button class="row-action" type="button" data-action="view-order" data-id="${o.id}">View</button></td></tr>`;
    }).join('');
    return `<div class="inventory-tools"><div><h2>Order Approval &amp; Queue</h2><p>Approve orders into Queue, move to Preparing, then mark Completed</p></div><div class="module-actions"><button class="secondary-action" type="button" data-action="show-qr">Customer QR Code</button></div></div><div id="orderQueueBoard" class="status-list"><section class="status-column col-pending"><h3>Pending Approval (${byStatus('pending').length})</h3>${renderTickets(byStatus('pending'), 'No orders awaiting approval.')}</section><section class="status-column col-queue"><h3>Queue (${byStatus('queue').length})</h3>${renderTickets(byStatus('queue'), 'No orders in queue.')}</section><section class="status-column col-preparing"><h3>Preparing (${byStatus('preparing').length})</h3>${renderTickets(byStatus('preparing'), 'No orders preparing.')}</section></div><div class="data-card"><div class="data-head"><h2>Recently Completed (${completed.length})</h2></div><div class="table-wrap"><table><thead><tr><th>Order</th><th>Source</th><th>Customer</th><th>Items</th><th>Payment</th><th>Total</th><th>Paid / Change</th><th>Time</th><th>Action</th></tr></thead><tbody>${completedRows || '<tr><td colspan="9">No completed orders yet.</td></tr>'}</tbody></table></div></div>`;
  }
});
