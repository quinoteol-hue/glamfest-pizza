const icons={Pepperoni:'🍕',Ham:'🥓',Mushrooms:'🍄','Red onion':'🧅','Yellow pepper':'🟡','Green pepper':'🫑','Black olives':'🫒',Pineapple:'🍍',Jalapeños:'🌶️',Chillies:'🔥','Garlic oil':'🧄','Chilli oil':'🌶️',None:'➖'};
const state={config:null,specialKey:'',toppings:[],oil:'None'};
const $=s=>document.querySelector(s);
const form=$('#orderForm'),customBuilder=$('#customBuilder'),message=$('#message'),submitButton=$('#submitButton');

async function loadConfig(){
  const response=await fetch('/api/config',{cache:'no-store'});
  if(!response.ok) throw new Error('Unable to load ordering information.');
  state.config=await response.json();
  renderChoices(); renderSlots(); updateAvailability(); updateReview();
}
function renderChoices(){
  $('#toppings').innerHTML=state.config.toppings.map(t=>`<label class="choice"><input type="checkbox" value="${t}"><span>${icons[t]||'•'}</span><span>${t}</span></label>`).join('');
  $('#oils').innerHTML=state.config.oils.map(o=>`<label class="choice"><input type="radio" name="oil" value="${o}" ${o==='None'?'checked':''}><span>${icons[o]||'•'}</span><span>${o}</span></label>`).join('');
  $('#toppings').addEventListener('change',e=>{
    const checked=[...document.querySelectorAll('#toppings input:checked')];
    if(checked.length>4){e.target.checked=false;showMessage('Choose a maximum of four toppings.');return;}
    state.toppings=checked.map(i=>i.value); $('#toppingCount').textContent=state.toppings.length; hideMessage(); updateReview();
  });
  $('#oils').addEventListener('change',e=>{state.oil=e.target.value;updateReview();});
}
function renderSlots(){
  const used=new Set(state.config.usedSlots);
  const options=state.config.slots.filter(s=>!used.has(s));
  $('#slot').innerHTML='<option value="">Select a time</option>'+options.map(s=>`<option value="${s}">${s}</option>`).join('');
  if(!options.length){$('#slot').innerHTML='<option value="">No slots remaining</option>';submitButton.disabled=true;}
}
function updateAvailability(){
  $('#remainingBadge').textContent=`${state.config.remaining} pizzas remaining`;
}
function choosePizza(key){
  state.specialKey=key==='custom'?'':key;
  document.querySelectorAll('.pizza-card').forEach(b=>b.classList.toggle('selected',b.dataset.special===key));
  customBuilder.classList.toggle('hidden',key!=='custom');
  if(key!=='custom'){state.toppings=[];state.oil='None';document.querySelectorAll('#toppings input').forEach(i=>i.checked=false);$('#toppingCount').textContent='0';}
  updateReview();
}
function selection(){
  if(state.specialKey){const s=state.config.specials[state.specialKey];return{name:s.name,toppings:s.toppings,oil:s.oil};}
  return{name:'Build Your Own',toppings:state.toppings,oil:state.oil};
}
function updateReview(){
  if(!state.config)return;
  const name=$('#customerName').value.trim()||'Not entered';
  const slot=$('#slot').value||'Not selected';
  const selected=document.querySelector('.pizza-card.selected');
  if(!selected){$('#review').innerHTML='<p>Choose your pizza to see the order summary.</p>';return;}
  const pizza=selection();
  const toppingText=pizza.toppings.length?pizza.toppings.join(', '):'Cheese and tomato only';
  const iconText=pizza.toppings.map(t=>icons[t]||'•').join(' ')+(pizza.oil!=='None'?` ${icons[pizza.oil]}`:'');
  $('#review').innerHTML=`<div class="review-row"><b>Collector</b><span>${escapeHtml(name)}</span></div><div class="review-row"><b>Pizza</b><span>${escapeHtml(pizza.name)}</span></div><div class="review-row"><b>Toppings</b><span>${escapeHtml(toppingText)}</span></div><div class="review-row"><b>Drizzle</b><span>${escapeHtml(pizza.oil)}</span></div><div class="review-row"><b>Collection</b><span>${escapeHtml(slot)}</span></div><div class="review-icons">${iconText}</div>`;
}
function escapeHtml(value){return String(value).replace(/[&<>'"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));}
function showMessage(text){message.textContent=text;message.classList.remove('hidden');message.scrollIntoView({behavior:'smooth',block:'center'});}
function hideMessage(){message.classList.add('hidden');}

document.querySelectorAll('.pizza-card').forEach(button=>button.addEventListener('click',()=>choosePizza(button.dataset.special)));
['customerName','slot'].forEach(id=>$('#'+id).addEventListener('input',updateReview));
$('#confirm').addEventListener('change',hideMessage);

form.addEventListener('submit',async event=>{
  event.preventDefault(); hideMessage();
  const selected=document.querySelector('.pizza-card.selected');
  if(!selected)return showMessage('Choose a pizza.');
  if(!$('#customerName').value.trim())return showMessage('Enter the collector name.');
  if(!$('#slot').value)return showMessage('Choose a collection time.');
  if(!$('#confirm').checked)return showMessage('Please confirm that you have checked the order.');
  submitButton.disabled=true;submitButton.textContent='Reserving…';
  try{
    const response=await fetch('/api/orders',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({customerName:$('#customerName').value,specialKey:state.specialKey,toppings:state.toppings,oil:state.oil,slot:$('#slot').value})});
    const data=await response.json(); if(!response.ok)throw new Error(data.error||'Unable to reserve the pizza.');
    const o=data.order;
    form.classList.add('hidden');$('#success').classList.remove('hidden');
    $('#successDetails').innerHTML=`<p><strong>Order #${o.orderNumber}</strong></p><p>${escapeHtml(o.customerName)}, collect your <strong>${escapeHtml(o.pizzaName)}</strong> at <strong>${escapeHtml(o.slot)}</strong>.</p><p>${o.toppings.map(t=>icons[t]||'').join(' ')} ${o.oil!=='None'?(icons[o.oil]||''):''}</p>`;
    window.scrollTo({top:0,behavior:'smooth'});
  }catch(error){showMessage(error.message);await loadConfig();}
  finally{submitButton.disabled=false;submitButton.textContent='Reserve my pizza';}
});
$('#anotherOrder').addEventListener('click',()=>location.reload());
loadConfig().catch(error=>showMessage(error.message));
