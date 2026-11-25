Object.assign(AppView.prototype, {
  accounts() {
    return `<div class="restock-grid"><section class="form-card"><h2>Add Staff Account</h2><form id="createAccountForm" class="form-grid"><label>Full Name<input id="newFullName" required placeholder="e.g. Maria Santos"></label><label>Role<select id="newRole"><option value="barista">Barista</option><option value="admin">Admin</option></select></label><label>Username<input id="newUsername" required placeholder="e.g. barista2"></label><label>Password<input id="newPassword" type="password" required placeholder="Enter password"></label><button class="primary-action" type="submit">Create Account</button></form></section><section class="form-card"><h2>Staff Accounts</h2><div class="table-wrap"><table><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody id="accountsTableBody"><tr><td colspan="5">Loading accounts...</td></tr></tbody></table></div></section></div>`;
  },

  changePasswordModal(user) {
    return `<div class="change-pw-box">
      <p>Changing password for <strong>${user.full_name}</strong> (@${user.username})</p>
      <input type="hidden" id="cpUserId" value="${user.id}">
      <div class="form-grid" style="grid-template-columns:1fr;">
        <label>Current Password<input id="cpCurrentPw" type="password" required placeholder="Enter current password"></label>
        <label>New Password<input id="cpNewPw" type="password" required placeholder="Enter new password (min 4 chars)"></label>
        <label>Confirm New Password<input id="cpConfirmPw" type="password" required placeholder="Confirm new password"></label>
      </div>
      <div class="summary-actions" style="margin-top:14px;">
        <button class="secondary-action" type="button" data-action="close">Cancel</button>
        <button class="primary-action" type="button" data-action="submit-password">Change Password</button>
      </div>
    </div>`;
  },

  salesForecast() {
    return `<div class="forecast-container">
      <div class="inventory-tools"><div><h2>Sales Forecast</h2><p>Analyze past, present, and predicted future sales</p></div>
        <button class="primary-action" type="button" data-action="run-forecast">Generate Forecast</button>
      </div>
      <div class="forecast-cards" id="forecastCards">
        <article class="metric-card forecast-card">
          <span>Past Sales (Before)</span><strong id="fcPastSales">—</strong><small>Last 14 days</small>
        </article>
        <article class="metric-card forecast-card">
          <span>Today's Sales (Present)</span><strong id="fcTodaySales">—</strong><small>Current day</small>
        </article>
        <article class="metric-card forecast-card forecast-future">
          <span>Next 7 Days (Future)</span><strong id="fcNext7">—</strong><small>Predicted</small>
        </article>
        <article class="metric-card forecast-card forecast-future">
          <span>Next 30 Days (Future)</span><strong id="fcNext30">—</strong><small>Predicted</small>
        </article>
      </div>
      <div class="forecast-split">
        <section class="chart-card">
          <h2>Sales Trend & Prediction</h2>
          <div class="forecast-chart" id="forecastChart">
            <p style="color:var(--muted);text-align:center;padding:40px 0;">Click <strong>Generate Forecast</strong> to view the chart</p>
          </div>
        </section>
        <section class="activity-card">
          <h2>Growth & Insights</h2>
          <div id="forecastInsights" class="forecast-insights">
            <p style="color:var(--muted);">Forecast insights will appear here after generation.</p>
          </div>
        </section>
      </div>
      <div class="data-card" style="margin:0 28px 28px;">
        <div class="data-head"><h2>Product Demand Forecast</h2></div>
        <div class="table-wrap">
          <table><thead><tr><th>Product</th><th>Current Stock</th><th>Predicted Demand (7d)</th><th>Status</th><th>Recommendation</th></tr></thead>
          <tbody id="forecastDemandBody"><tr><td colspan="5" style="color:var(--muted);">Generate a forecast to see product demand predictions.</td></tr></tbody></table>
        </div>
      </div>
    </div>`;
  },

  renderForecastData(data) {
    const m = v => `₱${Number(v || 0).toFixed(2)}`;
    const summary = data.summary || {};

    document.getElementById('fcPastSales').textContent = m(summary.beforeTotal ?? data.past_total ?? 0);
    document.getElementById('fcTodaySales').textContent = m(summary.presentSales ?? data.today_total ?? 0);
    document.getElementById('fcNext7').textContent = m(summary.predictedNext7Days ?? data.predicted_7day ?? 0);
    document.getElementById('fcNext30').textContent = m(summary.predictedNext30Days ?? data.predicted_30day ?? 0);

    // Render chart bars (past + predicted)
    const history = data.history || data.daily_history || [];
    const predicted = data.predictions || data.daily_predicted || [];
    const valOf = d => Number(d.sales ?? d.total ?? 0);
    const all = [...history.map(valOf), ...predicted.map(valOf)];
    const maxVal = Math.max(...all, 1);
    const chartEl = document.getElementById('forecastChart');
    if (chartEl) {
      const histBars = history.map(d => {
        const val = valOf(d);
        const pct = Math.max(3, (val / maxVal) * 100);
        const label = d.day || d.label || (d.date ? d.date.slice(5) : '');
        return `<div class="fc-bar-wrap"><i class="fc-bar fc-past" style="height:${pct}%" title="${d.date} (${d.period || 'past'}): ₱${val.toFixed(0)}"></i><small>${label}</small></div>`;
      }).join('');
      const predBars = predicted.map(d => {
        const val = valOf(d);
        const pct = Math.max(3, (val / maxVal) * 100);
        const label = d.day || d.label || (d.date ? d.date.slice(5) : '');
        return `<div class="fc-bar-wrap"><i class="fc-bar fc-future" style="height:${pct}%" title="${d.date} (predicted): ₱${val.toFixed(0)}"></i><small>${label}</small></div>`;
      }).join('');
      chartEl.innerHTML = `<div class="fc-chart-legend"><span class="fc-legend-past">● Past/Present</span><span class="fc-legend-future">● Predicted</span></div><div class="fc-bars">${histBars}${predBars}</div>`;
    }

    // Insights
    const insightsEl = document.getElementById('forecastInsights');
    if (insightsEl) {
      const growth = Number(summary.growthPercent ?? data.growth_rate ?? 0);
      const trend = summary.trendLabel || (growth > 0 ? 'Upward' : growth < 0 ? 'Downward' : 'Stable');
      const trendColor = growth > 0 ? 'var(--green)' : growth < 0 ? 'var(--red)' : 'var(--muted)';
      const bestEntry = history.reduce((best, cur) => (valOf(cur) > valOf(best) ? cur : best), history[0] || null);
      const bestDayText = bestEntry ? `${bestEntry.date} (${m(valOf(bestEntry))})` : (data.best_day || '—');
      insightsEl.innerHTML = `
        <div class="fc-insight"><span>Growth Rate</span><strong style="color:${trendColor}">${growth > 0 ? '+' : ''}${growth.toFixed(1)}%</strong></div>
        <div class="fc-insight"><span>Trend Direction</span><strong style="color:${trendColor}">${trend}</strong></div>
        <div class="fc-insight"><span>Avg Daily (Past)</span><strong>${m(summary.beforeDailyAvg ?? data.avg_daily_past ?? 0)}</strong></div>
        <div class="fc-insight"><span>Avg Daily (Predicted)</span><strong>${m(summary.predictedDailyAvg ?? data.avg_daily_predicted ?? 0)}</strong></div>
        <div class="fc-insight"><span>Best Day (Past)</span><strong>${bestDayText}</strong></div>
        <div class="fc-insight"><span>Data Points Used</span><strong>${history.length || data.data_points || 0} days</strong></div>
      `;
    }

    // Demand table
    const demandBody = document.getElementById('forecastDemandBody');
    const products = data.productForecast || data.product_demand || [];
    if (demandBody) {
      demandBody.innerHTML = products.length
        ? products.map(p => {
            const stock = Number(p.currentStock ?? p.stock ?? 0);
            const demand = Number(p.predictedDemand ?? p.predicted_demand ?? 0);
            const statusClass = stock <= 0 ? 'stock-out' : stock <= demand ? 'stock-low' : '';
            const statusLabel = stock <= 0 ? 'Out of Stock' : stock <= demand ? 'Low Stock' : 'Sufficient';
            const rec = p.advice || (stock <= 0 ? `Restock immediately (need ~${Math.ceil(demand)} units)` : stock <= demand ? `Restock soon (need ~${Math.ceil(demand - stock)} more)` : 'No action needed');
            return `<tr><td><strong>${p.name}</strong></td><td>${stock}</td><td>${Math.ceil(demand)}</td><td><span class="${statusClass}">${statusLabel}</span></td><td>${rec}</td></tr>`;
          }).join('')
        : '<tr><td colspan="5">No product demand data available.</td></tr>';
    }
  },

  qrModal(qrInfo) {
    const url = typeof qrInfo === 'string' ? qrInfo : qrInfo.orderingUrl;
    const adapter = typeof qrInfo === 'string' ? 'Current Network' : `${qrInfo.networkAdapter} (${qrInfo.detectedIp})`;
    const networks = Array.isArray(qrInfo?.availableNetworks) ? qrInfo.availableNetworks : [];
    const selector = networks.length > 1
      ? `<label class="modal-field">Connected Network<select id="qrNetworkSelect">${networks.map(n => `<option value="${n.url}" ${n.url === url ? 'selected' : ''}>${n.adapter} (${n.ip})</option>`).join('')}</select></label>`
      : '';
    return `<div class="qr-modal-box"><p>Customers can scan this QR code on their phone to open the <strong>Customer Ordering</strong> page. Orders will automatically appear in your POS for approval.</p><p class="qr-network-badge"><span id="qrNetworkLabel" class="status done">Network: ${adapter}</span></p>${selector}<div id="qrCodeCanvas" class="qr-code-canvas"></div><label class="modal-field">Customer Ordering URL<input id="qrUrlInput" type="text" value="${url}"></label><div class="summary-actions"><button class="secondary-action" type="button" data-action="refresh-qr">Refresh Network</button><button class="secondary-action" type="button" data-action="copy-qr">Copy Link</button><a class="primary-action qr-open-link" href="${url}" target="_blank" rel="noopener">Open Page</a></div></div>`;
  }
});
