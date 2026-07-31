const icons={Pepperoni:'🍕',Ham:'🥓',Mushrooms:'🍄','Red onion':'🧅','Yellow pepper':'🟡','Green pepper':'🫑','Black olives':'🫒',Pineapple:'🍍',Jalapeños:'🌶️',Chillies:'🔥','Garlic oil':'🧄','Chilli oil':'🌶️',None:'➖',standard:'🍞','gluten-free':'🌾'};
const state={config:null,specialKey:'',toppings:[],oil:'None',base:'standard'};
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
    renderBases();
    renderSlots(previousSlot);
    updateAvailability();
    updateReview();
  }finally{loadingConfig=false;}
}

function renderChoices(){
  $('#toppings').innerHTML=state.config.toppings.map(t=>`<label class="choice"><input type="checkbox" value="${escapeHtml(t)}" ${state.toppings.includes(t)?'checked':''}><span>${icons[t]||'•'}</span><span>${escapeHtml(t)}</span></label>`).join('')||'<p class="muted">No toppings currently available.</p>';
  if(!state.config.oils.includes(state.oil))state.oil='None';
  $('#oils').innerHTML=state.config.oils.map(o=>`<label class="choice"><input type="radio" name="oil" value="${escapeHtml(o)}" ${o===state.oil?'checked':''}><span>${icons[o]||'•'}</span><span>${escapeHtml(o)}</span></label>`).join('');
  $('#toppingCount').textContent=state.toppings.length;
  document.querySelectorAll('.pizza-card').forEach(button=>{
    const unavailable=button.dataset.special!=='custom'&&state.config.unavailableSpecials?.[button.dataset.special];
    button.disabled=Boolean(unavailable);
    button.classList.toggle('unavailable',Boolean(unavailable));
    button.title=unavailable?'One or more ingredients are unavailable':'';
  });
}

function renderBases(){
  const currentBaseAvailable=state.config.bases.some(base=>base.key===state.base&&!(base.key==='gluten-free'&&state.config.glutenFreeRemaining<=0));
  if(!currentBaseAvailable)state.base='standard';
  $('#bases').innerHTML=state.config.bases.map(base=>{const soldOut=base.key==='gluten-free'&&state.config.glutenFreeRemaining<=0;return `<label class="choice ${soldOut?'unavailable':''}"><input type="radio" name="base" value="${escapeHtml(base.key)}" ${base.key===state.base?'checked':''} ${soldOut?'disabled':''}><span>${icons[base.key]||'🍕'}</span><span>${escapeHtml(base.name)}${base.key==='gluten-free'?` (${state.config.glutenFreeRemaining} left)`:''}</span></label>`;}).join('');
  $('#baseHelp').textContent=`Only ${state.config.glutenFreeLimit} gluten-free pizzas are available in total. ${state.config.glutenFreeRemaining} remaining.`;
}

function renderSlots(previousSlot=''){
  const used=new Set(state.config.usedSlots),options=state.config.slots.filter(s=>!used.has(s)||s===previousSlot);
  $('#slot').innerHTML='<option value="">Select a time</option>'+options.map(s=>`<option value="${s}">${s}</option>`).join('');
  if(previousSlot&&options.includes(previousSlot))$('#slot').value=previousSlot;
  const soldOut=!options.length||state.config.remaining<=0;
  if(soldOut)$('#slot').innerHTML='<option value="">No slots remaining</option>';
  submitButton.disabled=soldOut;
}

function updateAvailability(){$('#remainingBadge').textContent=`${state.config.remaining} pizzas remaining`;$('#gfBadge').textContent=`${state.config.glutenFreeRemaining} gluten-free remaining`;}
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
function updateReview(){if(!state.config)return;const name=$('#customerName').value.trim()||'Not entered',slot=$('#slot').value||'Not selected',selected=document.querySelector('.pizza-card.selected');if(!selected){$('#review').innerHTML='<p>Choose your pizza to see the order summary.</p>';return;}const pizza=selection(),toppingText=pizza.toppings.length?pizza.toppings.join(', '):'Cheese and tomato only',baseName=state.config.bases.find(b=>b.key===state.base)?.name||'Standard base';$('#review').innerHTML=`<div class="review-row"><b>Collector</b><span>${escapeHtml(name)}</span></div><div class="review-row"><b>Pizza</b><span>${escapeHtml(pizza.name)}</span></div><div class="review-row"><b>Base</b><span>${escapeHtml(baseName)}</span></div><div class="review-row"><b>Toppings</b><span>${escapeHtml(toppingText)}</span></div><div class="review-row"><b>Drizzle</b><span>${escapeHtml(pizza.oil)}</span></div><div class="review-row"><b>Collection</b><span>${escapeHtml(slot)}</span></div>`;}

function showOrderForm({scroll=true}={}){
  success.classList.add('hidden');
  form.classList.remove('hidden');
  history.replaceState({view:'order'},'',location.pathname);
  if(scroll)window.scrollTo({top:0,behavior:'smooth'});
}
function resetForm(){
  form.reset();state.specialKey='';state.toppings=[];state.oil='None';state.base='standard';
  document.querySelectorAll('.pizza-card').forEach(b=>b.classList.remove('selected'));
  customBuilder.classList.add('hidden');$('#toppingCount').textContent='0';hideMessage();
  loadConfig({preserveSelection:false}).catch(error=>showMessage(error.message));
  showOrderForm();
}

// Event delegation keeps controls working after choices are re-rendered.
document.addEventListener('change',event=>{
  if(event.target.matches('#toppings input')){const checked=[...document.querySelectorAll('#toppings input:checked')];if(checked.length>4){event.target.checked=false;showMessage('Choose a maximum of four toppings.');return;}state.toppings=checked.map(i=>i.value);$('#toppingCount').textContent=state.toppings.length;hideMessage();updateReview();}
  if(event.target.matches('#oils input')){state.oil=event.target.value;updateReview();}
  if(event.target.matches('#bases input')){state.base=event.target.value;updateReview();}
});
document.querySelectorAll('.pizza-card').forEach(button=>button.addEventListener('click',()=>choosePizza(button.dataset.special)));
['customerName','slot'].forEach(id=>$('#'+id).addEventListener('input',updateReview));
$('#confirm').addEventListener('change',hideMessage);

form.addEventListener('submit',async event=>{
  event.preventDefault();hideMessage();
  const selected=document.querySelector('.pizza-card.selected');
  if(!selected)return showMessage('Choose a pizza.');
  if(!$('#customerName').value.trim())return showMessage('Enter the collector name.');
  if(!$('#slot').value)return showMessage('Choose a collection time.');
  if(!$('#confirm').checked)return showMessage('Please confirm that you have checked the order.');
  submitButton.disabled=true;submitButton.textContent='Reserving…';
  try{
    const response=await fetch('/api/orders',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({customerName:$('#customerName').value,specialKey:state.specialKey,toppings:state.toppings,oil:state.oil,base:state.base,slot:$('#slot').value})});
    const data=await response.json();if(!response.ok)throw new Error(data.error||'Unable to reserve the pizza.');
    const o=data.order;const baseName=state.config.bases.find(b=>b.key===o.base)?.name||'Standard base';
    form.classList.add('hidden');success.classList.remove('hidden');
    $('#successDetails').innerHTML=`<p><strong>Order #${o.orderNumber}</strong></p><p>${escapeHtml(o.customerName)}, collect your <strong>${escapeHtml(o.pizzaName)}</strong> with a <strong>${escapeHtml(baseName)}</strong> at <strong>${escapeHtml(o.slot)}</strong>.</p>`;
    history.pushState({view:'success'},'',`${location.pathname}#booked`);
    window.scrollTo({top:0,behavior:'smooth'});
  }catch(error){showMessage(error.message);await loadConfig();}
  finally{submitButton.disabled=false;submitButton.textContent='Reserve my pizza';}
});

$('#anotherOrder').addEventListener('click',resetForm);
window.addEventListener('popstate',()=>showOrderForm({scroll:false}));
window.addEventListener('pageshow',event=>{if(event.persisted){showOrderForm({scroll:false});loadConfig().catch(error=>showMessage(error.message));}});
window.addEventListener('unhandledrejection',event=>{showMessage(event.reason?.message||'Something went wrong. Please refresh and try again.');});
history.replaceState({view:'order'},'',location.pathname);
loadConfig().catch(error=>showMessage(error.message));
