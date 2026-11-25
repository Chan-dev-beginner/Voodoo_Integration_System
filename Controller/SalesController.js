Object.assign(AppController.prototype, {
  viewOrder(button) {
    const order = this.model.orders.find(i => i.id === button.dataset.id);
    if (!order) return this.view.toast('Order not found');
    const items = order.items.map(i => `<tr><td>${i.name}</td><td>${i.quantity}</td><td>${this.view.money(i.price)}</td><td><strong>${this.view.money(i.total)}</strong></td></tr>`).join('');
    this.view.modal(`Order ${order.id}`, `
      <div class="order-detail-meta">
        <p>Cashier<br><strong>${order.account}</strong></p>
        <p>Payment<br><strong>${order.paymentMethod}</strong></p>
        <p>Time<br><strong>${new Date(order.time).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}</strong></p>
      </div>
      <table class="summary-table"><thead><tr><th>Item</th><th>Qty</th><th>Price</th><th>Total</th></tr></thead><tbody>${items}</tbody></table>
      <div class="shift-summary-total"><span>Total</span><strong>${this.view.money(order.total)}</strong></div>
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
      const result = this.model.saveShiftSalesToDatabase();
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

  loadSavedSalesRecords() {
    const tbody = document.getElementById('savedShiftSalesBody');
    if (!tbody) return;
    const records = this.model.fetchSavedSalesRecords();
    tbody.innerHTML = records.length
      ? records.map(record => {
          const shift = this.view.formatShiftPeriod(record.shift_started_at, record.logged_out_at);
          return `<tr><td><strong>${shift.label}</strong><br><small style="color:var(--muted)">${shift.range}</small></td><td>${record.account_name}</td><td>${record.total_orders}</td><td>${record.total_items}</td><td>${this.view.money(record.cash_total)}</td><td>${this.view.money(record.gcash_total)}</td><td><strong>${this.view.money(record.total_sales)}</strong></td><td>${new Date(record.logged_out_at.replace(' ', 'T')).toLocaleString('en-PH', { hour12: true })}</td></tr>`;
        }).join('')
      : '<tr><td colspan="8">No saved shift sales records yet.</td></tr>';
  }
});
