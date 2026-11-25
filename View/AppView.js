class AppView {
  constructor(model) { this.model = model; }

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

  nav(items) {
    const icons = {
      dashboard: '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
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
