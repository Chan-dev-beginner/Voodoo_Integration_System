Object.assign(AppController.prototype, {
  bindCreateAccountForm() {
    const createAccountForm = document.getElementById('createAccountForm');
    if (!createAccountForm) return;
    createAccountForm.onsubmit = event => {
      event.preventDefault();
      try {
        this.model.createUser({
          fullName: document.getElementById('newFullName').value.trim(),
          role: document.getElementById('newRole').value,
          username: document.getElementById('newUsername').value.trim(),
          password: document.getElementById('newPassword').value
        });
        createAccountForm.reset();
        this.view.toast('Account created');
        this.loadAccounts();
      } catch (error) {
        this.view.toast(error.message || 'Could not create account');
      }
    };
  },

  loadAccounts() {
    const tbody = document.getElementById('accountsTableBody');
    if (!tbody) return;
    const users = this.model.fetchUsers();
    tbody.innerHTML = users.length
      ? users.map(u => `<tr><td><strong>${u.full_name}</strong></td><td>${u.username}</td><td>${u.role === 'admin' ? 'Admin' : 'Barista'}</td><td><span class="status ${Number(u.is_active) === 1 ? 'done' : 'pending'}">${Number(u.is_active) === 1 ? 'Active' : 'Disabled'}</span></td><td>${u.username === 'admin' ? '—' : `<button class="row-action" type="button" data-action="toggle-user" data-id="${u.id}">${Number(u.is_active) === 1 ? 'Disable' : 'Enable'}</button>`}</td></tr>`).join('')
      : '<tr><td colspan="5">No accounts found.</td></tr>';
  },

  toggleUserAccount(button) {
    try {
      this.model.toggleUser(button.dataset.id);
      this.view.toast('Account status updated');
      this.loadAccounts();
    } catch (error) {
      this.view.toast(error.message || 'Could not update account');
    }
  }
});
