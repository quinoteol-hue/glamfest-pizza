const icons={Pepperoni:'🍕',Ham:'🥓',Mushrooms:'🍄','Red onion':'🧅','Yellow pepper':'🟡','Green pepper':'🫑','Black olives':'🫒',Pineapple:'🍍',Jalapeños:'🌶️',Chillies:'🔥',None:'➖'};
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
    renderSlots(previousSlot);
    updateAvailability();
    updateReview();
  }finally{loadingConfig=false;}
}

function renderChoices(){
  $('#toppings').innerHTML=state.config.toppings.map(t=>`<label class="choice"><input type="checkbox" value="${escapeHtml(t)}" ${state.toppings.includes(t)?'checked':''}><span>${icons[t]||'•'}</span><span>${escapeHtml(t)}</span></label>`).join('')||'<p class="muted">No toppings currently available.</p>';
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
  const used=new Set(state.config.usedSlots),options=state.config.slots.filter(s=>!used.has(s)||s===previousSlot);
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
function updateReview(){if(!state.config)return;const name=$('#customerName').value.trim()||'Not entered',slot=AUDIT_MODE?`${state.config.audit?.breakStart||''} (audit break)`:($('#slot').value||'Not selected'),selected=document.querySelector('.pizza-card.selected');if(!selected){$('#review').innerHTML='<p>Choose your pizza to see the order summary.</p>';return;}const pizza=selection(),toppingText=pizza.toppings.length?pizza.toppings.join(', '):'Cheese and tomato only';$('#review').innerHTML=`<div class="review-row"><b>Collector</b><span>${escapeHtml(name)}</span></div><div class="review-row"><b>Pizza</b><span>${escapeHtml(pizza.name)}</span></div><div class="review-row"><b>Toppings</b><span>${escapeHtml(toppingText)}</span></div><div class="review-row"><b>Collection</b><span>${escapeHtml(slot)}</span></div>`;}

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
['customerName','slot'].forEach(id=>$('#'+id).addEventListener('input',updateReview));
$('#confirm').addEventListener('change',hideMessage);

form.addEventListener('submit',async event=>{
  event.preventDefault();hideMessage();
  const selected=document.querySelector('.pizza-card.selected');
  if(!selected)return showMessage('Choose a pizza.');
  if(!$('#customerName').value.trim())return showMessage('Enter the collector name.');
  if(!AUDIT_MODE&&!$('#slot').value)return showMessage('Choose a collection time.');
  if(AUDIT_MODE&&!auditOpen())return showMessage('All audit team pizzas have been reserved. Please speak to the pizza team.');
  if(!$('#confirm').checked)return showMessage('Please confirm that you have checked the order.');
  submitButton.disabled=true;submitButton.textContent='Reserving…';
  try{
    const response=await fetch('/api/orders',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({customerName:$('#customerName').value,specialKey:state.specialKey,toppings:state.toppings,oil:state.oil,slot:AUDIT_MODE?'':$('#slot').value,group:AUDIT_MODE?'audit':'staff'})});
    const data=await response.json();if(!response.ok)throw new Error(data.error||'Unable to reserve the pizza.');
    const o=data.order;
    form.classList.add('hidden');success.classList.remove('hidden');
    $('#successDetails').innerHTML=`<p><strong>Order #${o.orderNumber}</strong></p><p>${escapeHtml(o.customerName)}, ${o.audit?'your':'collect your'} <strong>${escapeHtml(o.pizzaName)}</strong> ${o.audit?'will be ready at the start of your break,':'at'} <strong>${escapeHtml(o.slot)}</strong>.</p>`;
    history.pushState({view:'success'},'',`${location.pathname}#booked`);
    loadConfig().catch(()=>{});
    window.scrollTo({top:0,behavior:'smooth'});
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
