import http from 'node:http';
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
const DEFAULT_GLUTEN_FREE_LIMIT = 4;
const START_MINUTES = 12 * 60;
const END_MINUTES = 14 * 60 + 30;
const SLOT_INTERVAL = 2;
const TOPPINGS = ['Pepperoni','Ham','Mushrooms','Red onion','Red pepper','Yellow pepper','Green pepper','Black olives','Pineapple','Jalapeños','Chillies','Fresh basil'];
const OILS = ['None','Garlic oil','Chilli oil'];
const BASES = [{key:'standard',name:'Standard base'},{key:'gluten-free',name:'Gluten-free base'}];
const SPECIALS = {
  resus:{name:'Resus Pizza',toppings:['Pepperoni','Jalapeños','Chillies'],oil:'Chilli oil'},
  paeds:{name:'Paeds Pizza',toppings:['Ham','Pineapple'],oil:'None'},
  triage:{name:'Triage Pizza',toppings:['Mushrooms','Red onion','Yellow pepper','Green pepper'],oil:'None'}
};
let writeQueue=Promise.resolve();
function cleanText(value,max=80){return String(value??'').trim().replace(/\s+/g,' ').slice(0,max);}
function allSlots(){const slots=[];for(let m=START_MINUTES;m<=END_MINUTES;m+=SLOT_INTERVAL){slots.push(`${String(Math.floor(m/60)).padStart(2,'0')}:${String(m%60).padStart(2,'0')}`);}return slots;}
const VALID_SLOTS=new Set(allSlots());
function defaultSettings(){return{maxPizzas:DEFAULT_MAX_PIZZAS,glutenFreeLimit:DEFAULT_GLUTEN_FREE_LIMIT,unavailableIngredients:[]};}
function normaliseSettings(value={}){
  const maxPizzas=Math.max(1,Math.min(allSlots().length,Number.parseInt(value.maxPizzas,10)||DEFAULT_MAX_PIZZAS));
  const rawGf=Number.parseInt(value.glutenFreeLimit,10);
  const glutenFreeLimit=Math.max(0,Math.min(maxPizzas,Number.isFinite(rawGf)?rawGf:DEFAULT_GLUTEN_FREE_LIMIT));
  const valid=new Set([...TOPPINGS,...OILS.filter(o=>o!=='None')]);
  const unavailableIngredients=Array.isArray(value.unavailableIngredients)?[...new Set(value.unavailableIngredients.map(v=>cleanText(v,30)).filter(v=>valid.has(v)))]:[];
  return{maxPizzas,glutenFreeLimit,unavailableIngredients};
}
async function ensureStore(){await fs.mkdir(DATA_DIR,{recursive:true});try{await fs.access(DATA_FILE);}catch{await fs.writeFile(DATA_FILE,JSON.stringify({orders:[],settings:defaultSettings()},null,2));}}
async function readStore(){await ensureStore();const parsed=JSON.parse(await fs.readFile(DATA_FILE,'utf8'));return{orders:Array.isArray(parsed.orders)?parsed.orders:[],settings:normaliseSettings(parsed.settings)};}
async function mutateStore(mutator){let result;writeQueue=writeQueue.then(async()=>{const store=await readStore();result=await mutator(store);store.settings=normaliseSettings(store.settings);const tmp=`${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;await fs.writeFile(tmp,JSON.stringify(store,null,2));await fs.rename(tmp,DATA_FILE);});await writeQueue;return result;}
function activeOrders(store){return store.orders.filter(o=>o.status!=='Cancelled');}
function unavailableSpecials(settings){const unavailable=new Set(settings.unavailableIngredients);return Object.fromEntries(Object.entries(SPECIALS).map(([key,s])=>[key,[...s.toppings,s.oil].some(i=>i!=='None'&&unavailable.has(i))]));}
function normaliseOrder(body,settings){
  const customerName=cleanText(body.customerName,60),specialKey=cleanText(body.specialKey,20).toLowerCase(),base=cleanText(body.base,20)||'standard';
  let toppings=Array.isArray(body.toppings)?body.toppings.map(v=>cleanText(v,30)):[],oil=cleanText(body.oil,20)||'None',pizzaName='Build Your Own';
  if(specialKey&&SPECIALS[specialKey]){const s=SPECIALS[specialKey];pizzaName=s.name;toppings=[...s.toppings];oil=s.oil;}
  toppings=[...new Set(toppings)].filter(t=>TOPPINGS.includes(t));
  if(toppings.length>4)throw new Error('Choose a maximum of 4 toppings.');
  if(!OILS.includes(oil))throw new Error('Choose a valid finishing oil.');
  if(!BASES.some(item=>item.key===base))throw new Error('Choose a valid pizza base.');
  const unavailable=new Set(settings.unavailableIngredients);const unavailableUsed=[...toppings,oil].filter(i=>i!=='None'&&unavailable.has(i));
  if(unavailableUsed.length)throw new Error(`${unavailableUsed[0]} is no longer available. Please choose another option.`);
  const slot=cleanText(body.slot,5);if(!VALID_SLOTS.has(slot))throw new Error('Choose an available collection time between 12:00 and 14:30.');
  if(!customerName)throw new Error('Enter the name of the person collecting the pizza.');
  return{customerName,pizzaName,specialKey:SPECIALS[specialKey]?specialKey:'',base,toppings,oil,slot};
}
const MIME={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.png':'image/png','.jpg':'image/jpeg','.jpeg':'image/jpeg','.svg':'image/svg+xml','.json':'application/json; charset=utf-8'};
function sendJson(res,status,value){const body=JSON.stringify(value);res.writeHead(status,{'content-type':MIME['.json'],'content-length':Buffer.byteLength(body),'cache-control':'no-store'});res.end(body);}
function sendFile(res,filename){fs.readFile(filename).then(data=>{res.writeHead(200,{'content-type':MIME[path.extname(filename)]||'application/octet-stream','content-length':data.length});res.end(data);}).catch(()=>sendJson(res,404,{error:'Not found.'}));}
async function bodyJson(req){const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>100_000)throw new Error('Request is too large.');chunks.push(chunk);}return chunks.length?JSON.parse(Buffer.concat(chunks).toString('utf8')):{};}
function isAdmin(req,url){return String(req.headers['x-admin-pin']||url.searchParams.get('pin')||'')===ADMIN_PIN;}

const server=http.createServer(async(req,res)=>{
 try{
  const url=new URL(req.url,`http://${req.headers.host||'localhost'}`),pathname=decodeURIComponent(url.pathname);
  if(req.method==='GET'&&pathname==='/api/config'){
    const store=await readStore(),active=activeOrders(store),glutenFreeUsed=active.filter(o=>o.base==='gluten-free').length,unavailable=new Set(store.settings.unavailableIngredients);
    return sendJson(res,200,{toppings:TOPPINGS.filter(i=>!unavailable.has(i)),oils:OILS.filter(i=>i==='None'||!unavailable.has(i)),allIngredients:[...TOPPINGS,...OILS.filter(o=>o!=='None')],unavailableIngredients:store.settings.unavailableIngredients,specials:SPECIALS,unavailableSpecials:unavailableSpecials(store.settings),bases:BASES,slots:allSlots(),usedSlots:active.map(o=>o.slot),maxPizzas:store.settings.maxPizzas,currentCount:active.length,remaining:Math.max(0,store.settings.maxPizzas-active.length),glutenFreeLimit:store.settings.glutenFreeLimit,glutenFreeUsed,glutenFreeRemaining:Math.max(0,store.settings.glutenFreeLimit-glutenFreeUsed),effectiveCapacity:Math.min(allSlots().length,store.settings.maxPizzas)});
  }
  if(req.method==='GET'&&pathname==='/api/qr'){const configured=cleanText(process.env.PUBLIC_URL,300),origin=configured||`${req.headers['x-forwarded-proto']||'http'}://${req.headers.host}`,imageUrl=`https://api.qrserver.com/v1/create-qr-code/?size=900x900&ecc=H&data=${encodeURIComponent(origin)}`;return sendJson(res,200,{url:origin,imageUrl});}
  if(req.method==='POST'&&pathname==='/api/orders'){
    try{const payload=await bodyJson(req);const order=await mutateStore(store=>{const input=normaliseOrder(payload,store.settings),active=activeOrders(store);if(active.length>=store.settings.maxPizzas)throw new Error(`All ${store.settings.maxPizzas} pizzas have now been reserved.`);if(input.base==='gluten-free'&&active.filter(o=>o.base==='gluten-free').length>=store.settings.glutenFreeLimit)throw new Error('All gluten-free pizza bases have now been reserved.');if(active.some(o=>o.slot===input.slot))throw new Error('That time has just been taken. Please choose another slot.');const created={id:crypto.randomUUID(),orderNumber:store.orders.length+1,...input,status:'Pending',createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};store.orders.push(created);return created;});return sendJson(res,201,{order});}catch(error){return sendJson(res,400,{error:error.message||'Unable to place the order.'});}
  }
  if(pathname==='/api/admin/orders'&&req.method==='GET'){if(!isAdmin(req,url))return sendJson(res,401,{error:'Incorrect admin PIN.'});const store=await readStore();return sendJson(res,200,{orders:[...store.orders].sort((a,b)=>a.slot.localeCompare(b.slot)||a.orderNumber-b.orderNumber),settings:store.settings,ingredients:[...TOPPINGS,...OILS.filter(o=>o!=='None')]});}
  if(pathname==='/api/admin/settings'&&req.method==='PATCH'){
    if(!isAdmin(req,url))return sendJson(res,401,{error:'Incorrect admin PIN.'});
    try{const payload=await bodyJson(req);const settings=await mutateStore(store=>{const active=activeOrders(store),next=normaliseSettings({...store.settings,...payload});if(next.maxPizzas<active.length)throw new Error(`Capacity cannot be below the ${active.length} active orders already booked.`);const gfUsed=active.filter(o=>o.base==='gluten-free').length;if(next.glutenFreeLimit<gfUsed)throw new Error(`Gluten-free limit cannot be below the ${gfUsed} active gluten-free orders already booked.`);store.settings=next;return next;});return sendJson(res,200,{settings});}catch(error){return sendJson(res,400,{error:error.message});}
  }
  const adminMatch=pathname.match(/^\/api\/admin\/orders\/([^/]+)$/);
  if(adminMatch&&req.method==='PATCH'){
    if(!isAdmin(req,url))return sendJson(res,401,{error:'Incorrect admin PIN.'});const allowed=new Set(['Pending','Preparing','Ready','Collected','Cancelled']),payload=await bodyJson(req),status=cleanText(payload.status,20);if(!allowed.has(status))return sendJson(res,400,{error:'Invalid status.'});
    try{const order=await mutateStore(store=>{const found=store.orders.find(o=>o.id===adminMatch[1]);if(!found)throw new Error('Order not found.');if(status!=='Cancelled'&&found.status==='Cancelled'){const active=activeOrders(store).filter(o=>o.id!==found.id);if(active.length>=store.settings.maxPizzas)throw new Error('The pizza capacity has been reached.');if(found.base==='gluten-free'&&active.filter(o=>o.base==='gluten-free').length>=store.settings.glutenFreeLimit)throw new Error('The gluten-free base limit has been reached.');if(active.some(o=>o.slot===found.slot))throw new Error('That collection slot is now occupied.');}found.status=status;found.updatedAt=new Date().toISOString();return found;});return sendJson(res,200,{order});}catch(error){return sendJson(res,400,{error:error.message});}
  }
  if(adminMatch&&req.method==='DELETE'){if(!isAdmin(req,url))return sendJson(res,401,{error:'Incorrect admin PIN.'});try{const deleted=await mutateStore(store=>{const index=store.orders.findIndex(o=>o.id===adminMatch[1]);if(index<0)throw new Error('Order not found.');return store.orders.splice(index,1)[0];});return sendJson(res,200,{deleted});}catch(error){return sendJson(res,400,{error:error.message});}}
  if(req.method!=='GET')return sendJson(res,405,{error:'Method not allowed.'});
  if(pathname==='/admin')return sendFile(res,path.join(__dirname,'public','admin.html'));
  const safePath=path.normalize(pathname).replace(/^(\.\.[/\\])+/,''),publicFile=path.join(__dirname,'public',safePath==='/'?'index.html':safePath);
  if(!publicFile.startsWith(path.join(__dirname,'public')))return sendJson(res,403,{error:'Forbidden.'});
  try{await fs.access(publicFile);return sendFile(res,publicFile);}catch{return sendFile(res,path.join(__dirname,'public','index.html'));}
 }catch(error){return sendJson(res,500,{error:error.message||'Server error.'});}
});
await ensureStore();
server.listen(PORT,()=>console.log(`Glamfest Pizza app running on http://localhost:${PORT}`));