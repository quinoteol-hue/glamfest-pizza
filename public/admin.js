const statuses=['Pending','Preparing','Ready','Collected','Cancelled'];
const $=s=>document.querySelector(s);
let pin=sessionStorage.getItem('glamfestAdminPin')||'',orders=[],settings={},ingredients=[],timer,lastOrdersSignature='';

function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function show(el,text){el.textContent=text;el.classList.remove('hidden');}
function hide(el){el.classList.add('hidden');}
function ordersSignature(value){return JSON.stringify((value||[]).map(o=>[o.id,o.status,o.updatedAt,o.slot,o.customerName,o.pizzaName,o.base,o.oil,o.toppings]));}

async function request(url,options={}){
  const response=await fetch(url,{...options,cache:'no-store',headers:{...(options.headers||{}),'x-admin-pin':pin}});
  let data={};try{data=await response.json();}catch{}
  if(!response.ok)throw new Error(data.error||'Request failed.');
  return data;
}

function applyData(data,{force=false,preservePosition=true}={}){
  const nextOrders=data.orders||orders,nextSettings=data.settings||settings,nextIngredients=data.ingredients||ingredients;
  const nextSignature=ordersSignature(nextOrders),ordersChanged=force||nextSignature!==lastOrdersSignature;
  const settingsChanged=force||JSON.stringify(nextSettings)!==JSON.stringify(settings)||JSON.stringify(nextIngredients)!==JSON.stringify(ingredients);
  orders=nextOrders;settings=nextSettings;ingredients=nextIngredients;
  if(settingsChanged)renderSettings();
  if(ordersChanged||settingsChanged){render({preservePosition});lastOrdersSignature=nextSignature;}
}

async function login(){
  pin=$('#pin').value.trim();hide($('#loginMessage'));
  if(!pin)return show($('#loginMessage'),'Enter the kitchen PIN.');
  try{
    const data=await request('/api/admin/orders');
    sessionStorage.setItem('glamfestAdminPin',pin);
    applyData(data,{force:true,preservePosition:false});
    hide($('#login'));$('#dashboard').classList.remove('hidden');
    loadQr();startRefresh();window.scrollTo(0,0);
  }catch(error){show($('#loginMessage'),error.message);}
}

function renderSettings(){
  if(!settings)return;
  const activeId=document.activeElement?.id;
  $('#maxPizzas').value=settings.maxPizzas;
  $('#glutenFreeLimit').value=settings.glutenFreeLimit;
  const unavailable=new Set(settings.unavailableIngredients||[]);
  $('#ingredientControls').innerHTML=ingredients.map(i=>`<label class="choice"><input type="checkbox" value="${escapeHtml(i)}" ${unavailable.has(i)?'':'checked'}><span>${escapeHtml(i)}</span></label>`).join('');
  if(activeId&&document.getElementById(activeId))document.getElementById(activeId).focus({preventScroll:true});
}

function render({preservePosition=true}={}){
  const scrollY=window.scrollY,focused=document.activeElement,focusKey=focused?.dataset?.order||focused?.id||'',focusStatus=focused?.dataset?.status||'';
  orders.sort((a,b)=>a.slot.localeCompare(b.slot)||a.orderNumber-b.orderNumber);
  const query=$('#search').value.trim().toLowerCase();
  const filtered=orders.filter(o=>[o.customerName,o.pizzaName,o.base,o.slot,String(o.orderNumber),o.status,...o.toppings].join(' ').toLowerCase().includes(query));
  const active=orders.filter(o=>o.status!=='Cancelled'),gf=active.filter(o=>o.base==='gluten-free').length;
  $('#summary').innerHTML=`<div class="stat"><b>${active.length}/${settings.maxPizzas||0}</b><span>Active pizzas</span></div><div class="stat"><b>${gf}/${settings.glutenFreeLimit||0}</b><span>Gluten-free</span></div>`+statuses.map(s=>`<div class="stat"><b>${orders.filter(o=>o.status===s).length}</b><span>${s}</span></div>`).join('');
  $('#orders').innerHTML=filtered.length?filtered.map(orderCard).join(''):'<div class="order-card"><strong>No matching orders.</strong></div>';
  if(preservePosition){
    requestAnimationFrame(()=>{
      window.scrollTo({top:scrollY,behavior:'auto'});
      let target=null;
      if(focusKey&&focusStatus)target=document.querySelector(`[data-order="${CSS.escape(focusKey)}"][data-status="${CSS.escape(focusStatus)}"]`);
      else if(focusKey)target=document.getElementById(focusKey);
      target?.focus({preventScroll:true});
    });
  }
}

function orderCard(o){
  const details=o.toppings.length?o.toppings.join(', '):'Cheese and tomato only',base=o.base==='gluten-free'?'Gluten-free base':'Standard base';
  return `<article class="order-card ${o.status==='Cancelled'?'cancelled-order':''}" data-card-id="${escapeHtml(o.id)}"><div class="order-actions"><span class="time-order-label">TIME ORDER: ${escapeHtml(o.slot)}</span><button class="delete-order" data-delete-order="${escapeHtml(o.id)}" type="button">× Remove</button></div><div class="order-top"><div><div class="order-number">#${o.orderNumber} · ${escapeHtml(o.customerName)}</div><strong>${escapeHtml(o.pizzaName)}</strong></div><span class="slot-pill">${escapeHtml(o.slot)}</span></div><div class="order-meta"><strong>${base}</strong> · ${escapeHtml(details)}${o.oil!=='None'?` · ${escapeHtml(o.oil)}`:''}</div><div class="status-row">${statuses.map(s=>`<button class="status-button ${o.status===s?'active':''}" data-order="${escapeHtml(o.id)}" data-status="${s}" type="button">${s}</button>`).join('')}</div></article>`;
}

async function saveSettings(){
  const unavailable=[...document.querySelectorAll('#ingredientControls input:not(:checked)')].map(i=>i.value);
  try{
    const data=await request('/api/admin/settings',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({maxPizzas:Number($('#maxPizzas').value),glutenFreeLimit:Number($('#glutenFreeLimit').value),unavailableIngredients:unavailable})});
    settings=data.settings;renderSettings();render();
    show($('#adminMessage'),'Kitchen availability saved. Customer options are updated immediately.');
  }catch(error){show($('#adminMessage'),error.message);}
}

async function refresh(silent=false){
  try{const data=await request('/api/admin/orders');applyData(data,{preservePosition:true});if(!silent)hide($('#adminMessage'));}
  catch(error){show($('#adminMessage'),error.message);}
}

async function setStatus(id,status,button){
  if(button)button.disabled=true;
  try{
    const data=await request(`/api/admin/orders/${encodeURIComponent(id)}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status})});
    orders=orders.map(o=>o.id===id?data.order:o);lastOrdersSignature='';render({preservePosition:true});lastOrdersSignature=ordersSignature(orders);
  }catch(error){show($('#adminMessage'),error.message);}
  finally{if(button&&document.body.contains(button))button.disabled=false;}
}

async function deleteOrder(id){
  const order=orders.find(o=>o.id===id);
  if(!order||!confirm(`Permanently remove order #${order.orderNumber} for ${order.customerName}?`))return;
  try{await request(`/api/admin/orders/${encodeURIComponent(id)}`,{method:'DELETE'});orders=orders.filter(o=>o.id!==id);lastOrdersSignature='';render({preservePosition:true});lastOrdersSignature=ordersSignature(orders);}
  catch(error){show($('#adminMessage'),error.message);}
}

async function loadQr(){try{const response=await fetch('/api/qr',{cache:'no-store'}),data=await response.json();$('#qrImage').src=data.imageUrl;$('#qrUrl').textContent=data.url;}catch{$('#qrUrl').textContent='QR unavailable';}}
function startRefresh(){clearInterval(timer);timer=setInterval(()=>{if(!document.hidden&&!document.querySelector('.status-button:focus'))refresh(true);},15000);}

// Delegated events remain active even when the order list is rebuilt.
$('#orders').addEventListener('click',event=>{
  const statusButton=event.target.closest('[data-order][data-status]');
  if(statusButton)return setStatus(statusButton.dataset.order,statusButton.dataset.status,statusButton);
  const deleteButton=event.target.closest('[data-delete-order]');
  if(deleteButton)return deleteOrder(deleteButton.dataset.deleteOrder);
});
$('#loginButton').onclick=login;
$('#pin').onkeydown=e=>{if(e.key==='Enter')login();};
$('#togglePin').onclick=()=>{const input=$('#pin'),showing=input.type==='text';input.type=showing?'password':'text';$('#togglePin').textContent=showing?'Show':'Hide';};
$('#refresh').onclick=()=>refresh(false);
$('#saveSettings').onclick=saveSettings;
$('#search').oninput=()=>render({preservePosition:false});
$('#logout').onclick=()=>{sessionStorage.removeItem('glamfestAdminPin');location.reload();};
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&pin)refresh(true);});
window.addEventListener('pageshow',event=>{if(event.persisted&&pin)refresh(true);});
if(pin){$('#pin').value=pin;login();}else $('#pin').focus();
