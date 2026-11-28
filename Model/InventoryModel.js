Object.assign(AppModel.prototype, {
  saveProducts() {
    this.save('voodooProducts', this.products);
  },

  saveCupVariants() {
    this.save('voodooCupVariants', this.cupVariants);
    this.syncProductStocksFromCups();
    this.saveProducts();
  },

  requestRestock(cupVariantKey, quantity) {
    const cup = this.cupVariants.find(c => c.key === cupVariantKey);
    if (!cup || Number(quantity) <= 0) return false;
    const req = {
      id: 'RR-' + String(Date.now()).slice(-6),
      cupVariant: cup.key,
      productId: 0,
      productName: cup.name,
      quantity: Number(quantity),
      requestedBy: this.account.name,
      status: 'Pending',
      requestedAt: new Date().toISOString(),
      approvedAt: null
    };
    this.restockRequests.push(req);
    this.save('voodooRestockRequests', this.restockRequests);
    this.syncToDb('create_restock_request', {
      cupVariant: cup.key,
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
    const cup = this.cupVariants.find(c => c.key === request.cupVariant || c.name === request.productName);
    if (cup) {
      cup.stock = Number(cup.stock || 0) + Number(request.quantity || 0);
      this.saveCupVariants();
    } else {
      const product = this.products.find(item => item.id === request.productId);
      if (product) {
        product.stock += request.quantity;
        this.saveProducts();
      }
    }
    request.status = 'Approved';
    request.approvedAt = new Date().toISOString();
    this.save('voodooRestockRequests', this.restockRequests);
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
