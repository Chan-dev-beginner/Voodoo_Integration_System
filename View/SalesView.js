Object.assign(AppView.prototype, {
  shiftOrders() {
    const orders = this.model.getCurrentShiftOrders();
    const rows = orders.map(order => `<tr><td><strong>${order.id}</strong></td><td>${order.account}</td><td>${order.paymentMethod}</td><td>${order.items.reduce((sum,item)=>sum+item.quantity,0)} items</td><td><strong>${this.money(order.total)}</strong></td><td>${new Date(order.time).toLocaleTimeString('en-PH',{hour:'numeric',minute:'2-digit'})}</td><td><button class="row-action" type="button" data-action="view-order" data-id="${order.id}">View</button></td></tr>`).join('');
    return `<div class="inventory-tools"><div><h2>Shift Order Log</h2><p>${orders.length} completed order(s)</p></div></div><div class="data-card"><div class="table-wrap"><table><thead><tr><th>Order</th><th>Cashier</th><th>Payment</th><th>Items</th><th>Total</th><th>Time</th><th>Action</th></tr></thead><tbody>${rows || '<tr><td colspan="7">No completed orders in this shift.</td></tr>'}</tbody></table></div></div><div class="inventory-tools" style="margin-top:20px;"><div><h2>Saved Shift Sales</h2><p>Automatically recorded when a barista times out</p></div></div><div class="data-card"><div class="table-wrap"><table><thead><tr><th>Shift</th><th>Account</th><th>Orders</th><th>Items</th><th>Cash</th><th>GCash</th><th>Total Sales</th><th>Logged Out</th><th>Action</th></tr></thead><tbody id="savedShiftSalesBody"><tr><td colspan="9">Loading saved records...</td></tr></tbody></table></div></div>`;
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
    return `<div class="shift-summary"><div class="shift-summary-header"><span>VOODOO ESPORTS CAFÉ</span><h2>Shift Sales Summary</h2><p><strong>${shift.label}</strong> (${shift.range})</p><p>${startDate} · User: ${record.account_name || 'Barista'}</p><p>Timed out: ${loggedOut}</p></div><div class="shift-summary-stats"><div><span>Orders</span><strong>${Number(record.total_orders || 0)}</strong></div><div><span>Items sold</span><strong>${Number(record.total_items || 0)}</strong></div><div><span>Net sales</span><strong>${this.money(record.total_sales || 0)}</strong></div></div><table class="summary-table"><thead><tr><th>Payment method</th><th>Amount</th></tr></thead><tbody>${paymentRows}</tbody></table><div class="shift-summary-total"><span>Total sales</span><strong>${this.money(record.total_sales || 0)}</strong></div></div>`;
  },

  shiftSummary() {
    const orders = this.model.getCurrentShiftOrders();
    const total = orders.reduce((sum,order)=>sum+order.total,0), items = orders.reduce((sum,order)=>sum+order.items.reduce((count,item)=>count+item.quantity,0),0);
    const paymentTotals = orders.reduce((totals,order)=>{totals[order.paymentMethod]=(totals[order.paymentMethod]||0)+order.total;return totals;},{});
    const paymentRows = Object.entries(paymentTotals).map(([method,amount])=>`<tr><td>${method}</td><td><strong>${this.money(amount)}</strong></td></tr>`).join('') || '<tr><td colspan="2">No payments recorded</td></tr>';
    const now = new Date();
    const shift = this.formatShiftPeriod(this.model.shiftStartedAt, now);
    const timeOutBtn = this.model.account?.role === 'barista'
      ? '<button class="primary-action" type="button" data-action="time-out">Time Out &amp; Transfer</button>'
      : '';
    return `<div class="shift-summary"><div class="shift-summary-header"><span>VOODOO ESPORTS CAFÉ</span><h2>Shift Sales Summary</h2><p><strong>${shift.label}</strong> (${shift.range})</p><p>${new Date(this.model.shiftStartedAt).toLocaleDateString('en-PH')} · User: ${this.model.account.name}</p></div><div class="shift-summary-stats"><div><span>Orders</span><strong>${orders.length}</strong></div><div><span>Items sold</span><strong>${items}</strong></div><div><span>Net sales</span><strong>${this.money(total)}</strong></div></div><table class="summary-table"><thead><tr><th>Payment method</th><th>Amount</th></tr></thead><tbody>${paymentRows}</tbody></table><div class="shift-summary-total"><span>Total sales</span><strong>${this.money(total)}</strong></div><div class="summary-actions"><button class="secondary-action" type="button" data-action="close-summary">Sign Out</button><button class="secondary-action" type="button" data-action="download-summary">Download PDF</button>${timeOutBtn}</div></div>`;
  }
});
