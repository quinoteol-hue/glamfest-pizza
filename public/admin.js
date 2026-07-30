const statuses=['Pending','Preparing','Ready','Collected','Cancelled'];
const $=s=>document.querySelector(s);
let pin=sessionStorage.getItem('glamfestAdminPin')||'';
let orders=[];

function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function show(el,text){el.textContent=text;el.classList.remove('hidden');}
function hide(el){el.classList.add('hidden');}
async function request(url,options={}){
  const response=await fetch(url,{...options,headers:{...(options.headers||{}),'x-admin-pin':pin}});
  const data=await response.json();
  if(!response.ok)throw new Error(data.error||'Request failed.');
  return data;
}
async function login(){
  pin=$('#pin').value.trim();
  if(!pin)return show($('#loginMessage'),'Enter the admin PIN.');
  try{
    const data=await request('/api/admin/orders');
    sessionStorage.setItem('glamfestAdminPin',pin);orders=data.orders;
    hide($('#login'));$('#dashboard').classList.remove('hidden');render();loadQr();startRefresh();
  }catch(error){show($('#loginMessage'),error.message);}
}
function render(){
  const query=$('#search').value.trim().toLowerCase();
  const filtered=orders.filter(o=>[o.customerName,o.pizzaName,o.slot,String(o.orderNumber),o.status,...o.toppings].join(' ').toLowerCase().includes(query));
  $('#summary').innerHTML=statuses.map(s=>`<div class="stat"><b>${orders.filter(o=>o.status===s).length}</b><span>${s}</span></div>`).join('');
  $('#orders').innerHTML=filtered.length?filtered.map(orderCard).join(''):'<div class="order-card"><strong>No matching orders.</strong></div>';
  document.querySelectorAll('[data-order][data-status]').forEach(button=>button.addEventListener('click',()=>setStatus(button.dataset.order,button.dataset.status)));
}
function orderCard(o){
  const details=o.toppings.length?o.toppings.join(', '):'Cheese and tomato only';
  return `<article class="order-card">
    <div class="order-top"><div><div class="order-number">#${o.orderNumber} · ${escapeHtml(o.customerName)}</div><strong>${escapeHtml(o.pizzaName)}</strong></div><span class="slot-pill">${escapeHtml(o.slot)}</span></div>
    <div class="order-meta">${escapeHtml(details)}${o.oil!=='None'?` · ${escapeHtml(o.oil)}`:''}</div>
    <div class="status-row">${statuses.map(s=>`<button class="status-button ${o.status===s?'active':''}" data-order="${o.id}" data-status="${s}" type="button">${s}</button>`).join('')}</div>
  </article>`;
}
async function refresh(silent=false){
  try{const data=await request('/api/admin/orders');orders=data.orders;render();if(!silent)hide($('#adminMessage'));}
  catch(error){show($('#adminMessage'),error.message);}
}
async function setStatus(id,status){
  try{
    const data=await request(`/api/admin/orders/${encodeURIComponent(id)}`,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({status})});
    orders=orders.map(o=>o.id===id?data.order:o);render();hide($('#adminMessage'));
  }catch(error){show($('#adminMessage'),error.message);}
}
async function loadQr(){
  try{const response=await fetch('/api/qr');const data=await response.json();$('#qrImage').src=data.imageUrl;$('#qrUrl').textContent=data.url;}
  catch{$('#qrUrl').textContent='QR unavailable';}
}
let timer;
function startRefresh(){clearInterval(timer);timer=setInterval(()=>refresh(true),15000);}
$('#loginButton').addEventListener('click',login);
$('#pin').addEventListener('keydown',event=>{if(event.key==='Enter')login();});
$('#refresh').addEventListener('click',()=>refresh(false));
$('#search').addEventListener('input',render);
$('#logout').addEventListener('click',()=>{sessionStorage.removeItem('glamfestAdminPin');location.reload();});
if(pin){$('#pin').value=pin;login();}
