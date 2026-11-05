import http from 'node:http';
import { slotHasPassed, eventIsOver, DEFAULT_EVENT_DATE } from './booking-clock.mjs';
import webpush from 'web-push';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const ADMIN_PIN = String(process.env.ADMIN_PIN || '222');
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'orders.json');
const DEFAULT_MAX_PIZZAS = 80;
const DEFAULT_SERVICE = {serviceStart:'12:00',serviceEnd:'14:30',slotMinutes:3,pizzasPerSlot:1};
// Audit team: their pizzas are all ready together at the start of their break.
// The kitchen cooking time just before the break (one pizza per slot) is kept free of staff bookings.
const DEFAULT_AUDIT = {auditEnabled:true,auditBreakStart:'13:00',auditBreakMinutes:40,auditPizzas:15};
const TOPPINGS = ['Pepperoni','Ham','Mushrooms','Red onion','White onion','Red pepper','Yellow pepper','Green pepper','Orange pepper','Sweetcorn','Black olives','Pineapple','Jalapeños','Chillies'];
const DRINKS = ['Orange Tango','Apple Tango','Coke Zero','Diet Coke'];
const CANS_PER_DRINK = 20;
// Drinks are set on the kitchen board (name + number of cans); these are the defaults.
const DEFAULT_DRINKS = DRINKS.map(name=>({name,cans:CANS_PER_DRINK}));
function normaliseDrinks(value){
  if(!Array.isArray(value))return DEFAULT_DRINKS.map(d=>({...d}));
  const seen=new Set(),out=[];
  for(const item of value.slice(0,12)){
    const name=cleanText(item&&item.name,30);if(!name||seen.has(name.toLowerCase()))continue;seen.add(name.toLowerCase());
    out.push({name,cans:clampInt(item.cans,0,500,0)});
  }
  return out;
}
function drinkChoices(orders,settings){
  return settings.drinks.map(({name,cans})=>{const ordered=orders.filter(order=>order.drink===name).length;return{name,cans,ordered,remaining:Math.max(0,cans-ordered)};});
}
const OILS = ['None'];
const SPECIALS = {
  resus:{name:'Resus Pizza',toppings:['Pepperoni','Jalapeños','Chillies'],oil:'None'},
  paeds:{name:'Paeds Pizza',toppings:['Ham','Pineapple'],oil:'None'},
  triage:{name:'Triage Pizza',toppings:['Red pepper','Yellow pepper','Green pepper','Orange pepper'],oil:'None'}
};
let writeQueue=Promise.resolve();
function cleanText(value,max=80){return String(value??'').trim().replace(/\s+/g,' ').slice(0,max);}
function toMinutes(hhmm){const m=/^(\d{1,2}):(\d{2})$/.exec(String(hhmm||''));if(!m)return NaN;const h=Number(m[1]),min=Number(m[2]);return h<24&&min<60?h*60+min:NaN;}
function toHHMM(minutes){return `${String(Math.floor(minutes/60)).padStart(2,'0')}:${String(minutes%60).padStart(2,'0')}`;}
function allSlots(settings){const slots=[];for(let m=toMinutes(settings.serviceStart);m<=toMinutes(settings.serviceEnd);m+=settings.slotMinutes)slots.push(toHHMM(m));return slots;}
function normaliseTime(value,fallback){let m=toMinutes(cleanText(value,5));if(!Number.isFinite(m))m=toMinutes(fallback);return toHHMM(m);}
function defaultSettings(){return{eventDate:DEFAULT_EVENT_DATE,maxPizzas:DEFAULT_MAX_PIZZAS,unavailableIngredients:[],...DEFAULT_SERVICE,...DEFAULT_AUDIT};}
function clampInt(value,min,max,fallback){const n=Number.parseInt(value,10);return Number.isFinite(n)?Math.max(min,Math.min(max,n)):fallback;}
function normaliseSettings(value={}){
  const maxPizzas=clampInt(value.maxPizzas,1,200,DEFAULT_MAX_PIZZAS);
  const valid=new Set([...TOPPINGS,...OILS.filter(o=>o!=='None')]);
  const unavailableIngredients=Array.isArray(value.unavailableIngredients)?[...new Set(value.unavailableIngredients.map(v=>cleanText(v,30)).filter(v=>valid.has(v)))]:[];
  const auditEnabled=value.auditEnabled===undefined?DEFAULT_AUDIT.auditEnabled:Boolean(value.auditEnabled);
  const start=toMinutes(normaliseTime(value.auditBreakStart,DEFAULT_AUDIT.auditBreakStart));
  const serviceStart=normaliseTime(value.serviceStart,DEFAULT_SERVICE.serviceStart);
  let serviceEnd=normaliseTime(value.serviceEnd,DEFAULT_SERVICE.serviceEnd);
  if(toMinutes(serviceEnd)<toMinutes(serviceStart))serviceEnd=serviceStart;
  const slotMinutes=clampInt(value.slotMinutes,1,15,DEFAULT_SERVICE.slotMinutes);
  const pizzasPerSlot=clampInt(value.pizzasPerSlot,1,6,DEFAULT_SERVICE.pizzasPerSlot);
  const auditBreakMinutes=clampInt(value.auditBreakMinutes,10,120,DEFAULT_AUDIT.auditBreakMinutes);
  const auditPizzas=clampInt(value.auditPizzas,0,80,DEFAULT_AUDIT.auditPizzas);
  const eventDate=/^\d{4}-\d{2}-\d{2}$/.test(String(value.eventDate||''))?String(value.eventDate):DEFAULT_EVENT_DATE;
  const eventFinished=value.eventFinished===true;
  const drinks=normaliseDrinks(value.drinks);
  return{eventDate,eventFinished,drinks,maxPizzas,unavailableIngredients,serviceStart,serviceEnd,slotMinutes,pizzasPerSlot,auditEnabled,auditBreakStart:toHHMM(start),auditBreakMinutes,auditPizzas};
}
// Staff slots kept free so the kitchen can cook the audit pizzas before their break starts.
function auditPrepSlots(settings){
  if(!settings.auditEnabled||!settings.auditPizzas)return new Set();
  const start=toMinutes(settings.auditBreakStart),from=start-Math.ceil(settings.auditPizzas/settings.pizzasPerSlot)*settings.slotMinutes;
  return new Set(allSlots(settings).filter(s=>{const m=toMinutes(s);return m>=from&&m<start;}));
}
function capacityInfo(settings){const slots=allSlots(settings).length,prep=auditPrepSlots(settings).size,staff=(slots-prep)*settings.pizzasPerSlot,audit=settings.auditEnabled?settings.auditPizzas:0;return{slots,staff,audit,timetable:staff+audit};}
function auditInfo(settings,active){
  const start=toMinutes(settings.auditBreakStart),prep=[...auditPrepSlots(settings)].sort(),booked=active.filter(o=>o.audit).length;
  return{enabled:settings.auditEnabled,breakStart:settings.auditBreakStart,breakEnd:toHHMM(start+settings.auditBreakMinutes),breakMinutes:settings.auditBreakMinutes,reserved:settings.auditPizzas,booked,remaining:slotHasPassed(settings.auditBreakStart,undefined,settings.eventDate)?0:Math.max(0,settings.auditPizzas-booked),prepFrom:prep[0]||'',prepTo:prep.length?toHHMM(toMinutes(prep[prep.length-1])+settings.slotMinutes):''};
}
// Storage: Postgres when DATABASE_URL is set (free hosting has no persistent disk), otherwise a local JSON file.
const DATABASE_URL=process.env.DATABASE_URL||'';
let pool=null;
function parseStore(parsed){parsed=parsed&&typeof parsed==='object'?parsed:{};return{orders:Array.isArray(parsed.orders)?parsed.orders:[],settings:normaliseSettings(parsed.settings),vapid:parsed.vapid&&parsed.vapid.publicKey?parsed.vapid:undefined};}
async function ensureStore(){
  if(DATABASE_URL){
    if(!pool){const {default:pg}=await import('pg');const local=/localhost|127\.0\.0\.1/.test(DATABASE_URL);pool=new pg.Pool({connectionString:DATABASE_URL,ssl:local||process.env.PGSSL==='disable'?false:{rejectUnauthorized:false},max:5});pool.on('error',err=>console.error('Postgres pool error:',err.message));}
    await pool.query('CREATE TABLE IF NOT EXISTS pizza_store (id INTEGER PRIMARY KEY, data JSONB NOT NULL)');
    await pool.query('INSERT INTO pizza_store (id,data) VALUES (1,$1) ON CONFLICT (id) DO NOTHING',[JSON.stringify({orders:[],settings:defaultSettings()})]);
    return;
  }
  await fs.mkdir(DATA_DIR,{recursive:true});try{await fs.access(DATA_FILE);}catch{await fs.writeFile(DATA_FILE,JSON.stringify({orders:[],settings:defaultSettings()},null,2));}
}
async function readStore(){
  if(DATABASE_URL){const {rows}=await pool.query('SELECT data FROM pizza_store WHERE id=1');return parseStore(rows[0]?.data);}
  return parseStore(JSON.parse(await fs.readFile(DATA_FILE,'utf8')));
}
async function writeStoreFile(store){const tmp=`${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;await fs.writeFile(tmp,JSON.stringify(store,null,2));await fs.rename(tmp,DATA_FILE);}
async function runMutation(mutator){
  if(DATABASE_URL){
    const client=await pool.connect();
    try{await client.query('BEGIN');const {rows}=await client.query('SELECT data FROM pizza_store WHERE id=1 FOR UPDATE');const store=parseStore(rows[0]?.data);const result=await mutator(store);store.settings=normaliseSettings(store.settings);await client.query('UPDATE pizza_store SET data=$1 WHERE id=1',[JSON.stringify(store)]);await client.query('COMMIT');return result;}
    catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
    finally{client.release();}
  }
  const store=await readStore();const result=await mutator(store);store.settings=normaliseSettings(store.settings);await writeStoreFile(store);return result;
}
// Serialise writes. The queue must never stay rejected: previously one refused order (e.g. a taken slot)
// left writeQueue rejected, so every later order and kitchen change failed until the server restarted.
function mutateStore(mutator){const run=writeQueue.then(()=>runMutation(mutator));writeQueue=run.catch(()=>{});return run;}
function activeOrders(store){return store.orders.filter(o=>o.status!=='Cancelled');}
function unavailableSpecials(settings){const unavailable=new Set(settings.unavailableIngredients);return Object.fromEntries(Object.entries(SPECIALS).map(([key,s])=>[key,[...s.toppings,s.oil].some(i=>i!=='None'&&unavailable.has(i))]));}
// Optional UK mobile for the kitchen's WhatsApp "ready" message. Stored as 447XXXXXXXXX.
function normalisePhone(value){
  const raw=cleanText(value,30);if(!raw)return '';
  let digits=raw.replace(/[\s()+.-]/g,'');
  if(!/^\d+$/.test(digits))throw new Error('Enter a UK mobile number like 07700 900123, or leave it blank.');
  if(digits.startsWith('0044'))digits=digits.slice(2);
  if(digits.startsWith('07'))digits='44'+digits.slice(1);
  if(!/^447\d{9}$/.test(digits))throw new Error('Enter a UK mobile number like 07700 900123, or leave it blank.');
  return digits;
}
// What the kitchen board may see of an order (never the notification subscription).
function kitchenView(o){const {push,...rest}=o;return{...rest,notify:Boolean(push)};}
// What the customer's own phone may see when tracking an order.
function customerView(o){return{id:o.id,orderNumber:o.orderNumber,customerName:o.customerName,pizzaName:o.pizzaName,slot:o.slot,audit:Boolean(o.audit),status:o.status,drink:o.drink||'',updatedAt:o.updatedAt};}
function firstName(name){return String(name||'').trim().split(/\s+/)[0].slice(0,20);}
// Phone numbers and notification details are only kept until the pizza is collected or the event is over.
function forgetContact(o){delete o.phone;delete o.push;}
async function sendReadyPush(order,settings){
  if(!order.push||!vapidReady)return;
  const body=JSON.stringify({title:'Your pizza is ready! 🍕',body:`${firstName(order.customerName)}, your ${order.pizzaName} (order #${order.orderNumber}) is ready to collect.`,url:order.audit?'/audit':'/',tag:'order-'+order.id});
  try{await webpush.sendNotification(order.push,body,{TTL:3600,urgency:'high'});}
  catch(error){if(error.statusCode===404||error.statusCode===410){await mutateStore(store=>{const o=store.orders.find(x=>x.id===order.id);if(o)delete o.push;}).catch(()=>{});}else console.error('Push failed:',error.statusCode||error.message);}
}
let vapidReady=false,vapidPublicKey='';
async function setupPush(){
  const keys=await mutateStore(store=>{if(!store.vapid)store.vapid=webpush.generateVAPIDKeys();return store.vapid;});
  const subject=(cleanText(process.env.PUBLIC_URL,300)||'https://ed-pizza-pop.onrender.com').replace(/\/+$/,'');
  webpush.setVapidDetails(subject.startsWith('https://')?subject:'https://ed-pizza-pop.onrender.com',keys.publicKey,keys.privateKey);
  vapidPublicKey=keys.publicKey;vapidReady=true;
}
async function purgeContactsIfEventOver(){
  const store=await readStore();
  if(!eventIsOver(store.settings.eventDate)||!store.orders.some(o=>o.phone||o.push))return;
  await mutateStore(st=>{if(eventIsOver(st.settings.eventDate))st.orders.forEach(forgetContact);});
}
function normaliseOrder(body,settings){
  const customerName=cleanText(body.customerName,60),specialKey=cleanText(body.specialKey,20).toLowerCase(),audit=body.group==='audit';
  let toppings=Array.isArray(body.toppings)?body.toppings.map(v=>cleanText(v,30)):[],oil='None',pizzaName='Build Your Own';
  if(specialKey&&SPECIALS[specialKey]){const s=SPECIALS[specialKey];pizzaName=s.name;toppings=[...s.toppings];oil=s.oil;}
  toppings=[...new Set(toppings)].filter(t=>TOPPINGS.includes(t));
  if(toppings.length>4)throw new Error('Choose a maximum of 4 toppings.');
  if(!OILS.includes(oil))throw new Error('Choose a valid finishing oil.');
  const unavailable=new Set(settings.unavailableIngredients);const unavailableUsed=[...toppings,oil].filter(i=>i!=='None'&&unavailable.has(i));
  if(unavailableUsed.length)throw new Error(`${unavailableUsed[0]} is no longer available. Please choose another option.`);
  if(!customerName)throw new Error('Enter the name of the person collecting the pizza.');
  let slot;
  if(audit){if(!settings.auditEnabled)throw new Error('Audit team ordering is closed. Please choose a staff collection time.');slot=settings.auditBreakStart;}
  else{slot=cleanText(body.slot,5);if(!allSlots(settings).includes(slot))throw new Error(`Choose an available collection time between ${settings.serviceStart} and ${settings.serviceEnd}.`);}
  const phone=normalisePhone(body.phone);
  const drink=cleanText(body.drink,30);
  if(drink&&!settings.drinks.some(d=>d.name===drink))throw new Error('Choose an available drink.');
  const base=SPECIALS[specialKey]?'standard':(body.base||'standard');
  if(base!=='standard'&&base!=='barbecue')throw new Error('Choose tomato or barbecue sauce.');
  return{phone,drink,customerName,pizzaName,specialKey:SPECIALS[specialKey]?specialKey:'',base,toppings,oil,slot,audit};
}
// Checks that an order (new or reopened) still fits. `active` must not include the order itself.
function assertFits(order,active,settings){
  if(settings.eventFinished)throw new Error('Pizza day has finished – thank you! Ordering is now closed.');
  if(order.drink&&!drinkChoices(active,settings).some(choice=>choice.name===order.drink&&choice.remaining>0))throw new Error('That drink has run out. Please choose another drink.');
  if(slotHasPassed(order.slot,undefined,settings.eventDate))throw new Error('That collection time has passed. Please choose a future time.');
  if(active.length>=settings.maxPizzas)throw new Error(`All ${settings.maxPizzas} pizzas have now been reserved.`);
  if(order.audit){
    if(!settings.auditEnabled)throw new Error('Audit team ordering is closed.');
    if(active.filter(o=>o.audit).length>=settings.auditPizzas)throw new Error(`All ${settings.auditPizzas} audit team pizzas have been reserved.`);
    return;
  }
  if(auditPrepSlots(settings).has(order.slot))throw new Error('That time is kept free for the audit team pizzas. Please choose another slot.');
  if(!allSlots(settings).includes(order.slot))throw new Error('That collection time is no longer offered.');
  if(active.filter(o=>!o.audit&&o.slot===order.slot).length>=settings.pizzasPerSlot)throw new Error('That time has just been taken. Please choose another slot.');
}
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json; charset=utf-8','.ico':'image/x-icon','.webmanifest':'application/manifest+json'};
function sendJson(res,status,value){const body=JSON.stringify(value);res.writeHead(status,{'content-type':MIME['.json'],'content-length':Buffer.byteLength(body),'cache-control':'no-store'});res.end(body);}
function sendFile(res,filename){fs.readFile(filename).then(data=>{res.writeHead(200,{'content-type':MIME[path.extname(filename)]||'application/octet-stream','content-length':data.length});res.end(data);}).catch(()=>sendJson(res,404,{error:'Not found.'}));}
async function bodyJson(req){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>100_000)throw new Error('Request is too large.');chunks.push(chunk);}return chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{};}
function isAdmin(req,url){return String(req.headers['x-admin-pin']||url.searchParams.get('pin')||'')===ADMIN_PIN;}


const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,`http://${req.headers.host||'localhost'}`),pathname=decodeURIComponent(url.pathname);
  if(req.method==='GET'&&pathname==='/api/config'){
    const store=await readStore(),active=activeOrders(store),unavailable=new Set(store.settings.unavailableIngredients),prep=auditPrepSlots(store.settings);
    const perSlot={};for(const o of active)if(!o.audit)perSlot[o.slot]=(perSlot[o.slot]||0)+1;
    const usedSlots=[...new Set([...Object.keys(perSlot).filter(k=>perSlot[k]>=store.settings.pizzasPerSlot),...prep,...allSlots(store.settings).filter(slot=>slotHasPassed(slot,undefined,store.settings.eventDate))])];
    return sendJson(res,200,{drinks:drinkChoices(active,store.settings),toppings:TOPPINGS.filter(i=>!unavailable.has(i)),oils:OILS.filter(i=>i==='None'||!unavailable.has(i)),specials:SPECIALS,unavailableSpecials:unavailableSpecials(store.settings),eventFinished:store.settings.eventFinished,eventDate:store.settings.eventDate,slots:allSlots(store.settings),serviceStart:store.settings.serviceStart,serviceEnd:store.settings.serviceEnd,pizzasPerSlot:store.settings.pizzasPerSlot,slotMinutes:store.settings.slotMinutes,usedSlots,maxPizzas:store.settings.maxPizzas,currentCount:active.length,remaining:Math.max(0,store.settings.maxPizzas-active.length),audit:auditInfo(store.settings,active),capacity:capacityInfo(store.settings)});
  }
  if(req.method==='GET'&&pathname==='/api/qr'){const configured=cleanText(process.env.PUBLIC_URL,300),origin=configured||`${req.headers['x-forwarded-proto']||'http'}://${req.headers.host}`,qr=u=>`https://api.qrserver.com/v1/create-qr-code/?size=900x900&ecc=H&data=${encodeURIComponent(u)}`,base=origin.replace(/\/+$/,''),auditUrl=`${base}/audit`;return sendJson(res,200,{url:origin,imageUrl:qr(origin),auditUrl,auditImageUrl:qr(auditUrl)});}
  if(req.method==='POST'&&pathname==='/api/orders'){
    try{const payload=await bodyJson(req);const order=await mutateStore(store=>{const input=normaliseOrder(payload,store.settings);assertFits(input,activeOrders(store),store.settings);const now=new Date().toISOString();const created={id:crypto.randomUUID(),orderNumber:store.orders.reduce((m,o)=>Math.max(m,Number(o.orderNumber)||0),0)+1,...input,status:'Pending',createdAt:now,updatedAt:now};store.orders.push(created);return created;});return sendJson(res,201,{order,audit:order.audit?auditInfo((await readStore()).settings,[]):undefined});}catch(error){return sendJson(res,400,{error:error.message||'Unable to place the order.'});}
  }
  if(pathname==='/api/admin/orders'&&req.method==='GET'){if(!isAdmin(req,url))return sendJson(res,401,{error:'Incorrect admin PIN.'});const store=await readStore(),active=activeOrders(store);return sendJson(res,200,{drinkStock:drinkChoices(active,store.settings).map(d=>({name:d.name,total:d.cans,ordered:d.ordered})),orders:[...store.orders].map(kitchenView).sort((a,b)=>a.slot.localeCompare(b.slot)||Number(Boolean(b.audit))-Number(Boolean(a.audit))||a.orderNumber-b.orderNumber),settings:store.settings,audit:auditInfo(store.settings,active),capacity:capacityInfo(store.settings),ingredients:[...TOPPINGS,...OILS.filter(o=>o!=='None')]});}
  if(pathname==='/api/admin/settings'&&req.method==='PATCH'){
    if(!isAdmin(req,url))return sendJson(res,401,{error:'Incorrect admin PIN.'});
    try{const payload=await bodyJson(req);if(payload&&'eventDate' in payload&&!/^\d{4}-\d{2}-\d{2}$/.test(String(payload.eventDate)))throw new Error('Choose the pizza day date.');const settings=await mutateStore(store=>{const active=activeOrders(store),merged={...store.settings,...payload};if(payload&&payload.eventDate&&payload.eventDate!==store.settings.eventDate&&!('eventFinished' in payload))merged.eventFinished=false;const next=normaliseSettings(merged);if(next.eventFinished)store.orders.forEach(forgetContact);
      if(payload.releaseUnusedAudit===true)next.auditPizzas=active.filter(order=>order.audit).length;
      // A stock limit below the orders already booked is allowed: existing orders stay, new orders stop.
      const auditBooked=active.filter(o=>o.audit);
      if(auditBooked.length&&(!next.auditEnabled||next.auditPizzas<auditBooked.length))throw new Error(`There are ${auditBooked.length} active audit team orders. Cancel them first, or keep at least that many audit pizzas.`);
      if(auditBooked.length&&next.auditBreakStart!==store.settings.auditBreakStart){for(const o of auditBooked){o.slot=next.auditBreakStart;o.updatedAt=new Date().toISOString();}}
      const staff=active.filter(o=>!o.audit),slotSet=new Set(allSlots(next)),outside=staff.filter(o=>!slotSet.has(o.slot));
      if(outside.length)throw new Error(`${outside.length} staff order(s) are booked at ${[...new Set(outside.map(o=>o.slot))].sort().join(', ')}, which would no longer be a collection time with these settings (${next.serviceStart}–${next.serviceEnd}, every ${next.slotMinutes} min). Cancel or rebook those orders first, or keep the old settings.`);
      const counts={};for(const o of staff)counts[o.slot]=(counts[o.slot]||0)+1;const busiest=Math.max(0,...Object.values(counts));
      if(busiest>next.pizzasPerSlot)throw new Error(`One time already has ${busiest} pizzas booked, so pizzas per slot cannot go below ${busiest}.`);
      const prep=auditPrepSlots(next),clash=active.filter(o=>!o.audit&&prep.has(o.slot));
      if(clash.length)throw new Error(`The audit cooking time (${[...prep].sort()[0]}–${next.auditBreakStart}) would overlap ${clash.length} staff order(s) already booked at ${[...new Set(clash.map(o=>o.slot))].sort().join(', ')}. Move or cancel those first, or change the break time.`);
      store.settings=next;return next;});purgeContactsIfEventOver().catch(()=>{});return sendJson(res,200,{settings});}catch(error){return sendJson(res,400,{error:error.message});}
  }
  if(pathname==='/api/admin/reset'&&req.method==='POST'){
    if(!isAdmin(req,url))return sendJson(res,401,{error:'Incorrect admin PIN.'});
    try{const payload=await bodyJson(req);if(cleanText(payload.confirm,10)!=='RESET')throw new Error('Type RESET to confirm.');
      const removed=await mutateStore(store=>{const n=store.orders.length;store.orders=[];return n;});return sendJson(res,200,{removed});}
    catch(error){return sendJson(res,400,{error:error.message});}
  }
  const adminMatch=pathname.match(/^\/api\/admin\/orders\/([^/]+)$/);
  if(adminMatch&&req.method==='PATCH'){
    if(!isAdmin(req,url))return sendJson(res,401,{error:'Incorrect admin PIN.'});const allowed=new Set(['Pending','Preparing','Ready','Collected','Cancelled']),payload=await bodyJson(req),status=cleanText(payload.status,20);if(!allowed.has(status))return sendJson(res,400,{error:'Invalid status.'});
    try{const order=await mutateStore(store=>{const found=store.orders.find(o=>o.id===adminMatch[1]);if(!found)throw new Error('Order not found.');if(status!=='Cancelled'&&found.status==='Cancelled'){if(found.audit)found.slot=store.settings.auditBreakStart;assertFits(found,activeOrders(store).filter(o=>o.id!==found.id),store.settings);}const wasReady=found.status==='Ready';found.status=status;found.updatedAt=new Date().toISOString();const notify=status==='Ready'&&!wasReady?{...found}:null;if(status==='Collected')forgetContact(found);return {order:kitchenView(found),notify,settings:store.settings};});if(order.notify)sendReadyPush(order.notify,order.settings);return sendJson(res,200,{order:order.order});}catch(error){return sendJson(res,400,{error:error.message});}
  }
  if(adminMatch&&req.method==='DELETE'){if(!isAdmin(req,url))return sendJson(res,401,{error:'Incorrect admin PIN.'});try{const deleted=await mutateStore(store=>{const index=store.orders.findIndex(o=>o.id===adminMatch[1]);if(index<0)throw new Error('Order not found.');return store.orders.splice(index,1)[0];});return sendJson(res,200,{deleted:kitchenView(deleted)});}catch(error){return sendJson(res,400,{error:error.message});}}
  const trackMatch=pathname.match(/^\/api\/orders\/([0-9a-f-]{36})\/(status|push)$/);
  if(trackMatch&&trackMatch[2]==='status'&&req.method==='GET'){
    const store=await readStore(),o=store.orders.find(x=>x.id===trackMatch[1]);
    return o?sendJson(res,200,{order:customerView(o)}):sendJson(res,404,{error:'Order not found.'});
  }
  if(trackMatch&&trackMatch[2]==='push'&&req.method==='POST'){
    try{const payload=await bodyJson(req),sub=payload&&payload.subscription;
      if(!sub||typeof sub.endpoint!=='string'||!/^https:\/\//.test(sub.endpoint)||!sub.keys||typeof sub.keys.p256dh!=='string'||typeof sub.keys.auth!=='string')throw new Error('Notifications are not available on this phone.');
      const clean={endpoint:sub.endpoint.slice(0,1000),keys:{p256dh:sub.keys.p256dh.slice(0,200),auth:sub.keys.auth.slice(0,100)}};
      const order=await mutateStore(store=>{const o=store.orders.find(x=>x.id===trackMatch[1]);if(!o)throw new Error('Order not found.');if(o.status==='Collected'||o.status==='Cancelled')throw new Error('This order is already finished.');o.push=clean;return {...o};});
      if(order.status==='Ready')sendReadyPush(order);
      return sendJson(res,200,{ok:true});}
    catch(error){return sendJson(res,400,{error:error.message});}
  }
  if(req.method==='GET'&&pathname==='/api/push-key')return sendJson(res,200,{publicKey:vapidReady?vapidPublicKey:''});
  if(req.method==='GET'&&pathname==='/api/board'){
    const store=await readStore(),pick=status=>store.orders.filter(o=>o.status===status).sort((a,b)=>String(a.updatedAt).localeCompare(String(b.updatedAt))).map(o=>({orderNumber:o.orderNumber,name:firstName(o.customerName),pizzaName:o.pizzaName,slot:o.slot,audit:Boolean(o.audit),since:o.updatedAt}));
    return sendJson(res,200,{ready:pick('Ready'),preparing:pick('Preparing'),received:pick('Pending'),eventFinished:store.settings.eventFinished});
  }
  if(req.method!=='GET')return sendJson(res,405,{error:'Method not allowed.'});
  if(pathname==='/ready'||pathname==='/ready/')return sendFile(res,path.join(__dirname,'public','ready.html'));
  if(pathname==='/audit'||pathname==='/audit/')return sendFile(res,path.join(__dirname,'public','index.html'));
  if(pathname==='/admin')return sendFile(res,path.join(__dirname,'public','admin.html'));
  const safePath=path.normalize(pathname).replace(/^(\.\.[/\\])+/,''),publicFile=path.join(__dirname,'public',safePath==='/'?'index.html':safePath);
  if(!publicFile.startsWith(path.join(__dirname,'public')))return sendJson(res,403,{error:'Forbidden.'});
  try{await fs.access(publicFile);return sendFile(res,publicFile);}catch{return sendFile(res,path.join(__dirname,'public','index.html'));}
 }catch(error){return sendJson(res,500,{error:error.message||'Server error.'});}
});
await ensureStore();
await setupPush().catch(error=>console.error('Push setup failed:',error.message));
await purgeContactsIfEventOver().catch(()=>{});
setInterval(()=>purgeContactsIfEventOver().catch(()=>{}),60*60*1000).unref();
function shutdown(){server.close(()=>{(pool?pool.end():Promise.resolve()).finally(()=>process.exit(0));});setTimeout(()=>process.exit(0),8000).unref();}
process.on('SIGTERM',shutdown);process.on('SIGINT',shutdown);
server.listen(PORT,()=>console.log(`Glamfest Pizza app running on http://localhost:${PORT}`));