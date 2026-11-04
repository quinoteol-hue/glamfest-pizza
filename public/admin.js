let drinkStock=[];
const statuses=['Pending','Preparing','Ready','Collected','Cancelled'];
const $=s=>document.querySelector(s);
let pin=sessionStorage.getItem('glamfestAdminPin')||'',orders=[],settings={},audit={},capacity={},ingredients=[],timer,lastOrdersSignature='';

function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function show(el,text){el.textContent=text;el.classList.remove('hidden');}
function hide(el){el.classList.add('hidden');}
function ordersSignature(value){return JSON.stringify((value||[]).map(o=>[o.id,o.status,o.updatedAt,o.slot,o.customerName,o.pizzaName,o.audit,o.oil,o.toppings]));}

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
  if(data.drinkStock)drinkStock=data.drinkStock;
  orders=nextOrders;settings=nextSettings;ingredients=nextIngredients;if(data.audit)audit=data.audit;if(data.capacity)capacity=data.capacity;
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
  for(const id of ['serviceStart','serviceEnd']){const field=$('#'+id),value=settings[id];if(value&&![...field.options].some(o=>o.value===value)){field.add(new Option(value+' (current)',value));}}
  if($('#eventDate'))$('#eventDate').value=settings.eventDate||'';
  $('#serviceStart').value=settings.serviceStart||'';$('#serviceEnd').value=settings.serviceEnd||'';$('#pizzasPerSlot').value=settings.pizzasPerSlot||1;$('#slotMinutes').value=settings.slotMinutes||3;
  $('#auditEnabled').checked=Boolean(settings.auditEnabled);const breakSelect=$('#auditBreakStart');if(settings.auditBreakStart&&![...breakSelect.options].some(o=>o.value===settings.auditBreakStart)){breakSelect.add(new Option(settings.auditBreakStart+' (current)',settings.auditBreakStart));}breakSelect.value=settings.auditBreakStart||'';$('#auditBreakMinutes').value=settings.auditBreakMinutes;$('#auditPizzas').value=settings.auditPizzas;
  renderAuditPlan();
  const unavailable=new Set(settings.unavailableIngredients||[]);
  $('#ingredientControls').innerHTML=ingredients.map(i=>`<label class="choice"><input type="checkbox" value="${escapeHtml(i)}" ${unavailable.has(i)?'':'checked'}><span>${escapeHtml(i)}</span></label>`).join('');
  if(activeId&&document.getElementById(activeId))document.getElementById(activeId).focus({preventScroll:true});
}

// Live plan: recalculated from the form as the kitchen types, before saving (mirrors server rules).
function slotMin(){return Math.max(1,Math.min(15,parseInt($('#slotMinutes').value,10)||3));}
function mins(t){const m=/^(\d{1,2}):(\d{2})/.exec(t||'');return m?Number(m[1])*60+Number(m[2]):NaN;}
function hhmm(m){return `${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`;}
function snap(m){return m;}
function formPlan(){
  const step=slotMin(),start=snap(mins($('#serviceStart').value)),end=snap(mins($('#serviceEnd').value)),per=Math.max(1,Math.min(6,parseInt($('#pizzasPerSlot').value,10)||1));
  const auditOn=$('#auditEnabled').checked,auditN=Math.max(0,parseInt($('#auditPizzas').value,10)||0),breakStart=snap(mins($('#auditBreakStart').value)),breakLen=parseInt($('#auditBreakMinutes').value,10)||0;
  const maxP=parseInt($('#maxPizzas').value,10)||0;
  if(!Number.isFinite(start)||!Number.isFinite(end))return {error:'Enter a collection start and end time.'};
  if(end<start)return {error:'Collection end must be after collection start.'};
  const times=[];for(let m=start;m<=end;m+=step)times.push(m);
  let prepFrom=NaN,prepInWindow=0,auditCount=0;
  if(auditOn&&auditN&&Number.isFinite(breakStart)){auditCount=auditN;prepFrom=breakStart-Math.ceil(auditN/per)*step;prepInWindow=times.filter(m=>m>=prepFrom&&m<breakStart).length;}
  const staff=(times.length-prepInWindow)*per,total=staff+auditCount;
  return {step,start,end,per,times:times.length,staff,auditCount,auditOn,breakStart,breakLen,prepFrom,total,maxP,limit:Math.min(total,maxP||total)};
}
function changedFromSaved(){
  const f={eventDate:$('#eventDate')?$('#eventDate').value:settings.eventDate,serviceStart:$('#serviceStart').value,serviceEnd:$('#serviceEnd').value,pizzasPerSlot:String(parseInt($('#pizzasPerSlot').value,10)),slotMinutes:String(parseInt($('#slotMinutes').value,10)),maxPizzas:String(parseInt($('#maxPizzas').value,10)),auditEnabled:$('#auditEnabled').checked,auditBreakStart:$('#auditBreakStart').value,auditBreakMinutes:String(parseInt($('#auditBreakMinutes').value,10)),auditPizzas:String(parseInt($('#auditPizzas').value,10))};
  return f.eventDate!==settings.eventDate||f.serviceStart!==settings.serviceStart||f.serviceEnd!==settings.serviceEnd||f.pizzasPerSlot!==String(settings.pizzasPerSlot)||f.slotMinutes!==String(settings.slotMinutes)||f.maxPizzas!==String(settings.maxPizzas)||f.auditEnabled!==Boolean(settings.auditEnabled)||f.auditBreakStart!==settings.auditBreakStart||f.auditBreakMinutes!==String(settings.auditBreakMinutes)||f.auditPizzas!==String(settings.auditPizzas);
}
function renderAuditPlan(){
  const p=formPlan(),a=audit||{},unsaved=changedFromSaved();
  const badge=unsaved?'<span class="unsaved-badge">Not saved yet – press “Save kitchen availability”</span>':'<span class="saved-badge">✓ Saved – customers see this now</span>';
  if(p.error){$('#capacityPlan').innerHTML=`${badge}<p class="plan-error">${escapeHtml(p.error)}</p>`;$('#auditPlan').innerHTML='';return;}
  const mm=n=>`${n} minute${n===1?'':'s'}`,pace=p.per===1?`1 pizza every ${mm(p.step)}`:`${p.per} pizzas every ${mm(p.step)} (about 1 every ${Math.round(p.step*60/p.per)} seconds)`;
  const hours=Math.floor((p.end-p.start)/60),m=(p.end-p.start)%60,span=`${hours?hours+' h ':''}${m?m+' min':''}`.trim();
  let stock='';
  if(p.maxP&&p.maxP<p.total)stock=`<li class="plan-warn">Stock limit is <strong>${p.maxP}</strong>, lower than the timetable, so ordering stops at ${p.maxP}.</li>`;
  else if(p.maxP>p.total)stock=`<li class="plan-note">Stock limit (${p.maxP}) is higher than the timetable, so the timetable allows <strong>${p.total} pizzas</strong>.</li>`;
  $('#capacityPlan').innerHTML=`${badge}
    <div class="plan-total">Total booking capacity: <strong>${p.limit} pizzas</strong></div><p>This is calculated from collection times and kitchen pace, including the audit reservation. It is limited by available stock.</p>
    <ul class="plan-list">
      <li>Collection <strong>${hhmm(p.start)}–${hhmm(p.end)}</strong> (${span||'0 min'}) · ${p.times} collection times</li>
      <li>Kitchen pace: <strong>${pace}</strong></li>
      <li>Staff: <strong>${p.staff}</strong> pizzas${p.auditCount?` (times ${hhmm(p.prepFrom)}–${hhmm(p.breakStart)} are kept free to cook the audit pizzas)`:''}</li>
      <li>Audit team: <strong>${p.auditCount}</strong>${p.auditCount?` pizzas, all ready at ${hhmm(p.breakStart)}`:' (audit link closed or 0 reserved)'}</li>
      ${stock}
    </ul>`;
  $('#auditPlan').innerHTML=p.auditOn?`<strong>${a.booked??0}/${p.auditCount}</strong> audit pizzas booked so far · ready at <strong>${hhmm(p.breakStart)}</strong> · break ${hhmm(p.breakStart)}–${hhmm(p.breakStart+p.breakLen)}`:'Audit link is closed: the audit QR will not take orders.';
}
function render({preservePosition=true}={}){
  const scrollY=window.scrollY,focused=document.activeElement,focusKey=focused?.dataset?.order||focused?.id||'',focusStatus=focused?.dataset?.status||'';
  orders.sort((a,b)=>a.slot.localeCompare(b.slot)||a.orderNumber-b.orderNumber);
  const query=$('#search').value.trim().toLowerCase();
  const filtered=orders.filter(o=>[o.customerName,o.pizzaName,o.audit?'audit':'staff',o.slot,String(o.orderNumber),o.status,...o.toppings].join(' ').toLowerCase().includes(query));
  const active=orders.filter(o=>o.status!=='Cancelled'),auditActive=active.filter(o=>o.audit).length;renderAuditPlan();
  const stockPanel=$('#drinkStock');
  if(stockPanel)stockPanel.innerHTML=drinkStock.map(({name,total})=>{
    const reserved=active.filter(order=>order.drink===name).length;
    const left=Math.max(0,total-reserved);
    return `<div class="stat"><b>${left}/${total} left</b><span>${escapeHtml(name)} · ${reserved} ordered</span></div>`;
  }).join('');
  $('#summary').innerHTML=`<div class="stat"><b>${active.length}/${settings.maxPizzas||0}</b><span>Active pizzas</span></div><div class="stat audit-stat"><b>${auditActive}/${settings.auditPizzas||0}</b><span>Audit team</span></div>`+statuses.map(s=>`<div class="stat"><b>${orders.filter(o=>o.status===s).length}</b><span>${s}</span></div>`).join('');
  $('#orders').innerHTML=filtered.length?groupedOrders(filtered):'<div class="order-card"><strong>No matching orders.</strong></div>';
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

// Kitchen board grouped by stage: Pending → Preparing → Ready → Collected (+ Cancelled).
const GROUPS=[['Pending','📝 Pending','New orders, not started'],['Preparing','🔥 Preparing','In the oven'],['Ready','✅ Ready','Waiting to be collected'],['Collected','😋 Collected',''],['Cancelled','✖️ Cancelled','']];
const groupOpen={Pending:true,Preparing:true,Ready:true,Collected:false,Cancelled:false};
function groupedOrders(list){
  return GROUPS.map(([status,title,hint])=>{
    const items=list.filter(o=>o.status===status);
    const body=items.length?items.map(orderCard).join(''):`<p class="group-empty">No orders here.</p>`;
    return `<details class="status-group group-${status.toLowerCase()}" data-group="${status}" ${groupOpen[status]?'open':''}><summary><span class="group-title">${title}</span><span class="group-count">${items.length}</span>${hint?`<span class="group-hint">${hint}</span>`:''}</summary><div class="group-body">${body}</div></details>`;
  }).join('');
}
$('#orders').addEventListener('toggle',event=>{const g=event.target.closest&&event.target.closest('[data-group]');if(g)groupOpen[g.dataset.group]=g.open;},true);
function whatsappLink(o){
  const first=String(o.customerName||'').trim().split(/\s+/)[0];
  const msg=`Hi ${first}, your ${o.pizzaName} (order #${o.orderNumber}) is ready to collect from the pizza table 🍕 – ED Pizza & Pop`;
  return `https://wa.me/${encodeURIComponent(o.phone)}?text=${encodeURIComponent(msg)}`;
}
function orderCard(o){
  const details=o.toppings.length?o.toppings.join(', '):'Cheese only';
  return `<article class="order-card ${o.status==='Cancelled'?'cancelled-order':''} ${o.audit?'audit-order':''}" data-card-id="${escapeHtml(o.id)}"><div class="order-actions"><span class="time-order-label ${o.audit?'audit-label':''}">${o.audit?'AUDIT TEAM · READY BY':'TIME ORDER:'} ${escapeHtml(o.slot)}</span><button class="delete-order" data-delete-order="${escapeHtml(o.id)}" type="button">× Remove</button></div><div class="order-top"><div><div class="order-number">#${o.orderNumber} · ${escapeHtml(o.customerName)}</div><strong>${escapeHtml(o.pizzaName)}</strong></div><span class="slot-pill">${escapeHtml(o.slot)}</span></div>${o.phone||o.notify?`<div class="contact-row">${o.phone?`<a class="whatsapp-button ${o.status==='Ready'?'pulse':''}" href="${whatsappLink(o)}" target="_blank" rel="noopener">💬 WhatsApp ${escapeHtml(o.phone.replace(/^44/,'0'))}</a>`:''}${o.notify?'<span class="notify-chip">🔔 Pop-up alert on</span>':''}</div>`:''}<div class="order-meta">${o.base==='barbecue'?'Barbecue sauce':'Tomato sauce'} · ${escapeHtml(details)} · Drink: ${escapeHtml(o.drink||'No drink')}${o.oil!=='None'?` · ${escapeHtml(o.oil)}`:''}</div><div class="status-row">${statuses.map(s=>`<button class="status-button ${o.status===s?'active':''}" data-order="${escapeHtml(o.id)}" data-status="${s}" type="button">${s}</button>`).join('')}</div></article>`;
}

async function saveSettings(){
  const unavailable=[...document.querySelectorAll('#ingredientControls input:not(:checked)')].map(i=>i.value);
  try{
    const data=await request('/api/admin/settings',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({eventDate:$('#eventDate')?$('#eventDate').value:undefined,maxPizzas:Number($('#maxPizzas').value),serviceStart:$('#serviceStart').value,serviceEnd:$('#serviceEnd').value,pizzasPerSlot:Number($('#pizzasPerSlot').value),slotMinutes:Number($('#slotMinutes').value),auditEnabled:$('#auditEnabled').checked,auditBreakStart:$('#auditBreakStart').value,auditBreakMinutes:Number($('#auditBreakMinutes').value),auditPizzas:Number($('#auditPizzas').value),unavailableIngredients:unavailable})});
    settings=data.settings;await refresh(true);renderSettings();render();
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

async function loadQr(){try{const response=await fetch('/api/qr',{cache:'no-store'}),data=await response.json();$('#qrImage').src=data.imageUrl;$('#qrUrl').textContent=data.url;$('#auditQrImage').src=data.auditImageUrl;$('#auditQrUrl').textContent=data.auditUrl;}catch{$('#qrUrl').textContent='QR unavailable';}}
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
$('#resetOrders').onclick=async()=>{
  const n=orders.length;
  if(!n)return show($('#adminMessage'),'There are no orders to reset.');
  const typed=prompt(`This permanently removes all ${n} order(s), including real ones.\n\nType RESET to confirm:`);
  if(typed===null)return;
  if(typed.trim().toUpperCase()!=='RESET')return show($('#adminMessage'),'Reset cancelled: you need to type RESET.');
  try{const data=await request('/api/admin/reset',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({confirm:'RESET'})});await refresh(true);show($('#adminMessage'),`Done: ${data.removed} order(s) removed. The board is back to zero.`);window.scrollTo({top:0,behavior:'smooth'});}
  catch(error){show($('#adminMessage'),error.message);}
};
['eventDate','serviceStart','serviceEnd','slotMinutes','pizzasPerSlot','maxPizzas','auditEnabled','auditBreakStart','auditBreakMinutes','auditPizzas'].forEach(id=>{const el=document.getElementById(id);el.addEventListener('input',renderAuditPlan);el.addEventListener('change',renderAuditPlan);});
$('#search').oninput=()=>render({preservePosition:false});
$('#logout').onclick=()=>{sessionStorage.removeItem('glamfestAdminPin');location.reload();};
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&pin)refresh(true);});
window.addEventListener('pageshow',event=>{if(event.persisted&&pin)refresh(true);});
if(pin){$('#pin').value=pin;login();}else $('#pin').focus();

const releaseAuditButton=$('#releaseAudit');
if(releaseAuditButton)releaseAuditButton.onclick=async()=>{
  if(!confirm('Release all unused audit places to staff? Confirmed audit orders will be kept.'))return;
  releaseAuditButton.disabled=true;
  try{
    await request('/api/admin/settings',{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({releaseUnusedAudit:true})});
    await refresh(true);
    show($('#adminMessage'),'Unused audit places released. Future slots are available where capacity allows.');
  }catch(error){show($('#adminMessage'),error.message);}
  finally{releaseAuditButton.disabled=false;}
};
