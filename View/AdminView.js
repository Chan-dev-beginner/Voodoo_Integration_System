Object.assign(AppView.prototype, {
  accounts() {
    return `<div class="restock-grid"><section class="form-card"><h2>Add Staff Account</h2><form id="createAccountForm" class="form-grid"><label>Full Name<input id="newFullName" required placeholder="e.g. Maria Santos"></label><label>Role<select id="newRole"><option value="barista">Barista</option><option value="admin">Admin</option></select></label><label>Username<input id="newUsername" required placeholder="e.g. barista2"></label><label>Password<input id="newPassword" type="password" required placeholder="Enter password"></label><button class="primary-action" type="submit">Create Account</button></form></section><section class="form-card"><h2>Staff Accounts</h2><div class="table-wrap"><table><thead><tr><th>Name</th><th>Username</th><th>Role</th><th>Status</th><th>Action</th></tr></thead><tbody id="accountsTableBody"><tr><td colspan="5">Loading accounts...</td></tr></tbody></table></div></section></div>`;
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
