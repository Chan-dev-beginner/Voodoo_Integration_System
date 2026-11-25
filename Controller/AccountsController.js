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
      ? users.map(u => `<tr><td><strong>${u.full_name}</strong></td><td>${u.username}</td><td>${u.role === 'admin' ? 'Admin' : 'Barista'}</td><td><span class="status ${Number(u.is_active) === 1 ? 'done' : 'pending'}">${Number(u.is_active) === 1 ? 'Active' : 'Disabled'}</span></td><td><div class="account-actions"><button class="row-action" type="button" data-action="change-password" data-id="${u.id}">Password</button>${u.username === 'admin' ? '' : `<button class="row-action" type="button" data-action="toggle-user" data-id="${u.id}">${Number(u.is_active) === 1 ? 'Disable' : 'Enable'}</button>`}</div></td></tr>`).join('')
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
  },

  openChangePassword(button) {
    const users = this.model.fetchUsers();
    const user = users.find(u => u.id === Number(button.dataset.id));
    if (!user) return this.view.toast('User not found');
    this.view.modal('Change Password', this.view.changePasswordModal(user));
  },

  submitChangePassword() {
    const userId = document.getElementById('cpUserId')?.value;
    const currentPw = document.getElementById('cpCurrentPw')?.value || '';
    const newPw = document.getElementById('cpNewPw')?.value || '';
    const confirmPw = document.getElementById('cpConfirmPw')?.value || '';
    if (newPw !== confirmPw) {
      return this.view.toast('New passwords do not match.');
    }
    try {
      this.model.changePassword(userId, currentPw, newPw);
      this.view.closeModal();
      this.view.toast('Password changed successfully!');
      this.loadAccounts();
    } catch (error) {
      this.view.toast(error.message || 'Could not change password');
    }
  }
});
