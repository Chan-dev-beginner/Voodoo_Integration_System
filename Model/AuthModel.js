Object.assign(AppModel.prototype, {
  loginUser(username, password) {
    this.accounts = this.load('voodooAccounts', this.defaultAccounts());
    const user = this.accounts.find(
      u => u.username.toLowerCase() === String(username).trim().toLowerCase() && Number(u.is_active) === 1
    );
    if (!user || user.password !== String(password)) {
      throw new Error('Invalid username or password');
    }
    return {
      id: user.id,
      username: user.username,
      fullName: user.full_name || user.username,
      role: user.role === 'admin' ? 'admin' : 'barista'
    };
  },

  fetchUsers() {
    this.accounts = this.load('voodooAccounts', this.defaultAccounts());
    return this.accounts;
  },

  createUser(payload) {
    this.accounts = this.load('voodooAccounts', this.defaultAccounts());
    const username = String(payload.username || '').trim();
    const fullName = String(payload.fullName || '').trim();
    const password = String(payload.password || '');
    const role = payload.role === 'admin' ? 'admin' : 'cashier';

    if (!username || !fullName || !password) {
      throw new Error('Full name, username, and password are required.');
    }
    if (this.accounts.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      throw new Error(`Username '${username}' already exists.`);
    }

    const user = {
      id: Date.now(),
      username,
      password,
      full_name: fullName,
      role,
      is_active: 1
    };
    this.accounts.push(user);
    this.save('voodooAccounts', this.accounts);
    return user;
  },

  toggleUser(userId) {
    this.accounts = this.load('voodooAccounts', this.defaultAccounts());
    const user = this.accounts.find(u => u.id === Number(userId));
    if (!user) throw new Error('User not found.');
    if (user.username.toLowerCase() === 'admin') {
      throw new Error('Default admin account cannot be disabled.');
    }
    user.is_active = Number(user.is_active) === 1 ? 0 : 1;
    this.save('voodooAccounts', this.accounts);
    return user;
  },

  changePassword(userId, currentPassword, newPassword) {
    this.accounts = this.load('voodooAccounts', this.defaultAccounts());
    const user = this.accounts.find(u => u.id === Number(userId));
    if (!user) throw new Error('User not found.');
    if (user.password !== String(currentPassword)) {
      throw new Error('Current password is incorrect.');
    }
    if (!newPassword || newPassword.length < 4) {
      throw new Error('New password must be at least 4 characters.');
    }
    user.password = String(newPassword);
    this.save('voodooAccounts', this.accounts);
    return user;
  }
});
