class AppController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
    this.handlers = {
      'add': b => this.addItem(b),
      'pick-cup': b => this.openCupModal(b),
      'confirm-add-cup': b => this.confirmAddCup(b),
      'plus': b => this.changeQty(b, 1),
      'minus': b => this.changeQty(b, -1),
      'clear': () => this.clearCart(),
      'checkout': () => this.checkout(),
      'confirm': () => this.confirmPayment(),
      'close': () => this.view.closeModal(),
      'close-summary': () => this.closeSummary(),
      'approve-request': b => this.resolveRestock(b, 'approve'),
      'reject-request': b => this.resolveRestock(b, 'reject'),
      'order-type': b => this.setOrderType(b),
      'manage': b => this.manageProduct(b),
      'save': b => this.saveProduct(b),
      'manage-cup': b => this.manageCup(b),
      'save-cup': b => this.saveCup(b),
      'view-order': b => this.viewOrder(b),
      'backup': () => this.createBackup(),
      'import': () => this.importInventory(),
      'export': () => this.exportInventory(),
      'download-summary': () => this.downloadSummary(),
      'view-shift': b => this.viewShiftRecord(b),
      'download-shift-pdf': b => this.downloadShiftPdf(b),
      'restock': () => this.navigate('restock'),
      'show-qr': () => this.showQrModal(),
      'copy-qr': () => this.copyQrUrl(),
      'refresh-qr': () => this.refreshQrNetwork(),
      'regen-qr': () => this.renderQrCode(),
      'order-status': b => this.changeOrderStatus(b),
      'toggle-user': b => this.toggleUserAccount(b),
      'change-password': b => this.openChangePassword(b),
      'submit-password': () => this.submitChangePassword(),
      'run-forecast': () => this.loadSalesForecast(),
      'time-out': () => this.confirmTimeOut(),
      'confirm-time-out': () => this.timeOutShift()
    };
    this.pollTimer = null;
    this.bindGlobal();
  }

  bindGlobal() {
    document.getElementById('togglePassword').onclick = () => {
      const password = document.getElementById('password');
      password.type = password.type === 'password' ? 'text' : 'password';
    };

    document.getElementById('loginAccount').onchange = event => {
      const role = event.target.value;
      document.getElementById('accountHint').textContent = role === 'admin' ? 'Admin: admin / admin' : 'Barista: barista / barista';
      document.getElementById('username').value = role;
      document.getElementById('password').value = role;
    };

    document.getElementById('loginForm').onsubmit = event => {
      event.preventDefault();
      const username = document.getElementById('username').value.trim();
      const password = document.getElementById('password').value;
      try {
        const user = this.model.loginUser(username, password);
        this.login(user);
      } catch (error) {
        this.view.toast(error.message || 'Invalid username or password');
      }
    };

    document.getElementById('logoutButton').onclick = () => this.logout();
    document.getElementById('primaryAction').onclick = () => this.primaryAction();
    document.querySelector('.icon-action').onclick = () => this.view.toggleNotificationPanel();

    // Delegate module and action button clicks so dynamic re-renders never lose handlers.
    document.addEventListener('click', event => {
      const moduleButton = event.target.closest('button[data-module]');
      if (moduleButton) {
        document.querySelectorAll('[data-module]').forEach(item => item.classList.remove('active'));
        moduleButton.classList.add('active');
        this.navigate(moduleButton.dataset.module);
        return;
      }

      const actionButton = event.target.closest('button[data-action]');
      if (actionButton) {
        this.action(actionButton);
      }
    });

    window.addEventListener('online', () => {
      if (document.getElementById('qrCodeCanvas')) this.refreshQrNetwork();
    });
  }

  login(userOrRole) {
    const user = typeof userOrRole === 'string'
      ? { id: null, username: userOrRole, role: userOrRole, fullName: userOrRole === 'admin' ? 'Admin' : 'Barista' }
      : userOrRole;
    const role = user.role === 'admin' ? 'admin' : 'barista';
    this.model.account = {
      id: user.id || null,
      username: user.username || role,
      role,
      name: user.fullName || (role === 'admin' ? 'Admin' : 'Barista')
    };
    this.model.shiftStartedAt = new Date().toISOString();
    this.model.orderType = 'dine-in';
    this.model.cart = [];

    document.getElementById('loginScreen').classList.add('hidden');
    document.getElementById('appShell').classList.remove('hidden');
    document.getElementById('staffName').textContent = this.model.account.name;
    document.querySelector('.avatar').textContent = (this.model.account.name || 'U').charAt(0).toUpperCase();

    this.view.nav(role === 'admin'
      ? [['dashboard','','Dashboard'],['forecast','','Sales Forecast'],['inventory','','Stock Monitor'],['alerts','','Alerts'],['restock','','Restock Requests'],['order-log','','Shift Log'],['accounts','','Accounts'],['backup','','Backup Data']]
      : [['pos','','POS'],['order-queue','','Order Queue'],['dashboard','','Dashboard'],['inventory','','Inventory'],['restock','','Request Restock'],['order-log','','Order Log']]);

    this.navigate(role === 'barista' ? 'pos' : 'dashboard');
    this.view.clock();
    if (role === 'barista') {
      this.model.archivePreviousOrdersAndSaveShift().then(res => {
        if (res.archived > 0) {
          this.view.toast(res.saved ? 'Previous orders archived & shift sales stored' : 'Previous orders archived');
          if (this.model.module === 'pos') this.navigate('pos');
        }
      });
      this.model.notifyBaristaBridge('barista_login');
    }
    this.refreshLiveData();
    this.startLivePolling();
    this.model.bootstrapFromDatabase().then(ok => {
      if (ok && this.model.account) {
        const activeBtn = document.querySelector('[data-module].active');
        this.navigate(activeBtn ? activeBtn.dataset.module : (role === 'barista' ? 'pos' : 'dashboard'));
      }
    });
  }

  navigate(module) {
    if (['forecast', 'accounts', 'backup'].includes(module) && this.model.account?.role !== 'admin') {
      module = 'dashboard';
    }
    this.model.module = module;
    if (['inventory','alerts','restock','backup','order-log','accounts'].includes(module)) this.model.module = 'inventory';
    else if (module === 'pos' || module === 'ordering' || module === 'order-queue') this.model.module = module;
    else if (module === 'forecast') this.model.module = 'forecast';
    else this.model.module = 'dashboard';

    document.getElementById('pageLabel').textContent = this.model.account.role === 'admin' ? 'Inventory management' : 'Barista workspace';
    const titles = {
      dashboard: 'Dashboard',
      forecast: 'Sales Forecast',
      pos: 'POS',
      'order-queue': 'Order Queue',
      ordering: 'Ordering',
      inventory: 'Stock Monitor',
      alerts: 'Alert Module',
      restock: 'Restock Requests',
      backup: 'Backup Data',
      'order-log': 'Shift Order Log',
      accounts: 'Staff Accounts'
    };
    document.getElementById('pageTitle').textContent = (module === 'order-log' && this.model.account?.role === 'admin')
      ? 'Shift Log'
      : titles[module];

    const views = {
      pos: () => this.view.pos(),
      'order-queue': () => this.view.orderQueue(),
      ordering: () => this.view.ordering(),
      inventory: () => this.view.inventory(),
      alerts: () => this.view.alerts(),
      restock: () => this.view.restock(),
      'order-log': () => this.view.shiftOrders(),
      accounts: () => this.view.accounts(),
      forecast: () => this.view.salesForecast(),
      backup: () => this.view.backup(),
      dashboard: () => this.view.dashboard()
    };
    const html = (views[module] || views.dashboard)();
    document.getElementById('viewContainer').innerHTML = `<section class="module-view">${html}</section>`;

    this.view.renderCart();
    this.bindDynamic();
    if (module === 'order-log') this.loadSavedSalesRecords();
    if (module === 'accounts') this.loadAccounts();
    if (module === 'forecast') this.loadSalesForecast();
  }

  bindDynamic() {
    this.bindSearchInputs();
    this.bindRestockForm();
    this.bindCreateAccountForm();
  }

  action(button) {
    const handler = this.handlers[button.dataset.action];
    if (handler) handler(button);
  }

  logout() {
    this.view.modal('Shift Summary', this.view.shiftSummary());
    this.bindDynamic();
  }

  closeSummary() {
    this.stopLivePolling();
    if (this.model.account?.role === 'barista') {
      this.model.notifyBaristaBridge('barista_logout', { archive: false });
    }
    this.view.closeModal();
    this.model.account = null;
    this.model.cart = [];
    document.getElementById('appShell').classList.add('hidden');
    document.getElementById('loginScreen').classList.remove('hidden');
  }

  primaryAction() {
    if (this.model.account.role === 'admin') {
      this.navigate('restock');
    } else if (this.model.module === 'ordering') {
      document.querySelector('[data-action="checkout"]')?.click();
    } else {
      this.model.cart = [];
      this.view.renderCart();
      this.view.toast('New POS order started');
    }
  }
}
