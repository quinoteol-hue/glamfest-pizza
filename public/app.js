const toppingArt={"Orange pepper":"<path d='M31 18C8 6 5 36 15 51q7 10 17 3 12 8 20-6 11-29-11-31Z' fill='#f59739' stroke='#b86821'/><path d='M31 19q8-8 7-15' fill='none' stroke='#43723b' stroke-width='6'/>","Sweetcorn":"<ellipse cx='32' cy='28' rx='13' ry='23' fill='#f4c646' stroke='#b98721'/><path d='M19 28q-4 17 13 29 17-12 13-29L32 48Z' fill='#64a44e' stroke='#39733c'/><path d='M25 16h14M22 24h20M24 32h16' stroke='#b98721'/>","Pepperoni":"<circle cx=\"32\" cy=\"32\" r=\"23\" fill=\"#b63732\" stroke=\"#842821\"/><circle cx=\"25\" cy=\"22\" r=\"4\" fill=\"#f8bc7b\"/><circle cx=\"43\" cy=\"30\" r=\"3\" fill=\"#f8bc7b\"/><circle cx=\"25\" cy=\"43\" r=\"4\" fill=\"#f8bc7b\"/><circle cx=\"35\" cy=\"34\" r=\"2\" fill=\"#f8bc7b\"/>","Ham":"<path d=\"M12 21Q29 7 49 19L54 43Q34 59 12 45Z\" fill=\"#ef9b9e\" stroke=\"#b85c6a\"/><path d=\"M14 23Q31 13 47 22L51 41Q33 53 15 43Z\" fill=\"none\" stroke=\"#ffe1cf\" stroke-width=\"5\"/><path d=\"M26 27l10 14m-15-3l20-9\" stroke=\"#ce7581\" stroke-width=\"2\"/>","Mushrooms":"<path d=\"M25 31l-4 22q11 6 22 0l-4-22\" fill=\"#f4e4c9\" stroke=\"#947757\"/><path d=\"M7 32C8 4 54 3 57 32Q32 43 7 32Z\" fill=\"#aa7752\" stroke=\"#714c35\"/><path d=\"M13 31q18 9 38 0\" fill=\"none\" stroke=\"#e6c2a0\" stroke-width=\"3\"/>","Red onion":"<path d=\"M31 8l-5 8C6 23 7 49 23 56q10 5 21-1C60 44 54 24 38 16l-3-8Z\" fill=\"#a25486\" stroke=\"#6d315e\"/><ellipse cx=\"32\" cy=\"37\" rx=\"16\" ry=\"20\" fill=\"#ead0e2\" stroke=\"#b66d9a\"/><ellipse cx=\"32\" cy=\"37\" rx=\"10\" ry=\"15\" fill=\"none\" stroke=\"#b66d9a\"/><ellipse cx=\"32\" cy=\"37\" rx=\"4\" ry=\"9\" fill=\"none\" stroke=\"#b66d9a\"/><path d=\"M29 9l-2-5m8 5l3-5\" stroke=\"#9b8450\"/>","White onion":"<path d=\"M31 8l-5 8C6 23 7 49 23 56q10 5 21-1C60 44 54 24 38 16l-3-8Z\" fill=\"#e7d2a0\" stroke=\"#aa8a51\"/><ellipse cx=\"32\" cy=\"37\" rx=\"16\" ry=\"20\" fill=\"#fff8df\" stroke=\"#c9b477\"/><ellipse cx=\"32\" cy=\"37\" rx=\"10\" ry=\"15\" fill=\"none\" stroke=\"#d8c99e\"/><ellipse cx=\"32\" cy=\"37\" rx=\"4\" ry=\"9\" fill=\"none\" stroke=\"#d8c99e\"/><path d=\"M29 9l-2-5m8 5l3-5\" stroke=\"#9b8450\"/>","Black olives":"<ellipse cx=\"24\" cy=\"25\" rx=\"14\" ry=\"17\" transform=\"rotate(-25 24 25)\" fill=\"#373b2d\" stroke=\"#20251d\"/><ellipse cx=\"24\" cy=\"22\" rx=\"5\" ry=\"7\" fill=\"#c3c49a\" stroke=\"#20251d\"/><ellipse cx=\"42\" cy=\"43\" rx=\"14\" ry=\"17\" transform=\"rotate(25 42 43)\" fill=\"#454735\" stroke=\"#20251d\"/><ellipse cx=\"42\" cy=\"39\" rx=\"5\" ry=\"7\" fill=\"#c3c49a\" stroke=\"#20251d\"/><path d=\"M16 19l2-4m17 25l2-5\" stroke=\"#858a6c\"/>","Pineapple":"<path d=\"M18 23Q32 13 46 23l3 25q-17 17-34 0Z\" fill=\"#f5c444\" stroke=\"#b7821b\"/><path d=\"M17 27l30 22M16 39l21 17M28 21l20 16M45 27L16 49M47 39L27 56M34 21L16 38\" stroke=\"#d49322\" stroke-width=\"2\"/><path d=\"M32 23L17 6l12 6L32 2l5 11L49 7 38 24Z\" fill=\"#51954a\" stroke=\"#316c35\"/>","Jalapeños":"<path d=\"M45 16C60 29 40 53 9 53c19-10 19-25 24-34q4-7 12-3Z\" fill=\"#4b9544\" stroke=\"#296b35\"/><path d=\"M44 16q-2-9 8-11\" fill=\"none\" stroke=\"#356337\" stroke-width=\"5\"/><path d=\"M37 23q-5 7-7 15\" fill=\"none\" stroke=\"#9acb6e\" stroke-width=\"3\"/>","Chillies":"<path d=\"M45 16C60 29 40 53 9 53c19-10 19-25 24-34q4-7 12-3Z\" fill=\"#dc4635\" stroke=\"#9f2e28\"/><path d=\"M44 16q-2-9 8-11\" fill=\"none\" stroke=\"#427840\" stroke-width=\"5\"/><path d=\"M37 23q-5 7-7 15\" fill=\"none\" stroke=\"#ff9b6e\" stroke-width=\"3\"/>","Red pepper":"<path d=\"M31 18C8 6 5 36 15 51q7 10 17 3 12 8 20-6 11-29-11-31Z\" fill=\"#de4c3f\" stroke=\"#a22f2c\"/><path d=\"M31 19q8-8 7-15\" fill=\"none\" stroke=\"#43723b\" stroke-width=\"6\"/><path d=\"M25 23q-8 11-3 23m16-23q8 12 3 23\" fill=\"none\" stroke=\"#a22f2c\" stroke-width=\"2\"/><path d=\"M18 24q-4 5-3 12\" fill=\"none\" stroke=\"#fff\" stroke-opacity=\".45\" stroke-width=\"3\"/>","Yellow pepper":"<path d=\"M31 18C8 6 5 36 15 51q7 10 17 3 12 8 20-6 11-29-11-31Z\" fill=\"#f6ce43\" stroke=\"#b88e20\"/><path d=\"M31 19q8-8 7-15\" fill=\"none\" stroke=\"#43723b\" stroke-width=\"6\"/><path d=\"M25 23q-8 11-3 23m16-23q8 12 3 23\" fill=\"none\" stroke=\"#b88e20\" stroke-width=\"2\"/><path d=\"M18 24q-4 5-3 12\" fill=\"none\" stroke=\"#fff\" stroke-opacity=\".45\" stroke-width=\"3\"/>","Green pepper":"<path d=\"M31 18C8 6 5 36 15 51q7 10 17 3 12 8 20-6 11-29-11-31Z\" fill=\"#65a34e\" stroke=\"#39733c\"/><path d=\"M31 19q8-8 7-15\" fill=\"none\" stroke=\"#43723b\" stroke-width=\"6\"/><path d=\"M25 23q-8 11-3 23m16-23q8 12 3 23\" fill=\"none\" stroke=\"#39733c\" stroke-width=\"2\"/><path d=\"M18 24q-4 5-3 12\" fill=\"none\" stroke=\"#fff\" stroke-opacity=\".45\" stroke-width=\"3\"/>"};
function toppingPicture(name){return `<svg class="topping-picture" viewBox="0 0 64 64" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg"><g stroke-width="2" stroke-linejoin="round" stroke-linecap="round">${toppingArt[name]||''}</g></svg>`;}
const AUDIT_MODE=/^\/audit\/?$/.test(location.pathname);
const state={config:null,specialKey:'',toppings:[],oil:'None'};
const $=s=>document.querySelector(s);
const form=$('#orderForm'),customBuilder=$('#customBuilder'),message=$('#message'),submitButton=$('#submitButton'),success=$('#success');
let loadingConfig=false;

function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function showMessage(text){message.textContent=text;message.classList.remove('hidden');message.scrollIntoView({behavior:'smooth',block:'center'});}
function hideMessage(){message.classList.add('hidden');}

async function loadConfig({preserveSelection=true}={}){
  if(loadingConfig)return;
  loadingConfig=true;
  try{
    const previousSlot=preserveSelection?$('#slot').value:'';
    const response=await fetch('/api/config',{cache:'no-store'});
    if(!response.ok)throw new Error('Unable to load ordering information.');
    state.config=await response.json();
    renderChoices();
    renderDrinks();
    renderSlots(previousSlot);
    updateAvailability();
    updateReview();
  }finally{loadingConfig=false;}
}

function renderDrinks(){
  const select=$('#drink');
  if(!select)return;
  const selected=select.value;
  select.replaceChildren(new Option('No drink',''));
  for(const choice of state.config.drinks||[]){
    const option=new Option(choice.name+(choice.remaining?'':' (sold out)'),choice.name);
    option.disabled=!choice.remaining;
    select.add(option);
    if(choice.remaining&&choice.name===selected)select.value=selected;
  }
}
function renderChoices(){
  $('#toppings').innerHTML=state.config.toppings.map(t=>`<label class="choice"><input type="checkbox" value="${escapeHtml(t)}" ${state.toppings.includes(t)?'checked':''}>${toppingPicture(t)}<span class="topping-name">${escapeHtml(t)}</span></label>`).join('')||'<p class="muted">No toppings currently available.</p>';
  state.oil='None';
  $('#toppingCount').textContent=state.toppings.length;
  document.querySelectorAll('.pizza-card').forEach(button=>{
    const unavailable=button.dataset.special!=='custom'&&state.config.unavailableSpecials?.[button.dataset.special];
    button.disabled=Boolean(unavailable);
    button.classList.toggle('unavailable',Boolean(unavailable));
    button.title=unavailable?'One or more ingredients are unavailable':'';
  });
}


function setupMode(){
  if(!AUDIT_MODE)return;
  document.body.classList.add('audit-mode');
  $('#heroTitle').innerHTML='Audit team <span>pizza</span>';
  document.querySelector('.hero p').textContent='Thank you for helping with today\'s audit: free pizza and a soft drink, ready for the start of your break.';
  $('#staffSlot').classList.add('hidden');$('#auditSlot').classList.remove('hidden');
  $('#slotTitle').textContent='Ready for your break';
  $('#slot').required=false;
}
function auditOpen(){const a=state.config.audit;return a&&a.enabled&&a.remaining>0&&state.config.remaining>0;}
function renderSlots(previousSlot=''){
  if(AUDIT_MODE){
    const a=state.config.audit||{};
    $('#auditTime').textContent=a.breakStart||'--:--';
    $('#whoFor').innerHTML=`<strong>Audit team link</strong><span>Your pizza is ready at the start of your break: ${escapeHtml(a.breakStart||'')}–${escapeHtml(a.breakEnd||'')}</span>`;
    $('#auditSlotText').textContent=a.enabled?`Collect from the pizza table at ${a.breakStart}. Your break runs ${a.breakStart}–${a.breakEnd}.`:'Audit team ordering is closed. Please use the main staff link.';
    submitButton.disabled=!auditOpen();
    return;
  }
  $('#slotHelp').textContent=`Collection runs from ${state.config.serviceStart} to ${state.config.serviceEnd}. Times disappear once they are full.`;
  const used=new Set(state.config.usedSlots),options=state.config.slots.filter(s=>!used.has(s));
  $('#slot').innerHTML='<option value="">Select a time</option>'+options.map(s=>`<option value="${s}">${s}</option>`).join('');
  if(previousSlot&&options.includes(previousSlot))$('#slot').value=previousSlot;
  const soldOut=!options.length||state.config.remaining<=0;
  if(soldOut)$('#slot').innerHTML='<option value="">No slots remaining</option>';
  submitButton.disabled=soldOut;
}

function updateAvailability(){$('#remainingBadge').textContent=AUDIT_MODE?`${Math.min(state.config.audit?.remaining??0,state.config.remaining)} audit pizzas remaining`:`${state.config.remaining} pizzas remaining`;}
function choosePizza(key){
  if(key!=='custom'&&state.config.unavailableSpecials?.[key])return showMessage('That pizza is temporarily unavailable because an ingredient has run out.');
  state.specialKey=key==='custom'?'':key;
  document.querySelectorAll('.pizza-card').forEach(b=>b.classList.toggle('selected',b.dataset.special===key));
  customBuilder.classList.toggle('hidden',key!=='custom');
  if(key!=='custom'){
    state.toppings=[];state.oil='None';
    document.querySelectorAll('#toppings input').forEach(i=>i.checked=false);
    document.querySelectorAll('#oils input').forEach(i=>i.checked=i.value==='None');
    $('#toppingCount').textContent='0';
  }
  hideMessage();updateReview();
}
function selection(){if(state.specialKey){const s=state.config.specials[state.specialKey];return{name:s.name,toppings:s.toppings,oil:s.oil};}return{name:'Build Your Own',toppings:state.toppings,oil:state.oil};}
function selectedBase(){return state.specialKey?'standard':($('input[name=pizzaBase]:checked')?.value||$('#pizzaBase')?.value||'standard');}
function updateReview(){if(!state.config)return;const name=$('#customerName').value.trim()||'Not entered',slot=AUDIT_MODE?`${state.config.audit?.breakStart||''} (audit break)`:($('#slot').value||'Not selected'),selected=document.querySelector('.pizza-card.selected');if(!selected){$('#review').innerHTML='<p>Choose your pizza to see the order summary.</p>';return;}const pizza=selection(),toppingText=pizza.toppings.length?pizza.toppings.join(', '):'Cheese only';$('#review').innerHTML=`<div class="review-row"><b>Collector</b><span>${escapeHtml(name)}</span></div><div class="review-row"><b>Pizza</b><span>${escapeHtml(pizza.name)}</span></div><div class="review-row"><b>Base sauce</b><span>${selectedBase()==='barbecue'?'Barbecue sauce':'Tomato sauce'}</span></div><div class="review-row"><b>Toppings</b><span>${escapeHtml(toppingText)}</span></div><div class="review-row"><b>Drink</b><span>${escapeHtml($('#drink')?.value||'No drink')}</span></div><div class="review-row"><b>Collection</b><span>${escapeHtml(slot)}</span></div>`;}

function showOrderForm({scroll=true}={}){
  success.classList.add('hidden');
  form.classList.remove('hidden');
  history.replaceState({view:'order'},'',location.pathname);
  if(scroll)window.scrollTo({top:0,behavior:'smooth'});
}
function resetForm(){
  form.reset();state.specialKey='';state.toppings=[];state.oil='None';
  document.querySelectorAll('.pizza-card').forEach(b=>b.classList.remove('selected'));
  customBuilder.classList.add('hidden');$('#toppingCount').textContent='0';hideMessage();
  loadConfig({preserveSelection:false}).catch(error=>showMessage(error.message));
  showOrderForm();
}

// Event delegation keeps controls working after choices are re-rendered.
document.addEventListener('change',event=>{
  if(event.target.matches('#toppings input')){const checked=[...document.querySelectorAll('#toppings input:checked')];if(checked.length>4){event.target.checked=false;showMessage('Choose a maximum of four toppings.');return;}state.toppings=checked.map(i=>i.value);$('#toppingCount').textContent=state.toppings.length;hideMessage();updateReview();}
});
document.querySelectorAll('.pizza-card').forEach(button=>button.addEventListener('click',()=>choosePizza(button.dataset.special)));
['customerName','slot','drink','pizzaBase'].forEach(id=>$('#'+id)?.addEventListener('input',updateReview));
document.querySelectorAll('input[name=pizzaBase]').forEach(input=>input.addEventListener('change',updateReview));
$('#confirm').addEventListener('change',hideMessage);

form.addEventListener('submit',async event=>{
  event.preventDefault();hideMessage();
  const selected=document.querySelector('.pizza-card.selected');
  if(!selected)return showMessage('Choose a pizza.');
  if(!$('#customerName').value.trim())return showMessage('Enter the collector name.');
  if(!AUDIT_MODE&&!$('#slot').value)return showMessage('Choose a collection time.');
  if(AUDIT_MODE&&!auditOpen())return showMessage('All audit team pizzas have been reserved. Please speak to the pizza team.');
  if(!$('#confirm').checked)return showMessage('Please confirm that you have checked the order.');
  unlockSound();
  submitButton.disabled=true;submitButton.textContent='Reserving…';
  try{
    const response=await fetch('/api/orders',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({phone:$('#phone')?$('#phone').value:'',customerName:$('#customerName').value,specialKey:state.specialKey,toppings:state.toppings,oil:state.oil,base:selectedBase(),drink:$('#drink')?.value||'',slot:AUDIT_MODE?'':$('#slot').value,group:AUDIT_MODE?'audit':'staff'})});
    const data=await response.json();if(!response.ok)throw new Error(data.error||'Unable to reserve the pizza.');
    const o=data.order;
    form.classList.add('hidden');success.classList.remove('hidden');
    $('#successDetails').innerHTML=`<p><strong>Order #${o.orderNumber}</strong></p><p>${escapeHtml(o.customerName)}, ${o.audit?'your':'collect your'} <strong>${escapeHtml(o.pizzaName)}</strong> ${o.audit?'will be ready at the start of your break,':'at'} <strong>${escapeHtml(o.slot)}</strong>.</p>`;
    rememberOrder(o);showNotifyOption(o);renderTrackers();
    history.pushState({view:'success'},'',`${location.pathname}#booked`);
    loadConfig().catch(()=>{});
    requestAnimationFrame(()=>success.scrollIntoView({behavior:'smooth',block:'start'}));
  }catch(error){showMessage(error.message);await loadConfig();}
  finally{submitButton.disabled=false;submitButton.textContent='Reserve my pizza';if(AUDIT_MODE&&state.config)submitButton.disabled=!auditOpen();}
});

$('#anotherOrder').addEventListener('click',resetForm);
window.addEventListener('popstate',()=>showOrderForm({scroll:false}));
window.addEventListener('pageshow',event=>{if(event.persisted){showOrderForm({scroll:false});loadConfig().catch(error=>showMessage(error.message));}});
window.addEventListener('unhandledrejection',event=>{showMessage(event.reason?.message||'Something went wrong. Please refresh and try again.');});
setupMode();
history.replaceState({view:'order'},'',location.pathname);
loadConfig().catch(error=>showMessage(error.message));

// Refresh server-authoritative availability on open ordering pages.
setInterval(()=>{if(!document.hidden)loadConfig().catch(()=>{});},15000);
window.addEventListener('focus',()=>loadConfig().catch(()=>{}));
document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadConfig().catch(()=>{});});

// ---- Order tracking: this phone remembers its orders and alerts when the kitchen marks one Ready ----
const TRACK_KEY='pizzaPopOrders';
const STATUS_TEXT={Pending:['📝','Order received','The kitchen has your order.'],Preparing:['🔥','In the oven','Your pizza is being made.'],Ready:['✅','READY – come and collect!','Your pizza is waiting at the pizza table.'],Collected:['😋','Collected','Enjoy your pizza!'],Cancelled:['✖️','Cancelled','Please speak to the pizza team.']};
let tracked=[];
try{tracked=JSON.parse(localStorage.getItem(TRACK_KEY)||'[]').filter(t=>t&&t.id);}catch{tracked=[];}
function saveTracked(){try{localStorage.setItem(TRACK_KEY,JSON.stringify(tracked.slice(-10)));}catch{}}
function rememberOrder(o){tracked=tracked.filter(t=>t.id!==o.id);tracked.push({id:o.id,orderNumber:o.orderNumber,pizzaName:o.pizzaName,slot:o.slot,audit:Boolean(o.audit),status:o.status||'Pending',latest:true});tracked.forEach(t=>{if(t.id!==o.id)t.latest=false;});saveTracked();}
let audioCtx=null;
function unlockSound(){try{audioCtx=audioCtx||new (window.AudioContext||window.webkitAudioContext)();if(audioCtx.state==='suspended')audioCtx.resume();}catch{}}
document.addEventListener('pointerdown',()=>{if(tracked.length)unlockSound();},{passive:true});
function beep(){try{if(!audioCtx)return;const t0=audioCtx.currentTime;[0,0.35,0.7].forEach((d,i)=>{const o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type='sine';o.frequency.value=i===2?1175:880;g.gain.setValueAtTime(0.0001,t0+d);g.gain.exponentialRampToValueAtTime(0.4,t0+d+0.02);g.gain.exponentialRampToValueAtTime(0.0001,t0+d+0.3);o.connect(g).connect(audioCtx.destination);o.start(t0+d);o.stop(t0+d+0.32);});}catch{}}
function readyAlert(t){
  document.body.classList.add('ready-alert');setTimeout(()=>document.body.classList.remove('ready-alert'),12000);
  try{navigator.vibrate&&navigator.vibrate([400,150,400,150,800]);}catch{}
  beep();
  setTimeout(()=>{const card=document.querySelector('#success:not(.hidden) .status-ready, #myOrders:not(.hidden) .status-ready');card&&card.scrollIntoView({behavior:'smooth',block:'center'});},50);
  const original=document.title;document.title=`✅ Pizza #${t.orderNumber} READY!`;setTimeout(()=>{document.title=original;},60000);
}
function trackerCard(t){
  const [icon,title,text]=STATUS_TEXT[t.status]||STATUS_TEXT.Pending;
  const steps=['Pending','Preparing','Ready','Collected'],idx=steps.indexOf(t.status);
  return `<div class="tracker-card status-${escapeHtml(String(t.status).toLowerCase())}"><div class="tracker-top"><span class="tracker-icon">${icon}</span><div><strong>${escapeHtml(title)}</strong><small>Order #${escapeHtml(t.orderNumber)} · ${escapeHtml(t.pizzaName||'')} · ${t.audit?'audit break ':''}${escapeHtml(t.slot||'')}</small></div></div>`+
    (t.status==='Cancelled'?`<p class="tracker-text">${escapeHtml(text)}</p>`:`<ol class="tracker-steps">${steps.map((s,i)=>`<li class="${i<idx?'done':i===idx?'now':''}">${s==='Pending'?'Received':s}</li>`).join('')}</ol><p class="tracker-text">${escapeHtml(text)}</p>`)+`</div>`;
}
function renderTrackers(){
  const latest=tracked.find(t=>t.latest);
  $('#successTracker').innerHTML=latest?trackerCard(latest):'';
  const showing=tracked.filter(t=>t.status!=='Collected'||Date.now()-(t.collectedAt||0)<10*60*1000);
  const panel=$('#myOrders');
  if(showing.length&&success.classList.contains('hidden')){panel.innerHTML=`<h2>Your orders</h2>${showing.map(trackerCard).join('')}`;panel.classList.remove('hidden');}
  else panel.classList.add('hidden');
}
let tracking=false;
async function refreshTracked(){
  if(tracking||!tracked.length)return;tracking=true;
  try{
    for(const t of [...tracked]){
      try{
        const r=await fetch(`/api/orders/${encodeURIComponent(t.id)}/status`,{cache:'no-store'});
        if(r.status===404){tracked=tracked.filter(x=>x.id!==t.id);continue;}
        if(!r.ok)continue;
        const o=(await r.json()).order;
        if(o.status==='Ready'&&t.status!=='Ready')readyAlert(o);
        if(o.status==='Collected'&&t.status!=='Collected')t.collectedAt=Date.now();
        Object.assign(t,{status:o.status,orderNumber:o.orderNumber,pizzaName:o.pizzaName,slot:o.slot,audit:o.audit});
      }catch{}
    }
    tracked=tracked.filter(t=>!(t.status==='Collected'&&Date.now()-(t.collectedAt||0)>60*60*1000)&&t.status!=='Cancelled'||t.latest);
    saveTracked();renderTrackers();
  }finally{tracking=false;}
}
setInterval(()=>{if(!document.hidden)refreshTracked();},8000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refreshTracked();});
window.addEventListener('focus',()=>refreshTracked());
renderTrackers();refreshTracked();
const _origShowForm=showOrderForm;
// Re-render the tracker panel whenever the order form is shown again.
showOrderForm=function(...args){const r=_origShowForm.apply(this,args);renderTrackers();return r;};

// ---- Pop-up notifications (Android/desktop browsers; iPhone only when added to the Home Screen) ----
let pushKey='';
fetch('/api/push-key',{cache:'no-store'}).then(r=>r.json()).then(d=>{pushKey=d.publicKey||'';}).catch(()=>{});
function pushSupported(){return 'serviceWorker' in navigator&&'PushManager' in window&&'Notification' in window;}
function urlB64(base64){const pad='='.repeat((4-base64.length%4)%4),b=(base64+pad).replace(/-/g,'+').replace(/_/g,'/'),raw=atob(b);return Uint8Array.from([...raw].map(c=>c.charCodeAt(0)));}
let notifyOrder=null;
function showNotifyOption(o){
  notifyOrder=o;const box=$('#notifyBox'),btn=$('#notifyButton'),help=$('#notifyHelp');
  box.classList.remove('hidden');btn.disabled=false;
  const ios=/iPhone|iPad|iPod/.test(navigator.userAgent),standalone=window.matchMedia&&matchMedia('(display-mode: standalone)').matches;
  if(!pushSupported()){btn.classList.add('hidden');help.textContent=ios&&!standalone?'On iPhone, pop-up alerts only work if this page is added to your Home Screen. Keep this page open instead and it will beep when your pizza is ready.':'Pop-up alerts are not available on this browser. Keep this page open instead.';return;}
  btn.classList.remove('hidden');
  if(Notification.permission==='denied'){btn.classList.add('hidden');help.textContent='Notifications are blocked for this site in your browser settings. Keep this page open instead.';return;}
  if(Notification.permission==='granted'){subscribeForOrder(o,true);return;}
  btn.textContent='🔔 Notify me when it\'s ready';help.textContent='Get a pop-up on your phone even if this page is closed.';
}
async function subscribeForOrder(o,silent){
  const btn=$('#notifyButton'),help=$('#notifyHelp');
  try{
    if(!pushKey){const d=await (await fetch('/api/push-key',{cache:'no-store'})).json();pushKey=d.publicKey||'';}
    if(!pushKey)throw new Error('Notifications are not set up yet.');
    const reg=await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready;
    let sub=await reg.pushManager.getSubscription();
    if(!sub)sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:urlB64(pushKey)});
    const r=await fetch(`/api/orders/${encodeURIComponent(o.id)}/push`,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({subscription:sub.toJSON()})});
    if(!r.ok)throw new Error((await r.json()).error||'Could not turn on notifications.');
    btn.textContent='✓ You\'ll get a pop-up when it\'s ready';btn.disabled=true;help.textContent='';
  }catch(error){if(!silent){help.textContent=(error&&error.message)||'Could not turn on notifications. Keep this page open instead.';}else{btn.textContent='🔔 Notify me when it\'s ready';}}
}
$('#notifyButton').addEventListener('click',async()=>{
  if(!notifyOrder)return;unlockSound();
  const perm=await Notification.requestPermission();
  if(perm!=='granted'){$('#notifyHelp').textContent='No problem: keep this page open and it will beep when your pizza is ready.';$('#notifyButton').classList.add('hidden');return;}
  subscribeForOrder(notifyOrder,false);
});
