const posNav = [['dashboard','▦','Dashboard'],['pos','⊞','Order Module'],['status','◷','Status'],['logs','≡','Transaction Logs']];
const inventoryNav = [['dashboard','▦','Dashboard'],['stock','◈','Stock Monitor'],['alerts','!','Alerts'],['restock','↻','Restock'],['requests','＋','Request Stock'],['backup','↓','Backup Data']];
const orderingNav = [['dashboard','▦','Dashboard'],['menu','▤','Menu Board'],['ordering','＋','Ordering'],['cart','♢','Cart'],['status','◷','Status']];
const baristaNav = [
  ['dashboard','▦','Dashboard'],
  ['pos','⊞','POS'],
  ['ordering','＋','Ordering']
];
const products = [
  {id:1,name:'Vanilla Latte',category:'Coffee',price:150,image:'assets/2.png'},
  {id:2,name:'Caramel Machiato',category:'Coffee',price:165,image:'assets/3.png'},
  {id:3,name:'Mocha Iced',category:'Coffee',price:170,image:'assets/4.png'},
  {id:4,name:'Matcha Frappe',category:'Frappe',price:185,image:'assets/1.png'},
  {id:5,name:'Berry Refresher',category:'Refresher',price:155,image:'assets/refreshers.png'},
  {id:6,name:'Iced Americano',category:'Coffee',price:120,image:'assets/3.png'},
  {id:7,name:'Chocolate Frappe',category:'Frappe',price:180,image:'assets/4.png'},
  {id:8,name:'Strawberry Matcha',category:'Refresher',price:160,image:'assets/1.png'},
  {id:9,name:'Salted Caramel',category:'Coffee',quantity:14,minimum:5,price:175,image:'assets/2.png'}
];

let activeModule='pos';
let moduleCart=JSON.parse(localStorage.getItem('voodooModuleCart')||'[]');
const money=value=>`₱${value.toFixed(2)}`;

function toast(message){const el=document.getElementById('toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),1800);}
function updateClock(){document.getElementById('clock').textContent=new Intl.DateTimeFormat('en-PH',{hour:'numeric',minute:'2-digit',hour12:true}).format(new Date());}
function dashboardView(module){const isPos=module==='pos',isInv=module==='inventory';const metrics=isPos?[['Today\'s sales','₱12,480','+8.4%'],['Orders','86','12 pending'],['Average order','₱145.12','+3.1%'],['Transactions','64','+6 today']]:isInv?[['Stock value','₱38,920','Current value'],['Low stock','4 items','Needs attention'],['Out of stock','2 items','Urgent'],['Pending requests','3','Awaiting approval']]:[['Available menu','9 items','All categories'],['Cart items',String(moduleCart.reduce((n,x)=>n+x.quantity,0),'','Current session')],['Pending orders','12','Kitchen queue'],['Average wait','8 min','Today']];return `<div class="dashboard-grid">${metrics.map(x=>`<article class="metric-card"><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></article>`).join('')}</div><div class="dashboard-split"><section class="chart-card"><h2>${isPos?'Sales overview':isInv?'Inventory movement':'Order overview'}</h2><div class="chart-bars"><i style="height:42%"></i><i style="height:67%"></i><i style="height:54%"></i><i style="height:78%"></i><i style="height:64%"></i><i style="height:92%"></i><i style="height:72%"></i></div></section><section class="activity-card"><h2>Recent activity</h2><div class="activity-list"><div class="activity-item"><i class="activity-dot"></i><div><strong>Order #1008</strong><br><span>Added 3 items · 10:42 AM</span></div></div><div class="activity-item"><i class="activity-dot"></i><div><strong>Stock adjusted</strong><br><span>Fresh milk · 10:31 AM</span></div></div><div class="activity-item"><i class="activity-dot"></i><div><strong>Payment completed</strong><br><span>₱495.00 · 10:18 AM</span></div></div></div></section></div>`;}
function productGrid(){return `<div class="menu-grid">${products.map(p=>`<article class="product-card"><div class="product-image"><img src="${p.image}" alt="${p.name}"></div><div class="product-info"><div><h3>${p.name}</h3><p>${money(p.price)}</p></div><button class="add-button" type="button" data-product="${p.id}">＋</button></div></article>`).join('')}</div>`;}
function posView(view){if(view==='dashboard')return dashboardView('pos');if(view==='status')return `<div class="status-list">${['New','Preparing','Ready','Completed'].map((name,i)=>`<section class="status-column"><h3>${name}</h3>${i<3?`<article class="status-ticket"><strong>#100${8-i}</strong><span>${i===0?'3 items':i===1?'Vanilla Latte × 2':'Matcha Frappe × 1'}</span></article>`:''}</section>`).join('')}</div>`;if(view==='logs')return `<div class="data-card" style="margin:24px 28px"><div class="data-head"><h2>Transaction logs</h2><button>Export</button></div><div class="table-wrap"><table><thead><tr><th>Reference</th><th>Cashier</th><th>Method</th><th>Amount</th><th>Time</th></tr></thead><tbody><tr><td>#TX-1008</td><td>Admin</td><td>Cash</td><td><strong>₱495.00</strong></td><td>10:42 AM</td></tr><tr><td>#TX-1007</td><td>Admin</td><td>Card</td><td><strong>₱820.00</strong></td><td>10:31 AM</td></tr></tbody></table></div></div>`;return `<div class="pos-layout"><section class="catalog-panel"><div class="catalog-toolbar"><label class="search"><span>⌕</span><input type="search" placeholder="Search menu"></label></div>${productGrid()}</section><aside class="order-panel"><div class="order-heading"><div><p>Current order</p><h2>Order <span>#1008</span></h2></div><button id="clearCart" type="button">Clear</button></div><div class="order-meta"><button class="meta-active">Dine in</button><button>Take out</button></div><div class="cart-items" id="posCart"></div><div class="order-total"><div><span>Subtotal</span><strong id="subtotal">₱0.00</strong></div><div><span>Tax</span><strong id="tax">₱0.00</strong></div><div class="grand-total"><span>Total</span><strong id="grandTotal">₱0.00</strong></div><button class="charge-button" id="chargeButton"><span>Charge</span><strong id="chargeTotal">₱0.00</strong></button></div></aside></div>`;}
function inventoryView(view){if(view==='dashboard')return dashboardView('inventory');if(view==='alerts')return `<div class="alert-grid"><article class="alert-card warning"><strong>Fresh Milk — 6 L remaining</strong><p>Below minimum stock level of 8 L.</p></article><article class="alert-card"><strong>Disposable Cups — Out of stock</strong><p>Immediate restock is recommended.</p></article><article class="alert-card warning"><strong>Matcha Powder — 2 kg remaining</strong><p>Submit a stock request.</p></article></div>`;if(view==='restock'||view==='requests')return `<div class="restock-grid"><section class="form-card"><h2>${view==='restock'?'Create restock entry':'Request stock'}</h2><form class="form-grid"><label>Item<select><option>Fresh Milk</option><option>Matcha Powder</option><option>Disposable Cups</option></select></label><label>Quantity<input type="number" value="10"></label><label>Unit<select><option>Pieces</option><option>Liters</option><option>Kilograms</option></select></label><label>Supplier<input value="Voodoo Supply Co."></label><button class="primary-action" type="button" id="submitStock">Submit</button></form></section><section class="form-card"><h2>Recent entries</h2><p>Fresh Milk · +12 L · Approved</p><p>Arabica Beans · +5 kg · Completed</p><p>Cup Lids · +300 pcs · Requested</p></section></div>`;if(view==='backup')return `<div class="inventory-header"><div class="inventory-stats"><article><span>Last backup</span><strong>Today</strong></article><article><span>Backup size</span><strong>12.4 MB</strong></article><article><span>Retention</span><strong>30 days</strong></article></div><button class="primary-action" id="backupButton">↓ Create Backup</button></div>`;const rows=[['Arabica Coffee Beans','Ingredients','18 kg','₱420','In stock'],['Fresh Milk','Ingredients','6 L','₱95','Low stock'],['Matcha Powder','Ingredients','2 kg','₱780','Low stock'],['Disposable Cups','Supplies','0 pcs','₱8.50','Out of stock']];return `<div class="inventory-tools"><label class="search"><span>⌕</span><input type="search" placeholder="Search inventory"></label><div class="module-actions"><button class="secondary-action">Import</button><button class="primary-action">＋ Add Item</button></div></div><div class="data-card"><div class="data-head"><h2>Stock inventory</h2></div><div class="table-wrap"><table><thead><tr><th>Item</th><th>Category</th><th>In stock</th><th>Unit cost</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${r[0]}</strong></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td><span class="${r[4]==='Low stock'?'stock-low':r[4]==='Out of stock'?'stock-out':''}">${r[4]}</span></td><td><button class="row-action">Manage</button></td></tr>`).join('')}</tbody></table></div></div>`;}
function orderingView(view){if(view==='dashboard')return dashboardView('ordering');if(view==='status')return `<div class="status-list"><section class="status-column"><h3>Preparing</h3><article class="status-ticket"><strong>#1008</strong><span>Vanilla Latte · 3 items</span></article></section><section class="status-column"><h3>Ready</h3><article class="status-ticket"><strong>#1007</strong><span>Berry Refresher · 5 items</span></article></section><section class="status-column"><h3>Completed</h3></section><section class="status-column"><h3>Cancelled</h3></section></div>`;if(view==='cart')return `<div class="restock-grid"><section class="form-card"><h2>Your cart</h2><div id="kioskCartItems"></div></section><section class="form-card"><h2>Order summary</h2><div class="subtotal"><span>Total</span><strong id="kioskTotal">₱0.00</strong></div><button class="charge-button" id="kioskCheckout"><span>Place order</span><strong>→</strong></button></div></div>`;return `<div class="ordering-layout"><section class="catalog-panel"><div class="kiosk-hero"><p>Voodoo eSports Café</p><h2>Fuel your game</h2><p>Fresh drinks, bold flavors, fast service</p></div><div class="catalog-toolbar"><label class="search"><span>⌕</span><input type="search" placeholder="Search menu"></label></div>${productGrid()}</section><aside class="kiosk-cart"><div class="order-heading"><div><p>Your order</p><h2>Cart</h2></div></div><div id="kioskSideCart" class="cart-items"></div><div class="order-total"><div class="grand-total"><span>Total</span><strong id="kioskSideTotal">₱0.00</strong></div><button class="charge-button" id="kioskSideCheckout"><span>Checkout</span><strong>→</strong></button></div></aside></div>`;}

function renderCart(){const subtotal=moduleCart.reduce((n,x)=>n+x.price*x.quantity,0),tax=subtotal*.12,total=subtotal+tax;const html=moduleCart.length?moduleCart.map(x=>`<div class="cart-item"><img src="${x.image}" alt=""><div><h4>${x.name}</h4><small>${money(x.price)}</small></div><div class="quantity"><button data-cart-minus="${x.id}">−</button><span>${x.quantity}</span><button data-cart-plus="${x.id}">＋</button></div></div>`).join(''):'<div class="empty-cart">Your cart is empty.</div>';['posCart','kioskSideCart','kioskCartItems'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=html;});[['subtotal',subtotal],['tax',tax],['grandTotal',total],['chargeTotal',total],['kioskTotal',total],['kioskSideTotal',total]].forEach(([id,value])=>{const el=document.getElementById(id);if(el)el.textContent=money(value);});localStorage.setItem('voodooModuleCart',JSON.stringify(moduleCart));}
function bindViewEvents(){const inventorySearch=document.getElementById('productInventorySearch');if(inventorySearch)inventorySearch.addEventListener('input',event=>{const rows=document.getElementById('productInventoryRows');if(rows)rows.innerHTML=productInventoryRows(event.target.value);});document.querySelectorAll('[data-product]').forEach(b=>b.onclick=()=>{const p=products.find(x=>x.id===Number(b.dataset.product));const x=moduleCart.find(y=>y.id===p.id);x?x.quantity++:moduleCart.push({...p,quantity:1});renderCart();toast(`${p.name} added`);});document.querySelectorAll('[data-cart-plus],[data-cart-minus]').forEach(b=>b.onclick=()=>{const id=Number(b.dataset.cartPlus||b.dataset.cartMinus),x=moduleCart.find(y=>y.id===id);if(!x)return;x.quantity+=b.dataset.cartPlus?1:-1;if(x.quantity<=0)moduleCart=moduleCart.filter(y=>y.id!==id);renderCart();});document.getElementById('clearCart')?.addEventListener('click',()=>{moduleCart=[];renderCart();});document.getElementById('chargeButton')?.addEventListener('click',()=>moduleCart.length?toast('Payment window ready'):toast('Add items before charging'));document.getElementById('kioskSideCheckout')?.addEventListener('click',()=>moduleCart.length?toast('Order placed successfully'):toast('Your cart is empty'));document.getElementById('kioskCheckout')?.addEventListener('click',()=>moduleCart.length?toast('Order placed successfully'):toast('Your cart is empty'));document.getElementById('submitStock')?.addEventListener('click',()=>toast('Stock entry submitted'));document.getElementById('backupButton')?.addEventListener('click',()=>toast('Backup created successfully'));}
function renderModule(view){document.getElementById('viewContainer').innerHTML=`<section class="module-view">${activeModule==='pos'?posView(view):activeModule==='inventory'?inventoryView(view):orderingView(view)}</section>`;bindViewEvents();renderCart();}
function enterModule(module){activeModule=module;document.getElementById('loginScreen').classList.add('hidden');document.getElementById('appShell').classList.remove('hidden');const nav=module==='pos'?posNav:module==='inventory'?inventoryNav:orderingNav;document.getElementById('sideNav').innerHTML=nav.map((x,i)=>`<button class="nav-item ${i===0?'active':''}" type="button" data-nav="${x[0]}" data-label="${x[2]}"><span class="nav-icon">${x[1]}</span><span>${x[2]}</span></button>`).join('');document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-nav]').forEach(x=>x.classList.remove('active'));b.classList.add('active');document.getElementById('pageLabel').textContent=module==='ordering'?'Ordering system':module==='inventory'?'Inventory management':'Point of sale';document.getElementById('pageTitle').textContent=b.dataset.label;renderModule(b.dataset.nav);});document.getElementById('primaryAction').textContent=module==='inventory'?'+ Add Stock':module==='ordering'?'+ Place Order':'＋ New Order';document.querySelector('[data-nav="dashboard"]').click();updateClock();}
function enterBaristaSession() {
  document.getElementById('loginScreen').classList.add('hidden');
  document.getElementById('appShell').classList.remove('hidden');
  document.getElementById('staffName').textContent = 'Barista';
  document.querySelector('.avatar').textContent = 'B';
  document.getElementById('pageLabel').textContent = 'Barista workspace';

  document.getElementById('sideNav').innerHTML = baristaNav.map((item, index) =>
    `<button class="nav-item ${index === 0 ? 'active' : ''}" type="button" data-barista-module="${item[0]}" data-label="${item[2]}">
      <span class="nav-icon">${item[1]}</span><span>${item[2]}</span>
    </button>`).join('');

  document.querySelectorAll('[data-barista-module]').forEach(button => {
    button.onclick = () => {
      document.querySelectorAll('[data-barista-module]').forEach(item => item.classList.remove('active'));
      button.classList.add('active');
      activeModule = button.dataset.baristaModule;
      document.getElementById('pageTitle').textContent = button.dataset.label;
      if (activeModule === 'dashboard') {
        activeModule = 'pos';
        document.getElementById('primaryAction').textContent = '＋ New Order';
        renderModule('dashboard');
      } else {
        document.getElementById('primaryAction').textContent = activeModule === 'ordering' ? '+ Place Order' : '＋ New Order';
        renderModule(activeModule);
      }
    };
  });

  document.querySelector('[data-barista-module]').click();
  updateClock();
}
document.getElementById('togglePassword').addEventListener('click',()=>{const p=document.getElementById('password');p.type=p.type==='password'?'text':'password';});
document.getElementById('logoutButton').addEventListener('click',()=>{document.getElementById('appShell').classList.add('hidden');document.getElementById('loginScreen').classList.remove('hidden');});
const productInventory = [
  {name:'Vanilla Latte',category:'Coffee',quantity:18,minimum:5,price:150,image:'assets/2.png'},
  {name:'Caramel Machiato',category:'Coffee',quantity:12,minimum:5,price:165,image:'assets/3.png'},
  {name:'Mocha Iced',category:'Coffee',quantity:9,minimum:5,price:170,image:'assets/4.png'},
  {name:'Matcha Frappe',category:'Frappe',quantity:4,minimum:5,price:185,image:'assets/1.png'},
  {name:'Berry Refresher',category:'Refresher',quantity:3,minimum:5,price:155,image:'assets/refreshers.png'},
  {name:'Iced Americano',category:'Coffee',quantity:22,minimum:5,price:120,image:'assets/3.png'},
  {name:'Chocolate Frappe',category:'Frappe',quantity:8,minimum:5,price:180,image:'assets/4.png'},
  {name:'Strawberry Matcha',category:'Refresher',quantity:0,minimum:5,price:160,image:'assets/1.png'},
  {name:'Salted Caramel',category:'Coffee',quantity:14,minimum:5,price:175,image:'assets/2.png'}
];

function productInventoryRows(query = '') {
  return productInventory
    .filter(item => (item.name + ' ' + item.category).toLowerCase().includes(query.toLowerCase()))
    .map(item => {
      const status = item.quantity === 0 ? 'Out of stock' : item.quantity <= item.minimum ? 'Low stock' : 'In stock';
      const statusClass = status === 'Out of stock' ? 'stock-out' : status === 'Low stock' ? 'stock-low' : '';
      return `<tr><td><strong>${item.name}</strong></td><td>${item.category}</td><td>${item.quantity} cups</td><td>${money(item.price)}</td><td><span class="${statusClass}">${status}</span></td><td><button class="row-action">Manage</button></td></tr>`;
    }).join('');
}

function inventoryView(view) {
  if (view === 'dashboard') return dashboardView('inventory');
  if (view === 'alerts') {
    const low = productInventory.filter(item => item.quantity <= item.minimum);
    return `<div class="alert-grid">${low.map(item => `<article class="alert-card ${item.quantity ? 'warning' : ''}"><strong>${item.name} — ${item.quantity ? item.quantity + ' cups remaining' : 'Out of stock'}</strong><p>${item.quantity ? 'Below minimum stock level.' : 'Immediate restock is required.'}</p></article>`).join('')}</div>`;
  }
  if (view === 'restock' || view === 'requests') {
    const options = productInventory.map(item => `<option>${item.name}</option>`).join('');
    return `<div class="restock-grid"><section class="form-card"><h2>${view === 'restock' ? 'Create product restock' : 'Request product stock'}</h2><form class="form-grid"><label>Product<select>${options}</select></label><label>Quantity (cups)<input type="number" value="10" min="1"></label><label>Reason<select><option>New batch</option><option>Low stock replenishment</option></select></label><label>Reference<input value="POS-${new Date().toISOString().slice(0,10)}"></label><button class="primary-action" type="button" id="submitStock">Submit</button></form></section><section class="form-card"><h2>Recent product movements</h2><p>Matcha Frappe · +8 cups · Approved</p><p>Strawberry Matcha · 0 cups · Out of stock</p><p>Vanilla Latte · -3 cups · Sold</p></section></div>`;
  }
  if (view === 'backup') return `<div class="inventory-header"><div class="inventory-stats"><article><span>Last backup</span><strong>Today</strong></article><article><span>Product data</span><strong>${productInventory.length} items</strong></article><article><span>Retention</span><strong>30 days</strong></article></div><button class="primary-action" id="backupButton">↓ Create Backup</button></div>`;
  return `<div class="inventory-tools"><label class="search"><span>⌕</span><input type="search" id="productInventorySearch" placeholder="Search product inventory"></label><div class="module-actions"><button class="secondary-action">Export</button><button class="primary-action">＋ Add Product</button></div></div><div class="data-card"><div class="data-head"><h2>Product inventory</h2></div><div class="table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Available</th><th>Selling price</th><th>Stock status</th><th>Action</th></tr></thead><tbody id="productInventoryRows">${productInventoryRows()}</tbody></table></div></div>`;}

// Account and privilege configuration
const accounts = {
  admin: {username: 'admin', password: 'admin', name: 'Admin', allowed: ['inventory']},
  barista: {username: 'barista', password: 'barista', name: 'Barista', allowed: ['pos', 'ordering']}
};

const originalEnterModule = enterModule;
enterModule = function (module) {
  const accountKey = document.getElementById('loginAccount')?.value || 'admin';
  if (!accounts[accountKey].allowed.includes(module)) {
    toast(accountKey === 'barista' ? 'Inventory access is restricted to Admin.' : 'You cannot access this module.');
    return false;
  }
  document.getElementById('staffName').textContent = accounts[accountKey].name;
  document.querySelector('.avatar').textContent = accounts[accountKey].name.charAt(0);
  return originalEnterModule(module);
};

function validateLogin(accountKey, username, password) {
  const account = accounts[accountKey];
  return account && username.trim().toLowerCase() === account.username && password === account.password;
}

const originalLoginForm = document.getElementById('loginForm');
originalLoginForm.addEventListener('submit', function (event) {
  event.preventDefault();
  event.stopImmediatePropagation();
  const accountKey = document.getElementById('loginAccount').value;
  const username = document.getElementById('username').value;
  const password = document.getElementById('password').value;

  if (validateLogin(accountKey, username, password)) {
    if (accountKey === 'admin') enterModule('inventory');
    else enterBaristaSession();
  } else {
    toast('Invalid username or password.');
  }
});

function requireInventoryAccess() {
  const accountKey = document.getElementById('loginAccount')?.value || 'admin';
  if (accountKey !== 'admin') {
    toast('Inventory access is restricted to Admin.');
    return false;
  }
  return true;
}

document.getElementById('loginAccount').addEventListener('change', function () {
  const hint = document.getElementById('accountHint');
  const username = document.getElementById('username');
  const password = document.getElementById('password');
  const selected = this.value;
  hint.textContent = selected === 'admin' ? 'Admin: admin / admin' : 'Barista: barista / barista';
  username.value = selected;
  password.value = selected;
});
