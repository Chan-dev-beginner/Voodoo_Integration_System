class Product { constructor(id,name,category,price,stock,image){Object.assign(this,{id,name,category,price,stock,image});} }
class AppModel {
  constructor(){
    this.account=null;
    this.module='dashboard';
    this.cart=[];
    this.shiftStartedAt=new Date().toISOString();
    this.orders=JSON.parse(localStorage.getItem('voodooShiftOrders')||'[]');
    this.restockRequests=JSON.parse(localStorage.getItem('voodooRestockRequests')||'[]');
    this.products=[new Product(1,'Vanilla Latte','Coffee',150,18,'assets/2.png'),new Product(2,'Caramel Machiato','Coffee',165,12,'assets/3.png'),new Product(3,'Mocha Iced','Coffee',170,9,'assets/4.png'),new Product(4,'Matcha Frappe','Frappe',185,4,'assets/1.png'),new Product(5,'Berry Refresher','Refresher',155,3,'assets/refreshers.png'),new Product(6,'Iced Americano','Coffee',120,22,'assets/3.png'),new Product(7,'Chocolate Frappe','Frappe',180,8,'assets/4.png'),new Product(8,'Strawberry Matcha','Refresher',160,0,'assets/1.png'),new Product(9,'Salted Caramel','Coffee',175,14,'assets/2.png')];
  }
  add(id){const p=this.products.find(x=>x.id===Number(id));if(!p||p.stock<=0)return false;const i=this.cart.find(x=>x.id===p.id);i?i.quantity++:this.cart.push({...p,quantity:1});return true;}
  quantity(id,change){const i=this.cart.find(x=>x.id===Number(id));if(!i)return;i.quantity+=change;if(i.quantity<=0)this.cart=this.cart.filter(x=>x.id!==Number(id));}
  totals(){const subtotal=this.cart.reduce((n,x)=>n+x.price*x.quantity,0),tax=subtotal*.12;return{subtotal,tax,total:subtotal+tax};}
  startShift(){
    this.shiftStartedAt=new Date().toISOString();
    this.orders=JSON.parse(localStorage.getItem('voodooShiftOrders')||'[]');
    this.restockRequests=JSON.parse(localStorage.getItem('voodooRestockRequests')||'[]');
  }
  recordOrder(paymentMethod){
    const totals=this.totals();
    const order={id:'#S'+String(Date.now()).slice(-6),account:this.account.name,time:new Date().toISOString(),paymentMethod,items:this.cart.map(item=>({name:item.name,quantity:item.quantity,price:item.price,total:item.price*item.quantity})),subtotal:totals.subtotal,tax:totals.tax,total:totals.total};
    this.orders.push(order);
    localStorage.setItem('voodooShiftOrders',JSON.stringify(this.orders));
    return order;
  }
  requestRestock(productId,quantity){
    const product=this.products.find(item=>item.id===Number(productId));
    if(!product||Number(quantity)<=0)return false;
    this.restockRequests.push({id:'RR-'+String(Date.now()).slice(-6),productId:product.id,productName:product.name,quantity:Number(quantity),requestedBy:this.account.name,status:'Pending',requestedAt:new Date().toISOString(),approvedAt:null});
    localStorage.setItem('voodooRestockRequests',JSON.stringify(this.restockRequests));
    return true;
  }
  approveRestock(requestId){
    const request=this.restockRequests.find(item=>item.id===requestId);
    if(!request||request.status!=='Pending')return false;
    const product=this.products.find(item=>item.id===request.productId);
    if(product)product.stock+=request.quantity;
    request.status='Approved';
    request.approvedAt=new Date().toISOString();
    localStorage.setItem('voodooRestockRequests',JSON.stringify(this.restockRequests));
    return true;
  }
  rejectRestock(requestId){
    const request=this.restockRequests.find(item=>item.id===requestId);
    if(!request||request.status!=='Pending')return false;
    request.status='Rejected';
    request.approvedAt=new Date().toISOString();
    localStorage.setItem('voodooRestockRequests',JSON.stringify(this.restockRequests));
    return true;
  }
}
class AppView {
  constructor(model){this.model=model;}
  money(v){return '₱'+Number(v).toFixed(2);}
  toast(message){const el=document.getElementById('toast');el.textContent=message;el.classList.add('show');clearTimeout(this.timer);this.timer=setTimeout(()=>el.classList.remove('show'),1800);}
  clock(){document.getElementById('clock').textContent=new Intl.DateTimeFormat('en-PH',{hour:'numeric',minute:'2-digit',hour12:true}).format(new Date());}
  nav(items){document.getElementById('sideNav').innerHTML=items.map((x,i)=>`<button class="nav-item ${i===0?'active':''}" type="button" data-module="${x[0]}"><span class="nav-icon">${x[1]}</span><span>${x[2]}</span></button>`).join('');}
  dashboard(){const inventory=this.model.module==='inventory';const metrics=inventory?[['Product stock','₱38,920','9 products'],['Low stock','3 items','Needs attention'],['Out of stock','1 item','Urgent'],['Pending restocks','3','Awaiting approval']]:[['Today\'s sales','₱12,480','+8.4%'],['Orders','86','12 pending'],['Average order','₱145.12','+3.1%'],['Transactions','64','+6 today']];return `<div class="dashboard-grid">${metrics.map(x=>`<article class="metric-card"><span>${x[0]}</span><strong>${x[1]}</strong><small>${x[2]}</small></article>`).join('')}</div><div class="dashboard-split"><section class="chart-card"><h2>${inventory?'Inventory overview':'Sales overview'}</h2><div class="chart-bars"><i style="height:42%"></i><i style="height:67%"></i><i style="height:54%"></i><i style="height:78%"></i><i style="height:64%"></i><i style="height:92%"></i><i style="height:72%"></i></div></section><section class="activity-card"><h2>Recent activity</h2><div class="activity-list"><div class="activity-item"><i class="activity-dot"></i><div><strong>Order #1008</strong><br><span>Added 3 items · 10:42 AM</span></div></div><div class="activity-item"><i class="activity-dot"></i><div><strong>Stock adjusted</strong><br><span>Matcha Frappe · 10:31 AM</span></div></div></div></section></div>`;}
  productGrid(){return `<div class="menu-grid">${this.model.products.map(p=>`<article class="product-card"><div class="product-image"><img src="${p.image}" alt="${p.name}"></div><div class="product-info"><div><h3>${p.name}</h3><p>${this.money(p.price)}</p></div><button class="add-button" type="button" data-action="add" data-id="${p.id}" ${p.stock<=0?'disabled':''}>＋</button></div></article>`).join('')}</div>`;}
  pos(){return `<div class="pos-layout"><section class="catalog-panel"><div class="catalog-toolbar"><label class="search"><span>⌕</span><input type="search" data-action="menu-search" placeholder="Search menu"></label></div><div id="posGrid">${this.productGrid()}</div></section><aside class="order-panel"><div class="order-heading"><div><p>Current order</p><h2>Order <span>#1008</span></h2></div><button type="button" data-action="clear">Clear</button></div><div class="order-meta"><button type="button" class="meta-active" data-action="order-type">Dine in</button><button type="button" data-action="order-type">Take out</button></div><div class="cart-items" id="cartItems"></div><div class="order-total"><div><span>Subtotal</span><strong id="subtotal">₱0.00</strong></div><div><span>Tax</span><strong id="tax">₱0.00</strong></div><div class="grand-total"><span>Total</span><strong id="grandTotal">₱0.00</strong></div><button class="charge-button" type="button" data-action="checkout"><span>Charge</span><strong id="chargeTotal">₱0.00</strong></button></div></aside></div>`;}
  ordering(){return `<div class="ordering-layout"><section class="catalog-panel"><div class="kiosk-hero"><p>Voodoo eSports Café</p><h2>Fuel your game</h2><p>Fresh drinks, bold flavors, fast service</p></div><div class="catalog-toolbar"><label class="search"><span>⌕</span><input type="search" data-action="menu-search" placeholder="Search menu"></label></div><div id="orderingGrid">${this.productGrid()}</div></section><aside class="kiosk-cart"><div class="order-heading"><div><p>Your order</p><h2>Cart</h2></div></div><div id="kioskCart" class="cart-items"></div><div class="order-total"><div class="grand-total"><span>Total</span><strong id="kioskTotal">₱0.00</strong></div><button class="charge-button" type="button" data-action="checkout"><span>Place order</span><strong>→</strong></button></div></aside></div>`;}
  inventory(){const rows=this.model.products.map(p=>{const s=p.stock===0?'Out of stock':p.stock<=5?'Low stock':'In stock';return `<tr><td><strong>${p.name}</strong></td><td>${p.category}</td><td>${p.stock} cups</td><td>${this.money(p.price)}</td><td><span class="${s==='Out of stock'?'stock-out':s==='Low stock'?'stock-low':''}">${s}</span></td><td><button class="row-action" type="button" data-action="manage" data-id="${p.id}">Manage</button></td></tr>`}).join('');return `<div class="inventory-tools"><label class="search"><span>⌕</span><input type="search" data-action="inventory-search" placeholder="Search product inventory"></label><div class="module-actions"><button class="secondary-action" type="button" data-action="import">Import</button><button class="primary-action" type="button" data-action="manage">＋ Add Product</button></div></div><div class="data-card"><div class="data-head"><h2>Product inventory</h2><button class="secondary-action" type="button" data-action="export">Export</button></div><div class="table-wrap"><table><thead><tr><th>Product</th><th>Category</th><th>Available</th><th>Selling price</th><th>Status</th><th>Action</th></tr></thead><tbody id="inventoryRows">${rows}</tbody></table></div></div>`;}
  alerts(){return `<div class="alert-grid">${this.model.products.filter(p=>p.stock<=5).map(p=>`<article class="alert-card ${p.stock?'warning':''}"><strong>${p.name} — ${p.stock?p.stock+' cups remaining':'Out of stock'}</strong><p>${p.stock?'Below minimum stock level.':'Immediate restock required.'}</p><button class="secondary-action" type="button" data-action="restock" data-id="${p.id}">Restock</button></article>`).join('')}</div>`;}
  restock(){
    const pending=this.model.restockRequests.filter(request=>request.status==='Pending');
    if(this.model.account.role==='admin'){
      const rows=this.model.restockRequests.map(request=>`<tr><td><strong>${request.id}</strong></td><td>${request.productName}</td><td>${request.quantity} cups</td><td>${request.requestedBy}</td><td><span class="status ${request.status==='Approved'?'done':'pending'}">${request.status}</span></td><td>${request.status==='Pending'?`<button class="row-action" type="button" data-action="approve-request" data-id="${request.id}">Approve</button> <button class="row-action" type="button" data-action="reject-request" data-id="${request.id}">Reject</button>`:'—'}</td></tr>`).join('');
      return `<div class="inventory-tools"><div><h2>Restock Requests</h2><p>${pending.length} request(s) awaiting approval</p></div></div><div class="data-card"><div class="table-wrap"><table><thead><tr><th>Request</th><th>Product</th><th>Quantity</th><th>Requested by</th><th>Status</th><th>Action</th></tr></thead><tbody>${rows||'<tr><td colspan="6">No restock requests.</td></tr>'}</tbody></table></div></div>`;
    }
    const history=this.model.restockRequests.filter(request=>request.requestedBy==='Barista').map(request=>`<p><strong>${request.productName}</strong> · ${request.quantity} cups · <span class="status ${request.status==='Approved'?'done':'pending'}">${request.status}</span></p>`).join('');
    return `<div class="restock-grid"><section class="form-card"><h2>Request restock</h2><form id="restockForm" class="form-grid"><label>Product<select id="restockProduct">${this.model.products.map(p=>`<option value="${p.id}">${p.name}</option>`).join('')}</select></label><label>Quantity (cups)<input id="restockQuantity" type="number" value="10" min="1"></label><button class="primary-action" type="submit">Submit Request</button></form></section><section class="form-card"><h2>My requests</h2>${history||'<p>No restock requests submitted.</p>'}</section></div>`;}
  backup(){return `<div class="inventory-header"><div class="inventory-stats"><article><span>Last backup</span><strong>Today</strong></article><article><span>Product data</span><strong>${this.model.products.length} items</strong></article><article><span>Retention</span><strong>30 days</strong></article></div><button class="primary-action" type="button" data-action="backup">↓ Create Backup</button></div>`;}
  shiftOrders(){const orders=this.model.orders.filter(order=>new Date(order.time)>=new Date(this.model.shiftStartedAt));const rows=orders.map(order=>`<tr><td><strong>${order.id}</strong></td><td>${order.account}</td><td>${order.paymentMethod}</td><td>${order.items.reduce((sum,item)=>sum+item.quantity,0)} items</td><td><strong>${this.money(order.total)}</strong></td><td>${new Date(order.time).toLocaleTimeString('en-PH',{hour:'numeric',minute:'2-digit'})}</td></tr>`).join('');return `<div class="inventory-tools"><div><h2>Shift Order Log</h2><p>${orders.length} completed order(s)</p></div></div><div class="data-card"><div class="table-wrap"><table><thead><tr><th>Order</th><th>Cashier</th><th>Payment</th><th>Items</th><th>Total</th><th>Time</th></tr></thead><tbody>${rows||'<tr><td colspan="6">No completed orders in this shift.</td></tr>'}</tbody></table></div></div>`;}
  shiftSummary(){const orders=this.model.orders.filter(order=>new Date(order.time)>=new Date(this.model.shiftStartedAt));const total=orders.reduce((sum,order)=>sum+order.total,0),tax=orders.reduce((sum,order)=>sum+order.tax,0),items=orders.reduce((sum,order)=>sum+order.items.reduce((count,item)=>count+item.quantity,0),0);const paymentTotals=orders.reduce((totals,order)=>{totals[order.paymentMethod]=(totals[order.paymentMethod]||0)+order.total;return totals;},{});const paymentRows=Object.entries(paymentTotals).map(([method,amount])=>`<tr><td>${method}</td><td><strong>${this.money(amount)}</strong></td></tr>`).join('')||'<tr><td colspan="2">No payments recorded</td></tr>';return `<div class="shift-summary"><div class="shift-summary-header"><span>VOODOO ESPORTS CAFÉ</span><h2>Shift Sales Summary</h2><p>${new Date(this.model.shiftStartedAt).toLocaleString()} — ${new Date().toLocaleString()}</p><p>User: ${this.model.account.name}</p></div><div class="shift-summary-stats"><div><span>Orders</span><strong>${orders.length}</strong></div><div><span>Items sold</span><strong>${items}</strong></div><div><span>Tax</span><strong>${this.money(tax)}</strong></div><div><span>Net sales</span><strong>${this.money(total)}</strong></div></div><table class="summary-table"><thead><tr><th>Payment method</th><th>Amount</th></tr></thead><tbody>${paymentRows}</tbody></table><div class="shift-summary-total"><span>Total sales</span><strong>${this.money(total)}</strong></div><div class="summary-actions"><button class="secondary-action" type="button" data-action="close-summary">Close</button><button class="primary-action" type="button" data-action="print-summary">Print Summary</button></div></div>`;}
  renderCart(){const t=this.model.totals();const html=this.model.cart.length?this.model.cart.map(x=>`<div class="cart-item"><img src="${x.image}" alt=""><div><h4>${x.name}</h4><small>${this.money(x.price)}</small></div><div class="quantity"><button type="button" data-action="minus" data-id="${x.id}">−</button><span>${x.quantity}</span><button type="button" data-action="plus" data-id="${x.id}">＋</button></div></div>`).join(''):'<div class="empty-cart">Your cart is empty.</div>';['cartItems','kioskCart'].forEach(id=>{const el=document.getElementById(id);if(el)el.innerHTML=html;});[['subtotal',t.subtotal],['tax',t.tax],['grandTotal',t.total],['chargeTotal',t.total],['kioskTotal',t.total]].forEach(([id,v])=>{const el=document.getElementById(id);if(el)el.textContent=this.money(v);});}
  modal(title,body){const modal=document.getElementById('actionModal');modal.innerHTML=`<div class="modal-backdrop"><div class="modal-card"><div class="data-head"><h2>${title}</h2><button class="row-action" type="button" data-action="close">×</button></div><div class="modal-body">${body}</div></div></div>`;modal.classList.add('open');}
  closeModal(){const modal=document.getElementById('actionModal');modal.classList.remove('open');modal.innerHTML='';}
}
class AppController {
  constructor(model,view){this.model=model;this.view=view;this.bindGlobal();}
  bindGlobal(){
    document.getElementById('togglePassword').onclick=()=>{const p=document.getElementById('password');p.type=p.type==='password'?'text':'password';};
    document.getElementById('loginAccount').onchange=e=>{const v=e.target.value,h=document.getElementById('accountHint');h.textContent=v==='admin'?'Admin: admin / admin':'Barista: barista / barista';document.getElementById('username').value=v;document.getElementById('password').value=v;};
    document.getElementById('loginForm').onsubmit=e=>{e.preventDefault();const role=document.getElementById('loginAccount').value,user=document.getElementById('username').value,password=document.getElementById('password').value;const valid=(role==='admin'&&user==='admin'&&password==='admin')||(role==='barista'&&user==='barista'&&password==='barista');if(!valid)return this.view.toast('Invalid username or password');this.login(role);};
    document.getElementById('logoutButton').onclick=()=>this.logout();
    document.getElementById('primaryAction').onclick=()=>this.primaryAction();
    document.querySelector('.icon-action').onclick=()=>this.view.toast('No new notifications');
  }
  login(role){this.model.account={role,name:role==='admin'?'Admin':'Barista'};document.getElementById('loginScreen').classList.add('hidden');document.getElementById('appShell').classList.remove('hidden');document.getElementById('staffName').textContent=this.model.account.name;document.querySelector('.avatar').textContent=role==='admin'?'A':'B';this.view.nav(role==='admin'
      ?[['dashboard','▦','Dashboard'],['inventory','◈','Stock Monitor'],['alerts','!','Alerts'],['restock','↻','Restock Requests'],['order-log','≡','Order Log'],['backup','↓','Backup Data']]
      :[['dashboard','▦','Dashboard'],['pos','⊞','POS'],['ordering','＋','Ordering'],['restock','↻','Request Restock'],['order-log','≡','Order Log']]);
    this.navigate('dashboard');
    this.view.clock();
  }
  navigate(module){
    this.model.module=module;
    if(['inventory','alerts','restock','backup','order-log'].includes(module)) this.model.module='inventory';
    else if(module==='pos'||module==='ordering') this.model.module=module;
    else this.model.module='dashboard';
    document.getElementById('pageLabel').textContent=this.model.account.role==='admin'?'Inventory management':'Barista workspace';
    const title={dashboard:'Dashboard',pos:'POS',ordering:'Ordering',inventory:'Stock Monitor',alerts:'Alert Module',restock:'Restock Requests',backup:'Backup Data','order-log':'Shift Order Log'};
    document.getElementById('pageTitle').textContent=title[module];
    let html;
    if(module==='pos')html=this.view.pos();
    else if(module==='ordering')html=this.view.ordering();
    else if(module==='inventory')html=this.view.inventory();
    else if(module==='alerts')html=this.view.alerts();
    else if(module==='restock')html=this.view.restock();
    else if(module==='order-log')html=this.view.shiftOrders();
    else if(module==='backup')html=this.view.backup();
    else html=this.view.dashboard();
    document.getElementById('viewContainer').innerHTML=`<section class="module-view">${html}</section>`;
    this.view.renderCart();
    this.bindDynamic();
  }
  bindDynamic(){
    document.querySelectorAll('[data-module]').forEach(button=>button.onclick=()=>{document.querySelectorAll('[data-module]').forEach(item=>item.classList.remove('active'));button.classList.add('active');this.navigate(button.dataset.module);});
    document.querySelectorAll('[data-action]').forEach(button=>button.onclick=()=>this.action(button));

    const menuSearch=document.querySelector('[data-action="menu-search"]');
    if(menuSearch)menuSearch.oninput=event=>{const grid=document.getElementById('posGrid')||document.getElementById('orderingGrid');const query=event.target.value.toLowerCase();grid.innerHTML=this.model.products.filter(product=>product.name.toLowerCase().includes(query)).map(product=>`<article class="product-card"><div class="product-image"><img src="${product.image}" alt="${product.name}"></div><div class="product-info"><div><h3>${product.name}</h3><p>${this.view.money(product.price)}</p></div><button class="add-button" type="button" data-action="add" data-id="${product.id}">＋</button></div></article>`).join('')||'<p>No products found.</p>';this.bindDynamic();};

    const inventorySearch=document.querySelector('[data-action="inventory-search"]');
    if(inventorySearch)inventorySearch.oninput=event=>{const rows=document.getElementById('inventoryRows');const query=event.target.value.toLowerCase();rows.innerHTML=this.model.products.filter(product=>(product.name+' '+product.category).toLowerCase().includes(query)).map(product=>`<tr><td><strong>${product.name}</strong></td><td>${product.category}</td><td>${product.stock} cups</td><td>${this.view.money(product.price)}</td><td>${product.stock===0?'Out of stock':product.stock<=5?'Low stock':'In stock'}</td><td><button class="row-action" type="button" data-action="manage" data-id="${product.id}">Manage</button></td></tr>`).join('');this.bindDynamic();};

    const restockForm=document.getElementById('restockForm');
    if(restockForm)restockForm.onsubmit=event=>{
      event.preventDefault();
      if(this.model.account.role==='barista'){
        if(this.model.requestRestock(document.getElementById('restockProduct').value,document.getElementById('restockQuantity').value)){
          this.view.toast('Restock request submitted');
          this.navigate('restock');
        }
      }else{
        const product=this.model.products.find(item=>item.id===Number(document.getElementById('restockProduct').value));
        product.stock+=Number(document.getElementById('restockQuantity').value);
        this.view.toast('Product restocked');
        this.navigate('inventory');
      }
    };
  }
  action(button){
    const action=button.dataset.action;
    if(action==='add'){if(!this.model.add(button.dataset.id))return this.view.toast('Product is out of stock');this.view.renderCart();this.view.toast('Item added');}
    else if(action==='plus'||action==='minus'){this.model.quantity(button.dataset.id,action==='plus'?1:-1);this.view.renderCart();}
    else if(action==='clear'){this.model.cart=[];this.view.renderCart();}
    else if(action==='checkout'){if(!this.model.cart.length)return this.view.toast('Cart is empty');this.view.modal('Complete Order',`<p>Total: <strong>${this.view.money(this.model.totals().total)}</strong></p><label class="modal-field">Payment method<select id="paymentMethod"><option>Cash</option><option>Card</option><option>GCash</option></select></label><button class="primary-action" type="button" data-action="confirm">Confirm Payment</button>`);this.bindDynamic();}
    else if(action==='confirm'){const payment=document.getElementById('paymentMethod')?.value||'Cash';this.model.recordOrder(payment);this.model.cart=[];this.view.renderCart();this.view.closeModal();this.view.toast('Order completed and logged');}
    else if(action==='close'||action==='close-summary'){this.view.closeModal();if(action==='close-summary'){document.getElementById('appShell').classList.add('hidden');document.getElementById('loginScreen').classList.remove('hidden');}}
    else if(action==='print-summary'){window.print();}
    else if(action==='approve-request'){if(this.model.approveRestock(button.dataset.id)){this.view.toast('Restock request approved');this.navigate('restock');}}
    else if(action==='reject-request'){if(this.model.rejectRestock(button.dataset.id)){this.view.toast('Restock request rejected');this.navigate('restock');}}
    else if(action==='order-type'){document.querySelectorAll('[data-action="order-type"]').forEach(item=>item.classList.remove('meta-active'));button.classList.add('meta-active');}
    else if(action==='manage'){const p=button.dataset.id?this.model.products.find(item=>item.id===Number(button.dataset.id)):null;this.view.modal(p?'Manage '+p.name:'Add Product',`<div class="form-grid"><label>Product name<input id="productName" value="${p?p.name:''}"></label><label>Category<select id="productCategory"><option>Coffee</option><option>Frappe</option><option>Refresher</option></select></label><label>Stock<input id="productStock" type="number" value="${p?p.stock:10}"></label><label>Price<input id="productPrice" type="number" value="${p?p.price:150}"></label></div><button class="primary-action" type="button" data-action="save" data-id="${p?p.id:''}">Save</button>`);this.bindDynamic();}
    else if(action==='save'){const name=document.getElementById('productName').value.trim();if(!name)return this.view.toast('Product name required');const id=button.dataset.id;if(id){const p=this.model.products.find(item=>item.id===Number(id));p.name=name;p.category=document.getElementById('productCategory').value;p.stock=Number(document.getElementById('productStock').value);p.price=Number(document.getElementById('productPrice').value);}else this.model.products.push(new Product(Date.now(),name,document.getElementById('productCategory').value,Number(document.getElementById('productPrice').value),Number(document.getElementById('productStock').value),'assets/2.png'));this.view.closeModal();this.navigate('inventory');}
    else if(action==='backup'){this.view.toast('Inventory backup created');}
    else if(action==='import'){this.view.toast('Import window opened');}
    else if(action==='export'){this.view.toast('Inventory exported');}
    else if(action==='restock'){this.navigate('restock');}
  }
  logout(){
    this.view.modal('Shift Summary',this.view.shiftSummary());
    this.bindDynamic();
  }

  resetShift(){
    this.model.shiftStartedAt=new Date().toISOString();
    this.model.orders=[];
    localStorage.setItem('voodooShiftOrders',JSON.stringify(this.model.orders));
  }
}
window.addEventListener('DOMContentLoaded',()=>{const model=new AppModel();const view=new AppView(model);window.voodooApp=new AppController(model,view);setInterval(()=>view.clock(),30000);});
