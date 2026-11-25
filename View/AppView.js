class AppView {
  constructor(model) {
    this.model = model;
    this._notifications = [];
  }

  money(value) { return `₱${Number(value).toFixed(2)}`; }

  toast(message) {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.classList.add('show');
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => toast.classList.remove('show'), 1800);
  }

  clock() {
    document.getElementById('clock').textContent = new Intl.DateTimeFormat('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true }).format(new Date());
  }

  // ── Notification System ───────────────────────────────────────────────
  pushNotification(type, title, body) {
    const notif = {
      id: Date.now(),
      type,          // 'order' | 'low-stock' | 'info'
      title,
      body,
      time: new Date(),
      read: false
    };
    this._notifications.unshift(notif);
    if (this._notifications.length > 50) this._notifications.length = 50;
    this._updateBell();
    this._playChime();
    return notif;
  }

  _updateBell() {
    const btn = document.querySelector('.icon-action[aria-label="Notifications"]');
    if (!btn) return;
    const unread = this._notifications.filter(n => !n.read).length;
    const badge = btn.querySelector('span');
    if (badge) {
      badge.textContent = unread > 0 ? (unread > 9 ? '9+' : String(unread)) : '';
      badge.className = unread > 0 ? 'notif-badge' : '';
    }
  }

  _playChime() {
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      [523, 659, 784].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.connect(gain); gain.connect(ctx.destination);
        osc.frequency.value = freq;
        osc.type = 'sine';
        gain.gain.setValueAtTime(0.18, ctx.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + i * 0.12 + 0.25);
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.25);
      });
    } catch (err) { /* audio blocked */ }
  }

  _escapeHtml(text) {
    return String(text ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  _closeNotificationPanel() {
    const existing = document.getElementById('notifPanel');
    if (existing) existing.remove();
    if (this._notifOutsideHandler) {
      document.removeEventListener('click', this._notifOutsideHandler);
      this._notifOutsideHandler = null;
    }
  }

  toggleNotificationPanel() {
    const existing = document.getElementById('notifPanel');
    if (existing) {
      this._closeNotificationPanel();
      return;
    }

    this._notifications.forEach(n => { n.read = true; });
    this._updateBell();

    const btn = document.querySelector('.icon-action[aria-label="Notifications"]');
    const rect = btn ? btn.getBoundingClientRect() : { right: 60, bottom: 50 };

    const panel = document.createElement('div');
    panel.id = 'notifPanel';
    panel.className = 'notif-panel';
    panel.innerHTML = `
      <div class="notif-panel-head">
        <strong>Notifications</strong>
        <button type="button" id="notifClear" ${this._notifications.length === 0 ? 'disabled' : ''}>Clear all</button>
      </div>
      <div class="notif-list">
        ${this._notifications.length === 0
          ? '<div class="notif-empty">No notifications yet.</div>'
          : this._notifications.map(n => `
            <div class="notif-item ${n.type}" ${n.type === 'order' ? 'data-notif-nav="order-queue" style="cursor:pointer"' : ''}>
              <div class="notif-icon">${n.type === 'order' ? '🛒' : n.type === 'low-stock' ? '⚠️' : 'ℹ️'}</div>
              <div class="notif-content">
                <strong>${this._escapeHtml(n.title)}</strong>
                <p>${this._escapeHtml(n.body)}</p>
                <small>${n.time.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit', hour12: true })}</small>
              </div>
            </div>`).join('')}
      </div>`;

    document.body.appendChild(panel);

    // Position below the bell button
    panel.style.top = (rect.bottom + window.scrollY + 8) + 'px';
    panel.style.right = Math.max(8, window.innerWidth - rect.right) + 'px';

    panel.querySelector('#notifClear').onclick = () => {
      this._notifications = [];
      this._updateBell();
      this._closeNotificationPanel();
    };

    panel.querySelectorAll('[data-notif-nav]').forEach(item => {
      item.onclick = () => {
        const targetModule = item.getAttribute('data-notif-nav');
        this._closeNotificationPanel();
        if (targetModule && this.model?.account?.role === 'barista') {
          const navBtn = document.querySelector(`button[data-module="${targetModule}"]`);
          if (navBtn) navBtn.click();
        }
      };
    });

    // Close on outside click
    setTimeout(() => {
      this._notifOutsideHandler = e => {
        if (!panel.contains(e.target) && (!btn || !btn.contains(e.target))) {
          this._closeNotificationPanel();
        }
      };
      document.addEventListener('click', this._notifOutsideHandler);
    }, 50);
  }

  nav(items) {
    const icons = {
      dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
      forecast: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20l5-7 4 4 9-11"/><path d="M17 6h4v4"/></svg>',
      inventory: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7.5 12 3l8 4.5v9L12 21l-8-4.5v-9Z"/><path d="m4 7.5 8 4.5 8-4.5M12 12v9"/></svg>',
      alerts: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z"/><path d="M10 21h4"/></svg>',
      restock: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 11a8 8 0 1 0-2.34 5.66"/><path d="M20 4v7h-7"/></svg>',
      'order-log': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 3h12v18H6z"/><path d="M9 7h6M9 11h6M9 15h6"/></svg>',
      backup: '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3v12"/><path d="m7 10 5 5 5-5M5 21h14"/></svg>',
      pos: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 8h10M7 12h3M14 12h3M7 16h3M14 16h3"/></svg>',
      'order-queue': '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h10"/><circle cx="19" cy="18" r="2"/></svg>',
      accounts: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="8" r="3.5"/><path d="M3 19c0-3.2 2.7-5 6-5s6 1.8 6 5"/><path d="M16 11h5M18.5 8.5v5"/></svg>',
      ordering: '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="9" cy="20" r="1.5"/><circle cx="18" cy="20" r="1.5"/><path d="M3 4h2l2.5 11h11l2-7H7"/></svg>'
    };

    document.getElementById('sideNav').innerHTML = items.map((item, index) => `
      <button class="nav-item ${index === 0 ? 'active' : ''}" type="button" data-module="${item[0]}" aria-label="${item[2]}">
        <span class="nav-icon">${icons[item[0]] || icons.dashboard}</span>
        <span class="nav-label">${item[2]}</span>
      </button>
    `).join('');
  }

  modal(title, body, variant = '') {
    if (title === 'Complete Order') {
      title = 'Confirm Payment';
      variant = 'payment-confirmation';
    }

    const modal = document.getElementById('actionModal');
    modal.innerHTML = `<div class="modal-backdrop"><div class="modal-card ${variant}"><div class="data-head"><h2>${title}</h2><button class="row-action" type="button" data-action="close">×</button></div><div class="modal-body">${body}</div></div></div>`;
    modal.classList.add('open');
  }

  closeModal() {
    const modal = document.getElementById('actionModal');
    modal.classList.remove('open');
    modal.innerHTML = '';
  }
}
