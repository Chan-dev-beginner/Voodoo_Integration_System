Object.assign(AppController.prototype, {
  changeOrderStatus(button) {
    const orderNumber = button.dataset.id;
    const nextStatus = button.dataset.status;
    button.disabled = true;
    try {
      this.model.updateOrderStatus(orderNumber, nextStatus);
      const strip = document.getElementById('posQueueStrip');
      if (strip) strip.innerHTML = this.view.posQueueStrip();
      const grid = document.getElementById('posGrid');
      if (grid) grid.innerHTML = this.view.productGrid();
      if (this.model.module === 'order-queue') this.navigate('order-queue');
      const labels = {
        queue: 'Approved to Queue',
        preparing: 'Moved to Preparing',
        completed: 'Order Completed',
        cancelled: 'Order Rejected'
      };
      this.view.toast(`${orderNumber}: ${labels[nextStatus] || nextStatus}`);
    } catch (error) {
      button.disabled = false;
      this.view.toast(error.message || 'Status update failed');
    }
  },

  showQrModal() {
    const qrInfo = this.model.fetchQrInfo();
    this.view.modal('Customer Ordering QR Code', this.view.qrModal(qrInfo));
    this.bindQrControls();
    this.renderQrCode();
  },

  bindQrControls() {
    const select = document.getElementById('qrNetworkSelect');
    const urlInput = document.getElementById('qrUrlInput');
    if (select && urlInput) {
      select.onchange = () => {
        urlInput.value = select.value;
        this.renderQrCode();
      };
    }
    if (urlInput) {
      urlInput.oninput = () => this.renderQrCode();
    }
  },

  refreshQrNetwork() {
    const qrInfo = this.model.fetchQrInfo();
    const urlInput = document.getElementById('qrUrlInput');
    const label = document.getElementById('qrNetworkLabel');
    if (!urlInput) return;
    urlInput.value = qrInfo.orderingUrl;
    if (label) label.textContent = `Network: ${qrInfo.networkAdapter} (${qrInfo.detectedIp})`;
    this.renderQrCode();
    this.view.toast(`QR configured for ${qrInfo.networkAdapter} (${qrInfo.detectedIp})`);
  },

  renderQrCode() {
    const container = document.getElementById('qrCodeCanvas');
    const input = document.getElementById('qrUrlInput');
    if (!container || !input) return;
    const url = input.value.trim();
    container.innerHTML = '';
    const link = document.querySelector('.qr-open-link');
    if (link) link.href = url;
    if (typeof QRCode !== 'undefined') {
      new QRCode(container, { text: url, width: 210, height: 210, colorDark: '#101725', colorLight: '#ffffff' });
    } else {
      container.innerHTML = '<p class="login-hint">QR library offline — share or open the URL below.</p>';
    }
  },

  copyQrUrl() {
    const input = document.getElementById('qrUrlInput');
    if (!input) return;
    if (navigator.clipboard) {
      navigator.clipboard.writeText(input.value).then(() => this.view.toast('Ordering link copied'));
    } else {
      input.select();
      document.execCommand('copy');
      this.view.toast('Ordering link copied');
    }
  }
});
