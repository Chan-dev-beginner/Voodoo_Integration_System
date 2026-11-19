// POS menu source. Product images use the Voodoo assets in this folder.
const menu = [
  { id: 1, name: 'Vanilla Latte', category: 'coffee', price: 150, description: 'Espresso, milk, vanilla', image: 'assets/2.png' },
  { id: 2, name: 'Caramel Machiato', category: 'coffee', price: 165, description: 'Espresso, caramel, milk', image: 'assets/3.png' },
  { id: 3, name: 'Mocha Iced', category: 'coffee', price: 170, description: 'Chocolate, espresso, ice', image: 'assets/4.png' },
  { id: 4, name: 'Matcha Frappe', category: 'frappe', price: 185, description: 'Matcha, milk, cream', image: 'assets/1.png' },
  { id: 5, name: 'Berry Refresher', category: 'refresher', price: 155, description: 'Berry blend, citrus, ice', image: 'assets/refreshers.png' },
  { id: 6, name: 'Iced Americano', category: 'coffee', price: 120, description: 'Espresso and chilled water', image: 'assets/3.png' },
  { id: 7, name: 'Chocolate Frappe', category: 'frappe', price: 180, description: 'Chocolate, milk, ice', image: 'assets/4.png' },
  { id: 8, name: 'Strawberry Matcha', category: 'refresher', price: 160, description: 'Strawberry, matcha, milk', image: 'assets/1.png' },
  { id: 9, name: 'Salted Caramel', category: 'coffee', price: 175, description: 'Espresso, caramel, cream', image: 'assets/2.png' }
];

// Database-ready menu source. Replace this array or the menuUrl fetch with a PHP/API response.
const menuUrl = null; // Example: 'api/menu.php'

const orders = [
  ['#1008', 'Walk-in Customer', 'Dine in', '3', '₱495.00', 'pending', '10:42 AM'],
  ['#1007', 'Miguel Santos', 'Take out', '5', '₱820.00', 'done', '10:31 AM'],
  ['#1006', 'Andrea Cruz', 'Dine in', '2', '₱310.00', 'done', '10:18 AM'],
  ['#1005', 'Walk-in Customer', 'Take out', '4', '₱640.00', 'done', '9:56 AM'],
  ['#1004', 'John Reyes', 'Dine in', '2', '₱335.00', 'pending', '9:44 AM']
];

const inventory = [
  ['Arabica Coffee Beans', 'Ingredients', '18 kg', '₱420.00', 'In stock'],
  ['Fresh Milk', 'Ingredients', '6 L', '₱95.00', 'Low stock'],
  ['Matcha Powder', 'Ingredients', '2 kg', '₱780.00', 'Low stock'],
  ['Chocolate Syrup', 'Ingredients', '12 bottles', '₱185.00', 'In stock'],
  ['Strawberry Syrup', 'Ingredients', '1 bottle', '₱175.00', 'Low stock'],
  ['Disposable Cups', 'Supplies', '0 pcs', '₱8.50', 'Out of stock'],
  ['Cup Lids', 'Supplies', '240 pcs', '₱3.00', 'In stock']
];

let cart = JSON.parse(localStorage.getItem('voodooPosCart') || '[]');
let activeCategory = 'all';

const pesos = value => `₱${value.toFixed(2)}`;
const menuGrid = document.getElementById('menuGrid');
const cartItems = document.getElementById('cartItems');

function renderMenu() {
  const search = document.getElementById('menuSearch').value.trim().toLowerCase();
  const visible = menu.filter(item =>
    (activeCategory === 'all' || item.category === activeCategory) &&
    item.name.toLowerCase().includes(search)
  );
  menuGrid.innerHTML = visible.map(item => `
    <article class="product-card">
      <div class="product-image"><img src="${item.image}" alt="${item.name}" loading="lazy"></div>
      <div class="product-info"><div><h3>${item.name}</h3><p>${pesos(item.price)}</p></div>
        <button class="add-button" type="button" data-id="${item.id}" aria-label="Add ${item.name}">＋</button>
      </div>
    </article>`).join('') || '<p>No menu items found.</p>';
}

function saveCart() { localStorage.setItem('voodooPosCart', JSON.stringify(cart)); }

function addToCart(id) {
  const item = menu.find(product => product.id === Number(id));
  if (!item) return;
  const existing = cart.find(product => product.id === item.id);
  existing ? existing.quantity++ : cart.push({ ...item, quantity: 1 });
  saveCart(); renderCart(); showToast(`${item.name} added to order`);
}

function changeQuantity(id, amount) {
  const item = cart.find(product => product.id === Number(id));
  if (!item) return;
  item.quantity += amount;
  if (item.quantity <= 0) cart = cart.filter(product => product.id !== Number(id));
  saveCart(); renderCart();
}

function renderCart() {
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const tax = subtotal * 0.12;
  const total = subtotal + tax;
  cartItems.innerHTML = cart.length ? cart.map(item => `
    <div class="cart-item"><img src="${item.image}" alt="">
      <div><h4>${item.name}</h4><small>${pesos(item.price)}</small></div>
      <div class="quantity"><button type="button" data-action="minus" data-id="${item.id}">−</button>
        <span>${item.quantity}</span><button type="button" data-action="plus" data-id="${item.id}">＋</button>
      </div></div>`).join('') : '<div class="empty-cart">Select a menu item<br>to start an order.</div>';
  document.getElementById('subtotal').textContent = pesos(subtotal);
  document.getElementById('tax').textContent = pesos(tax);
  document.getElementById('grandTotal').textContent = pesos(total);
  document.getElementById('chargeTotal').textContent = pesos(total);
}

function renderOrders() {
  document.getElementById('ordersTable').innerHTML = orders.map(order => `
    <tr><td><strong>${order[0]}</strong></td><td>${order[1]}</td><td>${order[2]}</td><td>${order[3]} items</td>
    <td><strong>${order[4]}</strong></td><td><span class="status ${order[5]}">${order[5]}</span></td><td>${order[6]}</td></tr>`).join('');
}

function renderInventory(query = '') {
  const rows = inventory.filter(row => row.join(' ').toLowerCase().includes(query.toLowerCase()));
  document.getElementById('inventoryTable').innerHTML = rows.map(row => {
    const statusClass = row[4] === 'Low stock' ? 'stock-low' : row[4] === 'Out of stock' ? 'stock-out' : '';
    return `<tr><td><strong>${row[0]}</strong></td><td>${row[1]}</td><td>${row[2]}</td><td>${row[3]}</td>
      <td><span class="${statusClass}">${row[4]}</span></td><td><button class="row-action" type="button">Manage</button></td></tr>`;
  }).join('');
}

function showToast(message) {
  const toast = document.getElementById('toast');
  toast.textContent = message; toast.classList.add('show');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.remove('show'), 1800);
}

function updateClock() {
  document.getElementById('clock').textContent = new Intl.DateTimeFormat('en-PH', {
    hour: 'numeric', minute: '2-digit', hour12: true
  }).format(new Date());
}

menuGrid.addEventListener('click', event => {
  const button = event.target.closest('.add-button');
  if (button) addToCart(button.dataset.id);
});
cartItems.addEventListener('click', event => {
  const button = event.target.closest('[data-action]');
  if (button) changeQuantity(button.dataset.id, button.dataset.action === 'plus' ? 1 : -1);
});

document.querySelectorAll('.nav-item').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.nav-item').forEach(item => item.classList.remove('active'));
  button.classList.add('active'); document.querySelectorAll('.view').forEach(view => view.classList.remove('active'));
  const view = button.dataset.view; document.getElementById(`${view}View`).classList.add('active');
  const titles = { pos: ['Point of sale', 'POS'], orders: ['Sales and transactions', 'Orders'], inventory: ['Stock management', 'Inventory'] };
  document.getElementById('pageLabel').textContent = titles[view][0];
  document.getElementById('pageTitle').textContent = titles[view][1];
}));

document.querySelectorAll('.category-tabs button').forEach(button => button.addEventListener('click', () => {
  document.querySelectorAll('.category-tabs button').forEach(item => item.classList.remove('active'));
  button.classList.add('active'); activeCategory = button.dataset.category; renderMenu();
}));

document.getElementById('menuSearch').addEventListener('input', renderMenu);
document.getElementById('inventorySearch').addEventListener('input', event => renderInventory(event.target.value));
document.getElementById('clearCart').addEventListener('click', () => { cart = []; saveCart(); renderCart(); showToast('Order cleared'); });
document.getElementById('chargeButton').addEventListener('click', () => {
  if (!cart.length) return showToast('Add items before charging');
  showToast('Payment window ready');
});
document.getElementById('newOrder').addEventListener('click', () => {
  cart = []; saveCart(); renderCart(); document.querySelector('[data-view="pos"]').click(); showToast('New order started');
});
document.getElementById('addItem').addEventListener('click', () => showToast('Add inventory item'));

/* Legacy customer-facing application is retained below for reference. */

/* MODULE_APPLICATION_START */

const posNav = [
  ['dashboard','▦','Dashboard'],['pos','⊞','Order Module'],['status','◷','Status'],['logs','≡','Transaction Logs']
];
const inventoryNav = [
  ['dashboard','▦','Dashboard'],['stock','◈','Stock Monitor'],['alerts','!','Alerts'],['restock','↻','Restock'],['requests','＋','Request Stock'],['backup','↓','Backup Data']
];
const orderingNav = [
  ['dashboard','▦','Dashboard'],['menu','▤','Menu Board'],['ordering','＋','Ordering'],['cart','♢','Cart'],['status','◷','Status']
];

const products = [
  {id:1,name:'Vanilla Latte',category:'Coffee',price:150,image:'assets/2.png',stock:18},
  {id:2,name:'Caramel Machiato',category:'Coffee',price:165,image:'assets/3.png',stock:12},
  {id:3,name:'Mocha Iced',category:'Coffee',price:170,image:'assets/4.png',stock:9},
  {id:4,name:'Matcha Frappe',category:'Frappe',price:185,image:'assets/1.png',stock:7},
  {id:5,name:'Berry Refresher',category:'Refresher',price:155,image:'assets/refreshers.png',stock:5},
  {id:6,name:'Iced Americano',category:'Coffee',price:120,image:'assets/3.png',stock:22},
  {id:7,name:'Chocolate Frappe',category:'Frappe',price:180,image:'assets/4.png',stock:8},
  {id:8,name:'Strawberry Matcha',category:'Refresher',price:160,image:'assets/1.png',stock:3},
  {id:9,name:'Salted Caramel',category:'Coffee',price:175,image:'assets/2.png',stock:14}
];

let activeModule = 'pos';
let cart = JSON.parse(localStorage.getItem('voodooCart') || '[]');
const money = value => `₱${value.toFixed(2)}`;

function toast(message){
  const el=document.getElementById('toast');el.textContent=message;el.classList.add('show');clearTimeout(toast.timer);toast.timer=setTimeout(()=>el.classList.remove('show'),1800);
}

function clock(){document.getElementById('clock').textContent=new Intl.DateTimeFormat('en-PH',{hour:'numeric',minute:'2-digit',hour12:true}).format(new Date());}

function metricCards(items){return `<div class="dashboard-grid">${items.map(x=>`<article class="metric-card"><span>${x.label}</span><strong>${x.value}</strong><small>${x.note}</small></article>`).join('')}</div>`;}

function dashboardView(module){
  const pos=module==='pos', inv=module==='inventory';
  const metrics=pos?
    [{label:"Today's sales",value:'₱12,480',note:'+8.4%'},{label:'Orders',value:'86',note:'12 pending'},{label:'Average order',value:'₱145.12',note:'+3.1%'},{label:'Transactions',value:'64',note:'+6 today'}]:
    inv?[{label:'Stock value',value:'₱38,920',note:'Current value'},{label:'Low stock',value:'4 items',note:'Needs attention'},{label:'Out of stock',value:'2 items',note:'Urgent'},{label:'Pending requests',value:'3',note:'Awaiting approval'}]:
    [{label:'Available menu',value:'9 items',note:'All categories'},{label:'Cart items',value:String(cart.reduce((n,x)=>n+x.quantity,0)),note:'Current session'},{label:'Pending orders',value:'12',note:'Kitchen queue'},{label:'Average wait',value:'8 min',note:'Today'}];
  return `${metricCards(metrics)}<div class="dashboard-split"><section class="chart-card"><h2>${pos?'Sales overview':inv?'Inventory movement':'Order overview'}</h2><div class="chart-bars"><i style="height:42%"></i><i style="height:67%"></i><i style="height:54%"></i><i style="height:78%"></i><i style="height:64%"></i><i style="height:92%"></i><i style="height:72%"></i></div></section><section class="activity-card"><h2>Recent activity</h2><div class="activity-list"><div class="activity-item"><i class="activity-dot"></i><div><strong>Order #1008</strong><br><span>Added 3 items · 10:42 AM</span></div></div><div class="activity-item"><i class="activity-dot"></i><div><strong>Stock adjusted</strong><br><span>Fresh milk · 10:31 AM</span></div></div><div class="activity-item"><i class="activity-dot"></i><div><strong>Payment completed</strong><br><span>₱495.00 · 10:18 AM</span></div></div></div></section></div>`;
}

function productGrid(){
  return `<div class="menu-grid">${products.map(p=>`<article class="product-card"><div class="product-image"><img src="${p.image}" alt="${p.name}"></div><div class="product-info"><div><h3>${p.name}</h3><p>${money(p.price)}</p></div><button class="add-button" type="button" data-product="${p.id}">＋</button></div></article>`).join('')}</div>`;
}

function posView(view){
  if(view==='dashboard')return dashboardView('pos');
  if(view==='status')return `<div class="status-list">${['New','Preparing','Ready','Completed'].map((name,i)=>`<section class="status-column"><h3>${name}</h3>${(i<3?`<article class="status-ticket"><strong>#100${8-i}</strong><span>${i===0?'3 items':i===1?'Vanilla Latte × 2':'Matcha Frappe × 1'}</span></article>`:'')}</section>`).join('')}</div>`;
  if(view==='logs')return `<div class="data-card" style="margin:24px 28px"><div class="data-head"><h2>Transaction logs</h2><button>Export</button></div><div class="table-wrap"><table><thead><tr><th>Reference</th><th>Cashier</th><th>Method</th><th>Amount</th><th>Time</th></tr></thead><tbody><tr><td>#TX-1008</td><td>Admin</td><td>Cash</td><td><strong>₱495.00</strong></td><td>10:42 AM</td></tr><tr><td>#TX-1007</td><td>Admin</td><td>Card</td><td><strong>₱820.00</strong></td><td>10:31 AM</td></tr></tbody></table></div></div>`;
  return `<div class="pos-layout"><section class="catalog-panel"><div class="catalog-toolbar"><label class="search"><span>⌕</span><input id="menuSearch" type="search" placeholder="Search menu"></label></div>${productGrid()}</section><aside class="order-panel"><div class="order-heading"><div><p>Current order</p><h2>Order <span>#1008</span></h2></div><button id="clearCart" type="button">Clear</button></div><div class="order-meta"><button class="meta-active">Dine in</button><button>Take out</button></div><div class="cart-items" id="posCart"></div><div class="order-total"><div><span>Subtotal</span><strong id="subtotal">₱0.00</strong></div><div><span>Tax</span><strong id="tax">₱0.00</strong></div><div class="grand-total"><span>Total</span><strong id="grandTotal">₱0.00</strong></div><button class="charge-button" id="chargeButton"><span>Charge</span><strong id="chargeTotal">₱0.00</strong></button></div></aside></div>`;
}

function inventoryView(view){
  if(view==='dashboard')return dashboardView('inventory');
  if(view==='alerts')return `<div class="alert-grid"><article class="alert-card warning"><strong>Fresh Milk — 6 L remaining</strong><p>Below minimum stock level of 8 L.</p></article><article class="alert-card"><strong>Disposable Cups — Out of stock</strong><p>Immediate restock is recommended.</p></article><article class="alert-card warning"><strong>Matcha Powder — 2 kg remaining</strong><p>Submit a request stock before Friday.</p></article></div>`;
  if(view==='restock'||view==='requests')return `<div class="restock-grid"><section class="form-card"><h2>${view==='restock'?'Create restock entry':'Request stock'}</h2><form class="form-grid"><label>Item<select><option>Fresh Milk</option><option>Matcha Powder</option><option>Disposable Cups</option></select></label><label>Quantity<input type="number" value="10"></label><label>Unit<select><option>Pieces</option><option>Liters</option><option>Kilograms</option></select></label><label>Supplier<input value="Voodoo Supply Co."></label><button class="primary-action" type="button" id="submitStock">Submit</button></form></section><section class="form-card"><h2>Recent entries</h2><p>Fresh Milk · +12 L · Approved</p><p>Arabica Beans · +5 kg · Completed</p><p>Cup Lids · +300 pcs · Requested</p></section></div>`;
  if(view==='backup')return `<div class="inventory-header"><div class="inventory-stats"><article><span>Last backup</span><strong>Today</strong></article><article><span>Backup size</span><strong>12.4 MB</strong></article><article><span>Retention</span><strong>30 days</strong></article></div><button class="primary-action" id="backupButton">↓ Create Backup</button></div>`;
  const rows=[['Arabica Coffee Beans','Ingredients','18 kg','₱420','In stock'],['Fresh Milk','Ingredients','6 L','₱95','Low stock'],['Matcha Powder','Ingredients','2 kg','₱780','Low stock'],['Disposable Cups','Supplies','0 pcs','₱8.50','Out of stock']];
  return `<div class="inventory-tools"><label class="search"><span>⌕</span><input type="search" id="inventorySearch" placeholder="Search inventory"></label><div class="module-actions"><button class="secondary-action">Import</button><button class="primary-action">＋ Add Item</button></div></div><div class="data-card"><div class="data-head"><h2>Stock inventory</h2></div><div class="table-wrap"><table><thead><tr><th>Item</th><th>Category</th><th>In stock</th><th>Unit cost</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows.map(r=>`<tr><td><strong>${r[0]}</strong></td><td>${r[1]}</td><td>${r[2]}</td><td>${r[3]}</td><td><span class="${r[4]==='Low stock'?'stock-low':r[4]==='Out of stock'?'stock-out':''}">${r[4]}</span></td><td><button class="row-action">Manage</button></td></tr>`).join('')}</tbody></table></div></div>`;
}

function orderingView(view){
  if(view==='dashboard')return dashboardView('ordering');
  if(view==='status')return `<div class="status-list"><section class="status-column"><h3>Preparing</h3><article class="status-ticket"><strong>#1008</strong><span>Vanilla Latte · 3 items</span></article></section><section class="status-column"><h3>Ready</h3><article class="status-ticket"><strong>#1007</strong><span>Berry Refresher · 5 items</span></article></section><section class="status-column"><h3>Completed</h3></section><section class="status-column"><h3>Cancelled</h3></section></div>`;
  if(view==='cart')return `<div class="restock-grid"><section class="form-card"><h2>Your cart</h2><div id="kioskCartItems"></div></section><section class="form-card"><h2>Order summary</h2><div class="subtotal"><span>Total</span><strong id="kioskTotal">₱0.00</strong></div><button class="charge-button" id="kioskCheckout"><span>Place order</span><strong>→</strong></button></div></div>`;
  return `<div class="ordering-layout"><section class="catalog-panel"><div class="kiosk-hero"><p>Voodoo eSports Café</p><h2>Fuel your game</h2><p>Fresh drinks, bold flavors, fast service</p></div><div class="catalog-toolbar"><label class="search"><span>⌕</span><input type="search" placeholder="Search menu"></label></div>${productGrid()}</section><aside class="kiosk-cart"><div class="order-heading"><div><p>Your order</p><h2>Cart</h2></div></div><div id="kioskSideCart" class="cart-items"></div><div class="order-total"><div class="grand-total"><span>Total</span><strong id="kioskSideTotal">₱0.00</strong></div><button class="charge-button" id="kioskSideCheckout"><span>Checkout</span><strong>→</strong></button></div></aside></div>`;
}

function renderCart(){
  const subtotal=cart.reduce((n,x)=>n+x.price*x.quantity,0),tax=subtotal*.12,total=subtotal+tax;
  const html=cart.length?cart.map(x=>`<div class="cart-item"><img src="${x.image}" alt=""><div><h4>${x.name}</h4><small>${money(x.price)}</small></div><div class="quantity"><button data-cart-minus="${x.id}">−</button><span>${x.quantity}</span><button data-cart-plus="${x.id}">＋</button></div></div>`).join(''):'<div class="empty-cart">Your cart is empty.</div>';
  ['posCart','kioskSideCart','kioskCartItems'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=html;});
  [['subtotal',subtotal],['tax',tax],['grandTotal',total],['chargeTotal',total],['kioskTotal',total],['kioskSideTotal',total]].forEach(([id,value])=>{const el=document.getElementById(id);if(el)el.textContent=money(value);});
  localStorage.setItem('voodooCart',JSON.stringify(cart));
}

function renderModule(view){
  const container=document.getElementById('viewContainer');
  container.innerHTML=`<section class="module-view">${activeModule==='pos'?posView(view):activeModule==='inventory'?inventoryView(view):orderingView(view)}</section>`;
  bindViewEvents();renderCart();
}

function bindViewEvents(){
  document.querySelectorAll('[data-product]').forEach(b=>b.onclick=()=>{const p=products.find(x=>x.id===Number(b.dataset.product));const x=cart.find(y=>y.id===p.id);x?x.quantity++:cart.push({...p,quantity:1});renderCart();toast(`${p.name} added`);});
  document.querySelectorAll('[data-cart-plus],[data-cart-minus]').forEach(b=>b.onclick=()=>{const id=Number(b.dataset.cartPlus||b.dataset.cartMinus),x=cart.find(y=>y.id===id);if(!x)return;x.quantity+=b.dataset.cartPlus?1:-1;if(x.quantity<=0)cart=cart.filter(y=>y.id!==id);renderCart();});
  document.getElementById('clearCart')?.addEventListener('click',()=>{cart=[];renderCart();});
  document.getElementById('chargeButton')?.addEventListener('click',()=>cart.length?toast('Payment window ready'):toast('Add items before charging'));
  document.getElementById('kioskSideCheckout')?.addEventListener('click',()=>cart.length?toast('Order placed successfully'):toast('Your cart is empty'));
  document.getElementById('kioskCheckout')?.addEventListener('click',()=>cart.length?toast('Order placed successfully'):toast('Your cart is empty'));
  document.getElementById('submitStock')?.addEventListener('click',()=>toast('Stock entry submitted'));
  document.getElementById('backupButton')?.addEventListener('click',()=>toast('Backup created successfully'));
}

function enterModule(module){
  activeModule=module;document.getElementById('loginScreen').classList.add('hidden');document.getElementById('appShell').classList.remove('hidden');
  const nav=module==='pos'?posNav:module==='inventory'?inventoryNav:orderingNav;
  document.getElementById('sideNav').innerHTML=nav.map((x,i)=>`<button class="nav-item ${i===0?'active':''}" type="button" data-nav="${x[0]}"><span class="nav-icon">${x[1]}</span><span>${x[2]}</span></button>`).join('');
  document.querySelectorAll('[data-nav]').forEach(b=>b.onclick=()=>{document.querySelectorAll('[data-nav]').forEach(x=>x.classList.remove('active'));b.classList.add('active');const labels={dashboard:'Dashboard',pos:'Order Module',status:'Status Module',logs:'Transaction Logs',stock:'Stock Monitor',alerts:'Alert Module',restock:'Restock Module',requests:'Request Stock',backup:'Backup Data',menu:'Menu Board',ordering:'Ordering Module',cart:'Cart Module'};document.getElementById('pageLabel').textContent=module==='ordering'?'Ordering system':module==='inventory'?'Inventory management':'Point of sale';document.getElementById('pageTitle').textContent=labels[b.dataset.nav];renderModule(b.dataset.nav);});
  document.getElementById('primaryAction').textContent=module==='inventory'?'+ Add Stock':module==='ordering'?'+ Place Order':'＋ New Order';
  document.querySelector('[data-nav="dashboard"]').click();clock();setInterval(clock,30000);
}

document.getElementById('loginForm').addEventListener('submit',e=>{e.preventDefault();const module=document.getElementById('loginModule').value;enterModule(module);});
document.getElementById('togglePassword').addEventListener('click',()=>{const p=document.getElementById('password');p.type=p.type==='password'?'text':'password';});
document.getElementById('logoutButton').addEventListener('click',()=>{document.getElementById('appShell').classList.add('hidden');document.getElementById('loginScreen').classList.remove('hidden');});
/* MODULE_APPLICATION_END */
