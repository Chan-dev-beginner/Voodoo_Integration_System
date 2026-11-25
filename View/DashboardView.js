Object.assign(AppView.prototype, {
  dashboard() {
    const inventory = this.model.module === 'inventory';
    const metrics = inventory
      ? [['Product stock','₱38,920','9 products'],['Low stock','3 items','Needs attention'],['Out of stock','1 item','Urgent'],['Pending restocks',String(this.model.restockRequests.filter(item => item.status === 'Pending').length),'Awaiting approval']]
      : [["Today's sales","₱12,480","+8.4%"],["Orders","86","12 pending"],["Average order","₱145.12","+3.1%"],["Transactions","64","+6 today"]];
    return `<div class="dashboard-grid">${metrics.map(metric => `<article class="metric-card"><span>${metric[0]}</span><strong>${metric[1]}</strong><small>${metric[2]}</small></article>`).join('')}</div><div class="dashboard-split"><section class="chart-card"><h2>${inventory?'Inventory overview':'Sales overview'}</h2><div class="chart-bars"><i style="height:42%"></i><i style="height:67%"></i><i style="height:54%"></i><i style="height:78%"></i><i style="height:64%"></i><i style="height:92%"></i><i style="height:72%"></i></div></section><section class="activity-card"><h2>Recent activity</h2><div class="activity-list"><div class="activity-item"><i class="activity-dot"></i><div><strong>Order #1008</strong><br><span>Added 3 items · 10:42 AM</span></div></div><div class="activity-item"><i class="activity-dot"></i><div><strong>Stock adjusted</strong><br><span>Matcha Frappe · 10:31 AM</span></div></div></div></section></div>`;
  }
});
