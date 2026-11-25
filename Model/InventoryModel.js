Object.assign(AppModel.prototype, {
  saveProducts() {
    this.save('voodooProducts', this.products);
  },

  requestRestock(productId, quantity) {
    const product = this.products.find(item => item.id === Number(productId));
    if (!product || Number(quantity) <= 0) return false;
    const req = {
      id: 'RR-' + String(Date.now()).slice(-6),
      productId: product.id,
      productName: product.name,
      quantity: Number(quantity),
      requestedBy: this.account.name,
      status: 'Pending',
      requestedAt: new Date().toISOString(),
      approvedAt: null
    };
    this.restockRequests.push(req);
    this.save('voodooRestockRequests', this.restockRequests);
    this.syncToDb('create_restock_request', {
      productId: product.id,
      quantity: Number(quantity),
      userId: this.account?.id || null
    }).then(res => {
      if (res.ok && res.dbId) {
        req.dbId = res.dbId;
        req.id = res.id;
        this.save('voodooRestockRequests', this.restockRequests);
      }
    });
    return true;
  },

  approveRestock(requestId) {
    const request = this.restockRequests.find(item => item.id === requestId);
    if (!request || request.status !== 'Pending') return false;
    const product = this.products.find(item => item.id === request.productId);
    if (product) product.stock += request.quantity;
    request.status = 'Approved';
    request.approvedAt = new Date().toISOString();
    this.save('voodooRestockRequests', this.restockRequests);
    this.saveProducts();
    this.syncToDb('resolve_restock_request', {
      dbId: request.dbId || Number(String(request.id).replace('RR-', '')),
      decision: 'approve',
      userId: this.account?.id || null
    });
    return true;
  },

  rejectRestock(requestId) {
    const request = this.restockRequests.find(item => item.id === requestId);
    if (!request || request.status !== 'Pending') return false;
    request.status = 'Rejected';
    request.approvedAt = new Date().toISOString();
    this.save('voodooRestockRequests', this.restockRequests);
    this.syncToDb('resolve_restock_request', {
      dbId: request.dbId || Number(String(request.id).replace('RR-', '')),
      decision: 'reject',
      userId: this.account?.id || null
    });
    return true;
  }
});
