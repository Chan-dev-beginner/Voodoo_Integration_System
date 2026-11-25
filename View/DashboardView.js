Object.assign(AppView.prototype, {
  dashboard() {
    const inventory = this.model.module === 'inventory';
    const orders = this.model.orders || [];
    const products = this.model.products || [];
    const restocks = this.model.restockRequests || [];

    const todayStr = new Date().toDateString();
    const completedOrders = orders.filter(o => !o.status || o.status === 'completed');
    const todayCompleted = completedOrders.filter(o => new Date(o.time).toDateString() === todayStr);
    const activeCount = orders.filter(o => ['pending', 'queue', 'preparing'].includes(o.status)).length;

    const todaySales = todayCompleted.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const totalSalesAll = completedOrders.reduce((sum, o) => sum + Number(o.total || 0), 0);
    const avgOrder = todayCompleted.length
      ? todaySales / todayCompleted.length
      : (completedOrders.length ? totalSalesAll / completedOrders.length : 0);

    const stockValue = products.reduce((sum, p) => sum + Number(p.price || 0) * Number(p.stock || 0), 0);
    const lowStock = products.filter(p => p.stock > 0 && p.stock <= 5).length;
    const outStock = products.filter(p => p.stock <= 0).length;
    const pendingRestocks = restocks.filter(r => r.status === 'Pending').length;

    const metrics = inventory
      ? [
          ['Product stock', this.money(stockValue), `${products.length} products`],
          ['Low stock', `${lowStock} item(s)`, lowStock ? 'Needs attention' : 'All good'],
          ['Out of stock', `${outStock} item(s)`, outStock ? 'Urgent' : 'None'],
          ['Pending restocks', String(pendingRestocks), 'Awaiting approval']
        ]
      : [
          ["Today's sales", this.money(todaySales), `${todayCompleted.length} completed today`],
          ['Orders', String(orders.length), `${activeCount} active / pending`],
          ['Average order', this.money(avgOrder), `${completedOrders.length} completed total`],
          ['Total sales', this.money(totalSalesAll), `${this.model.savedShiftSales?.length || 0} saved shift(s)`]
        ];

    // Build last 7 days sales series
    const days = [];
    for (let offset = -6; offset <= 0; offset++) {
      const d = new Date();
      d.setDate(d.getDate() + offset);
      const dStr = d.toDateString();
      const daySales = completedOrders
        .filter(o => new Date(o.time).toDateString() === dStr)
        .reduce((sum, o) => sum + Number(o.total || 0), 0);
      days.push({
        label: d.toLocaleDateString('en-PH', { weekday: 'short' }),
        date: d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
        sales: daySales
      });
    }
    const maxDaySales = Math.max(...days.map(d => d.sales), 1);

    const barsHtml = inventory
      ? products.slice(0, 7).map(p => {
          const maxStock = Math.max(...products.map(x => Number(x.stock || 0)), 1);
          const pct = Math.max(6, Math.round((Number(p.stock || 0) / maxStock) * 100));
          return `<div class="chart-bar-col"><i style="height:${pct}%" title="${p.name}: ${p.stock} cups"></i><small>${p.name.split(' ')[0]}</small></div>`;
        }).join('')
      : days.map(d => {
          const pct = d.sales > 0 ? Math.max(8, Math.round((d.sales / maxDaySales) * 100)) : 4;
          return `<div class="chart-bar-col"><i class="${d.sales === 0 ? 'empty-bar' : ''}" style="height:${pct}%" title="${d.date}: ${this.money(d.sales)}"></i><small>${d.label}</small></div>`;
        }).join('');

    // Build recent activity from real orders & restock requests
    const activities = [
      ...orders.slice(0, 6).map(o => ({
        time: new Date(o.time).getTime() || 0,
        title: `Order ${o.id} (${o.status || 'completed'})`,
        meta: `${(o.items || []).reduce((s, i) => s + Number(i.quantity || 0), 0)} item(s) · ${this.money(o.total || 0)} · ${new Date(o.time).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}`
      })),
      ...restocks.slice(-4).map(r => ({
        time: new Date(r.requestedAt || 0).getTime() || 0,
        title: `Restock: ${r.productName}`,
        meta: `${r.quantity} cups · ${r.status} · ${r.requestedBy}`
      }))
    ]
      .sort((a, b) => b.time - a.time)
      .slice(0, 5);

    const activityHtml = activities.length
      ? activities.map(a => `<div class="activity-item"><i class="activity-dot"></i><div><strong>${a.title}</strong><br><span>${a.meta}</span></div></div>`).join('')
      : '<p style="color:var(--muted);font-size:13px;">No recent activity yet. Orders and restocks will appear here.</p>';

    return `<div class="dashboard-grid">${metrics.map(metric => `<article class="metric-card"><span>${metric[0]}</span><strong>${metric[1]}</strong><small>${metric[2]}</small></article>`).join('')}</div><div class="dashboard-split"><section class="chart-card"><h2>${inventory ? 'Inventory overview' : 'Sales overview (Last 7 Days)'}</h2><div class="chart-bars">${barsHtml}</div></section><section class="activity-card"><h2>Recent activity</h2><div class="activity-list">${activityHtml}</div></section></div>`;
  }
});
