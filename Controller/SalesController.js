Object.assign(AppController.prototype, {
  viewOrder(button) {
    const order = this.model.orders.find(i => i.id === button.dataset.id);
    if (!order) return this.view.toast('Order not found');
    const items = order.items.map(i => `<tr><td>${i.name}${i.cupVariant ? ` (${i.cupVariant})` : ''}</td><td>${i.quantity}</td><td>${this.view.money(i.price)}</td><td><strong>${this.view.money(i.total)}</strong></td></tr>`).join('');
    const paidRow = order.amountPaid !== undefined
      ? `<div class="shift-summary-total"><span>Paid (${order.paymentMethod})</span><strong>${this.view.money(order.amountPaid)}</strong></div><div class="shift-summary-total"><span>Change</span><strong>${this.view.money(order.changeAmount || 0)}</strong></div>`
      : '';
    this.view.modal(`Order ${order.id}`, `
      <div class="order-detail-meta">
        <p>Customer<br><strong>${order.customerName || 'Walk-in'}</strong></p>
        <p>Cashier<br><strong>${order.account}</strong></p>
        <p>Payment<br><strong>${order.paymentMethod}</strong></p>
        <p>Time<br><strong>${new Date(order.time).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}</strong></p>
      </div>
      <table class="summary-table"><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${items}</tbody></table>
      <div class="shift-summary-total"><span>Total</span><strong>${this.view.money(order.total)}</strong></div>
      ${paidRow}
    `);
    this.bindDynamic();
  },

  downloadSummary() {
    const element = document.querySelector('.shift-summary');
    if (!element) return;
    if (typeof html2pdf === 'undefined') {
      this.view.toast('PDF library not loaded, opening print dialog');
      return window.print();
    }
    const actions = element.querySelector('.summary-actions');
    if (actions) actions.style.display = 'none';
    html2pdf().set({
      margin: 10,
      filename: `shift-summary-${this.stamp()}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(element).save()
      .then(() => this.view.toast('PDF downloaded'))
      .catch(() => this.view.toast('Could not create PDF'))
      .finally(() => { if (actions) actions.style.display = ''; });
  },

  confirmTimeOut() {
    const orders = this.model.getCurrentShiftOrders();
    const total = orders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const cupSummary = this.model.getShiftCupSummary ? this.model.getShiftCupSummary(orders) : [];
    const cupTable = this.view.cupSummaryTableHtml ? this.view.cupSummaryTableHtml(cupSummary) : '';
    this.view.modal('Confirm Time Out', `
      <p>Are you sure you want to <strong>Time Out</strong> now?</p>
      <p style="color:var(--muted);font-size:13px;">This will save your current shift (<strong>${orders.length} order(s) · ${this.view.money(total)}</strong>) to Shift Log, archive current orders, and close Customer QR Ordering.</p>
      ${cupTable}
      <div class="summary-actions" style="margin-top:16px;">
        <button class="secondary-action" type="button" data-action="close">Cancel</button>
        <button class="primary-action" type="button" data-action="confirm-time-out">Yes, Time Out</button>
      </div>
    `);
    this.bindDynamic();
  },

  async timeOutShift() {
    try {
      const result = await this.model.saveShiftSalesToDatabase();
      this.model.archiveCurrentShiftOrders();
      await this.model.notifyBaristaBridge('barista_logout', { archive: true });
      this.stopLivePolling();
      this.view.closeModal();
      this.model.account = null;
      this.model.cart = [];
      document.getElementById('appShell').classList.add('hidden');
      document.getElementById('loginScreen').classList.remove('hidden');
      this.view.toast(`Time Out recorded! ${result.totalOrders || 0} order(s) transferred to database.`);
    } catch (error) {
      this.view.toast(error.message || 'Could not complete Time Out');
    }
  },

  async saveBaristaShiftSales() {
    const statusEl = document.getElementById('shiftSaveStatus');
    try {
      const result = await this.model.saveShiftSalesToDatabase();
      const shift = this.view.formatShiftPeriod(this.model.shiftStartedAt, result.loggedOutAt || new Date());
      if (statusEl) {
        statusEl.className = 'status done';
        statusEl.textContent = `Saved (${shift.label} · ${result.totalOrders} order(s))`;
      }
      this.view.toast('Shift sales record saved');
    } catch (error) {
      if (statusEl) {
        statusEl.className = 'status pending';
        statusEl.textContent = `Save failed: ${error.message}`;
      }
    }
  },

  async loadSalesForecast() {
    const container = document.getElementById('forecastCards');
    if (!container) return;
    const btn = document.querySelector('[data-action="run-forecast"]');
    if (btn) { btn.disabled = true; btn.textContent = 'Generating...'; }
    try {
      const data = await this.model.fetchSalesForecast(7);
      this.view.renderForecastData(data);
      this.view.toast('Forecast generated successfully');
    } catch (error) {
      this.view.toast(error.message || 'Could not generate forecast');
      const chartEl = document.getElementById('forecastChart');
      if (chartEl) chartEl.innerHTML = `<p style="color:var(--red);text-align:center;padding:40px 0;"><strong>Error:</strong> ${error.message}</p>`;
    } finally {
      if (btn) { btn.disabled = false; btn.textContent = 'Generate Forecast'; }
    }
  },

  _isoWeekKey(dateValue) {
    const d = new Date(String(dateValue).replace(' ', 'T'));
    if (isNaN(d.getTime())) return '';
    const tmp = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
    const dayNum = tmp.getUTCDay() || 7;
    tmp.setUTCDate(tmp.getUTCDate() + 4 - dayNum);
    const yearStart = new Date(Date.UTC(tmp.getUTCFullYear(), 0, 1));
    const weekNo = Math.ceil((((tmp - yearStart) / 86400000) + 1) / 7);
    return `${tmp.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
  },

  _monthKey(dateValue) {
    const d = new Date(String(dateValue).replace(' ', 'T'));
    if (isNaN(d.getTime())) return '';
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  },

  loadSavedSalesRecords() {
    const tbody = document.getElementById('savedShiftSalesBody');
    if (!tbody) return;

    const periodEl = document.getElementById('shiftPeriodFilter');
    const weekEl = document.getElementById('shiftWeekFilter');
    const monthEl = document.getElementById('shiftMonthFilter');
    const sortEl = document.getElementById('shiftSortSelect');
    const summaryEl = document.getElementById('shiftFilterSummary');

    [periodEl, weekEl, monthEl, sortEl].forEach(el => {
      if (el && !el.dataset.bound) {
        el.dataset.bound = '1';
        el.onchange = () => {
          if (el === weekEl && weekEl.value && monthEl) monthEl.value = '';
          if (el === monthEl && monthEl.value && weekEl) weekEl.value = '';
          if ((el === weekEl || el === monthEl) && el.value && periodEl) periodEl.value = 'all';
          if (el === periodEl && periodEl.value !== 'all') {
            if (weekEl) weekEl.value = '';
            if (monthEl) monthEl.value = '';
          }
          this.loadSavedSalesRecords();
        };
      }
    });

    const period = periodEl?.value || 'all';
    const weekVal = weekEl?.value || '';
    const monthVal = monthEl?.value || '';
    const sortVal = sortEl?.value || 'newest';

    const nowWeek = this._isoWeekKey(new Date().toISOString());
    const nowMonth = this._monthKey(new Date().toISOString());

    let records = [...this.model.fetchSavedSalesRecords()];
    if (weekVal) {
      records = records.filter(r => this._isoWeekKey(r.logged_out_at || r.shift_started_at) === weekVal);
    } else if (monthVal) {
      records = records.filter(r => this._monthKey(r.logged_out_at || r.shift_started_at) === monthVal);
    } else if (period === 'week') {
      records = records.filter(r => this._isoWeekKey(r.logged_out_at || r.shift_started_at) === nowWeek);
    } else if (period === 'month') {
      records = records.filter(r => this._monthKey(r.logged_out_at || r.shift_started_at) === nowMonth);
    }

    const ts = r => new Date(String(r.logged_out_at || r.shift_started_at || '').replace(' ', 'T')).getTime() || 0;
    records.sort((a, b) => {
      if (sortVal === 'oldest') return ts(a) - ts(b);
      if (sortVal === 'sales-desc') return Number(b.total_sales || 0) - Number(a.total_sales || 0);
      if (sortVal === 'sales-asc') return Number(a.total_sales || 0) - Number(b.total_sales || 0);
      if (sortVal === 'week-desc') {
        const wCmp = this._isoWeekKey(b.logged_out_at || b.shift_started_at).localeCompare(this._isoWeekKey(a.logged_out_at || a.shift_started_at));
        return wCmp !== 0 ? wCmp : ts(b) - ts(a);
      }
      if (sortVal === 'month-desc') {
        const mCmp = this._monthKey(b.logged_out_at || b.shift_started_at).localeCompare(this._monthKey(a.logged_out_at || a.shift_started_at));
        return mCmp !== 0 ? mCmp : ts(b) - ts(a);
      }
      return ts(b) - ts(a);
    });

    if (summaryEl) {
      const totalSales = records.reduce((s, r) => s + Number(r.total_sales || 0), 0);
      const totalOrders = records.reduce((s, r) => s + Number(r.total_orders || 0), 0);
      summaryEl.textContent = `${records.length} shift(s) · ${totalOrders} order(s) · Total: ${this.view.money(totalSales)}`;
    }

    tbody.innerHTML = records.length
      ? records.map((record, idx) => {
          const shift = this.view.formatShiftPeriod(record.shift_started_at, record.logged_out_at);
          const key = record.shift_key || record.id || idx;
          return `<tr><td><strong>${shift.label}</strong><br><small style="color:var(--muted)">${shift.range}</small></td><td>${record.account_name}</td><td>${record.total_orders}</td><td>${record.total_items}</td><td>${this.view.money(record.cash_total)}</td><td>${this.view.money(record.gcash_total)}</td><td><strong>${this.view.money(record.total_sales)}</strong></td><td>${new Date(record.logged_out_at.replace(' ', 'T')).toLocaleString('en-PH', { hour12: true })}</td><td><button class="row-action" type="button" data-action="view-shift" data-shift-key="${key}">View</button> <button class="row-action" type="button" data-action="download-shift-pdf" data-shift-key="${key}">Download PDF</button></td></tr>`;
        }).join('')
      : '<tr><td colspan="9">No saved shift sales records match this filter.</td></tr>';
  },

  viewShiftRecord(button) {
    const key = button.dataset.shiftKey;
    const records = this.model.fetchSavedSalesRecords();
    const record = records.find((r, idx) => String(r.shift_key || r.id || idx) === String(key));
    if (!record) return this.view.toast('Shift record not found');
    const html = this.view.shiftRecordSummaryHtml(record);
    this.view.modal('Shift Summary', `${html}<div class="summary-actions" style="margin-top:14px;"><button class="secondary-action" type="button" data-action="close">Close</button><button class="primary-action" type="button" data-action="download-shift-pdf" data-shift-key="${key}">Download PDF</button></div>`);
    this.bindDynamic();
  },

  downloadShiftPdf(button) {
    const key = button.dataset.shiftKey;
    const records = this.model.fetchSavedSalesRecords();
    const record = records.find((r, idx) => String(r.shift_key || r.id || idx) === String(key));
    if (!record) return this.view.toast('Shift record not found');

    const html = this.view.shiftRecordSummaryHtml(record);
    if (typeof html2pdf === 'undefined') {
      this.view.modal('Shift Sales Summary', html);
      this.view.toast('PDF library not loaded, opening print dialog');
      return window.print();
    }

    const host = document.createElement('div');
    host.style.cssText = 'position:fixed;left:-9999px;top:0;width:680px;background:#fff;padding:16px;';
    host.innerHTML = html;
    document.body.appendChild(host);

    const safeDate = String(record.logged_out_at || '').slice(0, 10) || this.stamp();
    const safeName = String(record.account_name || 'barista').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    html2pdf().set({
      margin: 10,
      filename: `shift-summary-${safeName}-${safeDate}.pdf`,
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    }).from(host.querySelector('.shift-summary')).save()
      .then(() => this.view.toast('Shift PDF downloaded'))
      .catch(() => this.view.toast('Could not create PDF'))
      .finally(() => host.remove());
  }
});
