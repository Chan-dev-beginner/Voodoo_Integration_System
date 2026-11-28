Object.assign(AppView.prototype, {
  shiftOrders() {
    const isAdmin = this.model.account?.role === 'admin';
    const orders = this.model.getCurrentShiftOrders();
    const rows = orders.map(order => `<tr><td><strong>${order.id}</strong></td><td>${order.account}</td><td>${order.paymentMethod}</td><td>${order.items.reduce((sum,item)=>sum+item.quantity,0)} items</td><td><strong>${this.money(order.total)}</strong></td><td>${new Date(order.time).toLocaleTimeString('en-PH',{hour:'numeric',minute:'2-digit'})}</td><td><button class="row-action" type="button" data-action="view-order" data-id="${order.id}">View</button></td></tr>`).join('');
    const shiftFilterBar = `
      <div class="inventory-tools" style="flex-wrap:wrap;gap:12px;">
        <div>
          <h2>${isAdmin ? 'Shift Log' : 'Saved Shift Sales'}</h2>
          <p id="shiftFilterSummary">Automatically recorded when a barista times out</p>
        </div>
        <div class="module-actions" style="flex-wrap:wrap;align-items:center;">
          <select id="shiftPeriodFilter" class="row-action" aria-label="Filter by period">
            <option value="all">All Shifts</option>
            <option value="week">This Week</option>
            <option value="month">This Month</option>
          </select>
          <input id="shiftWeekFilter" type="week" class="row-action" title="Filter by specific week" aria-label="Filter by week">
          <input id="shiftMonthFilter" type="month" class="row-action" title="Filter by specific month" aria-label="Filter by month">
          <select id="shiftSortSelect" class="row-action" aria-label="Sort shifts">
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="week-desc">By Week (Newest)</option>
            <option value="month-desc">By Month (Newest)</option>
            <option value="sales-desc">Highest Sales</option>
            <option value="sales-asc">Lowest Sales</option>
          </select>
        </div>
      </div>`;
    const savedShiftsSection = `${shiftFilterBar}<div class="data-card"><div class="table-wrap"><table><thead><tr><th>Shift</th><th>Account</th><th>Orders</th><th>Items</th><th>Cash</th><th>GCash</th><th>Total Sales</th><th>Logged Out</th><th>Action</th></tr></thead><tbody id="savedShiftSalesBody"><tr><td colspan="9">Loading saved records...</td></tr></tbody></table></div></div>`;
    const currentOrdersSection = `<div class="inventory-tools" style="${isAdmin ? 'margin-top:20px;' : ''}"><div><h2>${isAdmin ? 'Current Shift Orders' : 'Shift Order Log'}</h2><p>${orders.length} completed order(s)</p></div></div><div class="data-card"><div class="table-wrap"><table><thead><tr><th>Order</th><th>Cashier</th><th>Payment</th><th>Items</th><th>Total</th><th>Time</th><th>Action</th></tr></thead><tbody>${rows || '<tr><td colspan="7">No completed orders in this shift.</td></tr>'}</tbody></table></div></div>`;
    return isAdmin ? (savedShiftsSection + currentOrdersSection) : (currentOrdersSection + savedShiftsSection);
  },

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
  },

  cupSummaryTableHtml(cupSummary) {
    const list = Array.isArray(cupSummary) && cupSummary.length
      ? cupSummary
      : (this.model.getShiftCupSummary ? this.model.getShiftCupSummary() : []);
    if (!list.length) return '';
    const rows = list.map(c => `<tr><td>${c.name}</td><td><strong>${Number(c.used || 0)} used</strong></td><td><strong>${Number(c.remaining || 0)} left</strong></td></tr>`).join('');
    return `<table class="summary-table" style="margin-top:12px;"><thead><tr><th>Cup Variant</th><th>Used</th><th>Remaining</th></tr></thead><tbody>${rows}</tbody></table>`;
  },

  shiftOrdersTableHtml(orders) {
    const list = Array.isArray(orders) ? orders : [];
    const rows = list.map(o => {
      const itemsText = (o.items || []).map(i => `${i.quantity}× ${i.name}${i.cupVariant ? ' (' + i.cupVariant + ')' : ''}`).join(', ') || '—';
      const isCash = String(o.paymentMethod || '').toLowerCase() === 'cash' && o.amountPaid !== undefined;
      const payText = isCash
        ? `${o.paymentMethod} (Paid ${this.money(o.amountPaid)} · Chg ${this.money(o.changeAmount || 0)})`
        : (o.paymentMethod || 'Cash');
      const timeText = o.time ? new Date(o.time).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true }) : '—';
      return `<tr><td><strong>${o.id}</strong><br><small style="color:var(--muted)">${timeText}</small></td><td>${o.customerName || 'Walk-in'}</td><td>${itemsText}</td><td>${payText}</td><td><strong>${this.money(o.total || 0)}</strong></td></tr>`;
    }).join('');
    return `<h3 style="margin:14px 0 6px;font-size:13px;">Transactions &amp; Product Orders (${list.length})</h3><table class="summary-table"><thead><tr><th>Order</th><th>Customer</th><th>Product Orders</th><th>Payment</th><th>Total</th></tr></thead><tbody>${rows || '<tr><td colspan="5">No transactions recorded in this shift.</td></tr>'}</tbody></table>`;
  },

  shiftRecordSummaryHtml(record) {
    const shift = this.formatShiftPeriod(record.shift_started_at, record.logged_out_at);
    const startDate = new Date(String(record.shift_started_at).replace(' ', 'T')).toLocaleDateString('en-PH');
    const loggedOut = new Date(String(record.logged_out_at).replace(' ', 'T')).toLocaleString('en-PH', { hour12: true });
    const payments = [
      ['Cash', Number(record.cash_total || 0)],
      ['GCash', Number(record.gcash_total || 0)],
      ['Other', Number(record.other_total || 0)]
    ].filter(([, amount], idx) => amount > 0 || idx < 2);
    const paymentRows = payments
      .map(([method, amount]) => `<tr><td>${method}</td><td><strong>${this.money(amount)}</strong></td></tr>`)
      .join('');
    const startMs = new Date(String(record.shift_started_at).replace(' ', 'T')).getTime() || 0;
    const endMs = new Date(String(record.logged_out_at).replace(' ', 'T')).getTime() || Date.now();
    const ordersList = Array.isArray(record.orders)
      ? record.orders
      : (this.model.orders || []).filter(o => {
          const t = new Date(o.time).getTime() || 0;
          return (!o.status || o.status === 'completed') && t >= startMs && t <= endMs;
        });
    const cupSummary = Array.isArray(record.cup_summary) && record.cup_summary.length
      ? record.cup_summary
      : (this.model.getShiftCupSummary ? this.model.getShiftCupSummary(ordersList) : []);
    const cupTable = this.cupSummaryTableHtml(cupSummary);
    const ordersTable = this.shiftOrdersTableHtml(ordersList);
    return `<div class="shift-summary"><div class="shift-summary-header"><span>VOODOO ESPORTS CAFÉ</span><h2>Shift Sales Summary</h2><p><strong>${shift.label}</strong> (${shift.range})</p><p>${startDate} · User: ${record.account_name || 'Barista'}</p><p>Timed out: ${loggedOut}</p></div><div class="shift-summary-stats"><div><span>Orders</span><strong>${Number(record.total_orders || 0)}</strong></div><div><span>Items sold</span><strong>${Number(record.total_items || 0)}</strong></div><div><span>Net sales</span><strong>${this.money(record.total_sales || 0)}</strong></div></div><table class="summary-table"><thead><tr><th>Payment method</th><th>Amount</th></tr></thead><tbody>${paymentRows}</tbody></table>${cupTable}${ordersTable}<div class="shift-summary-total"><span>Total sales</span><strong>${this.money(record.total_sales || 0)}</strong></div></div>`;
  },

  shiftSummary() {
    const orders = this.model.getCurrentShiftOrders();
    const total = orders.reduce((sum,order)=>sum+order.total,0), items = orders.reduce((sum,order)=>sum+order.items.reduce((count,item)=>count+item.quantity,0),0);
    const paymentTotals = orders.reduce((totals,order)=>{totals[order.paymentMethod]=(totals[order.paymentMethod]||0)+order.total;return totals;},{});
    const paymentRows = Object.entries(paymentTotals).map(([method,amount])=>`<tr><td>${method}</td><td><strong>${this.money(amount)}</strong></td></tr>`).join('') || '<tr><td colspan="2">No payments recorded</td></tr>';
    const cupSummary = this.model.getShiftCupSummary ? this.model.getShiftCupSummary(orders) : [];
    const cupTable = this.cupSummaryTableHtml(cupSummary);
    const ordersTable = this.shiftOrdersTableHtml(orders);
    const now = new Date();
    const shift = this.formatShiftPeriod(this.model.shiftStartedAt, now);
    const timeOutBtn = this.model.account?.role === 'barista'
      ? '<button class="primary-action" type="button" data-action="time-out">Time Out &amp; Transfer</button>'
      : '';
    return `<div class="shift-summary"><div class="shift-summary-header"><span>VOODOO ESPORTS CAFÉ</span><h2>Shift Sales Summary</h2><p><strong>${shift.label}</strong> (${shift.range})</p><p>${new Date(this.model.shiftStartedAt).toLocaleDateString('en-PH')} · User: ${this.model.account.name}</p></div><div class="shift-summary-stats"><div><span>Orders</span><strong>${orders.length}</strong></div><div><span>Items sold</span><strong>${items}</strong></div><div><span>Net sales</span><strong>${this.money(total)}</strong></div></div><table class="summary-table"><thead><tr><th>Payment method</th><th>Amount</th></tr></thead><tbody>${paymentRows}</tbody></table>${cupTable}${ordersTable}<div class="shift-summary-total"><span>Total sales</span><strong>${this.money(total)}</strong></div><div class="summary-actions"><button class="secondary-action" type="button" data-action="close-summary">Sign Out</button><button class="secondary-action" type="button" data-action="download-summary">Download PDF</button>${timeOutBtn}</div></div>`;
  }
});
