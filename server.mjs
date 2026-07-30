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
const MAX_PIZZAS = 80;
const START_MINUTES = 12 * 60;
const END_MINUTES = 14 * 60 + 30;
const SLOT_INTERVAL = 2;

const TOPPINGS = [
  'Pepperoni', 'Ham', 'Mushrooms', 'Red onion', 'Yellow pepper',
  'Green pepper', 'Black olives', 'Pineapple', 'Jalapeños', 'Chillies'
];
const OILS = ['None', 'Garlic oil', 'Chilli oil'];
const SPECIALS = {
  resus: { name: 'Resus Pizza', toppings: ['Pepperoni', 'Jalapeños', 'Chillies'], oil: 'Chilli oil' },
  paeds: { name: 'Paeds Pizza', toppings: ['Ham', 'Pineapple'], oil: 'None' },
  triage: { name: 'Triage Pizza', toppings: ['Mushrooms', 'Red onion', 'Yellow pepper', 'Green pepper'], oil: 'None' }
};

let writeQueue = Promise.resolve();

function allSlots() {
  const slots = [];
  for (let minute = START_MINUTES; minute <= END_MINUTES; minute += SLOT_INTERVAL) {
    const hh = String(Math.floor(minute / 60)).padStart(2, '0');
    const mm = String(minute % 60).padStart(2, '0');
    slots.push(`${hh}:${mm}`);
  }
  return slots;
}
const VALID_SLOTS = new Set(allSlots());

async function ensureStore() {
  await fs.mkdir(DATA_DIR, { recursive: true });
  try { await fs.access(DATA_FILE); }
  catch { await fs.writeFile(DATA_FILE, JSON.stringify({ orders: [] }, null, 2)); }
}
async function readStore() {
  await ensureStore();
  const parsed = JSON.parse(await fs.readFile(DATA_FILE, 'utf8'));
  return { orders: Array.isArray(parsed.orders) ? parsed.orders : [] };
}
async function mutateStore(mutator) {
  let result;
  writeQueue = writeQueue.then(async () => {
    const store = await readStore();
    result = await mutator(store);
    const tmp = `${DATA_FILE}.${process.pid}.${Date.now()}.tmp`;
    await fs.writeFile(tmp, JSON.stringify(store, null, 2));
    await fs.rename(tmp, DATA_FILE);
  });
  await writeQueue;
  return result;
}
function cleanText(value, max = 80) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max);
}
function normaliseOrder(body) {
  const customerName = cleanText(body.customerName, 60);
  const specialKey = cleanText(body.specialKey, 20).toLowerCase();
  let toppings = Array.isArray(body.toppings) ? body.toppings.map(v => cleanText(v, 30)) : [];
  let oil = cleanText(body.oil, 20) || 'None';
  let pizzaName = 'Build Your Own';
  if (specialKey && SPECIALS[specialKey]) {
    const special = SPECIALS[specialKey];
    pizzaName = special.name;
    toppings = [...special.toppings];
    oil = special.oil;
  }
  toppings = [...new Set(toppings)].filter(t => TOPPINGS.includes(t));
  if (toppings.length > 4) throw new Error('Choose a maximum of 4 toppings.');
  if (!OILS.includes(oil)) throw new Error('Choose a valid finishing oil.');
  const slot = cleanText(body.slot, 5);
  if (!VALID_SLOTS.has(slot)) throw new Error('Choose an available collection time between 12:00 and 14:30.');
  if (!customerName) throw new Error('Enter the name of the person collecting the pizza.');
  return { customerName, pizzaName, specialKey: SPECIALS[specialKey] ? specialKey : '', toppings, oil, slot };
}
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.json': 'application/json; charset=utf-8' };
function sendJson(res, status, value) {
  const body = JSON.stringify(value);
  res.writeHead(status, { 'content-type': MIME['.json'], 'content-length': Buffer.byteLength(body), 'cache-control': 'no-store' });
  res.end(body);
}
function sendFile(res, filename) {
  fs.readFile(filename).then(data => {
    res.writeHead(200, { 'content-type': MIME[path.extname(filename)] || 'application/octet-stream', 'content-length': data.length });
    res.end(data);
  }).catch(() => sendJson(res, 404, { error: 'Not found.' }));
}
async function bodyJson(req) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > 100_000) throw new Error('Request is too large.');
    chunks.push(chunk);
  }
  return chunks.length ? JSON.parse(Buffer.concat(chunks).toString('utf8')) : {};
}
function isAdmin(req, url) {
  return String(req.headers['x-admin-pin'] || url.searchParams.get('pin') || '') === ADMIN_PIN;
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = decodeURIComponent(url.pathname);
    if (req.method === 'GET' && pathname === '/api/config') {
      const store = await readStore();
      const active = store.orders.filter(o => o.status !== 'Cancelled');
      return sendJson(res, 200, { toppings: TOPPINGS, oils: OILS, specials: SPECIALS, slots: allSlots(), usedSlots: active.map(o => o.slot), maxPizzas: MAX_PIZZAS, currentCount: active.length, remaining: Math.max(0, MAX_PIZZAS - active.length), effectiveCapacity: allSlots().length });
    }
    if (req.method === 'GET' && pathname === '/api/qr') {
      const configured = cleanText(process.env.PUBLIC_URL, 300);
      const origin = configured || `${req.headers['x-forwarded-proto'] || 'http'}://${req.headers.host}`;
      const imageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=900x900&ecc=H&data=${encodeURIComponent(origin)}`;
      return sendJson(res, 200, { url: origin, imageUrl });
    }
    if (req.method === 'POST' && pathname === '/api/orders') {
      try {
        const input = normaliseOrder(await bodyJson(req));
        const order = await mutateStore(store => {
          const active = store.orders.filter(o => o.status !== 'Cancelled');
          if (active.length >= MAX_PIZZAS) throw new Error('All 80 pizzas have now been reserved.');
          if (active.some(o => o.slot === input.slot)) throw new Error('That time has just been taken. Please choose another slot.');
          const created = { id: crypto.randomUUID(), orderNumber: store.orders.length + 1, ...input, status: 'Pending', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
          store.orders.push(created); return created;
        });
        return sendJson(res, 201, { order });
      } catch (error) { return sendJson(res, 400, { error: error.message || 'Unable to place the order.' }); }
    }
    if (pathname === '/api/admin/orders' && req.method === 'GET') {
      if (!isAdmin(req, url)) return sendJson(res, 401, { error: 'Incorrect admin PIN.' });
      const store = await readStore();
      return sendJson(res, 200, { orders: [...store.orders].sort((a,b) => a.slot.localeCompare(b.slot) || a.orderNumber - b.orderNumber) });
    }
    const adminMatch = pathname.match(/^\/api\/admin\/orders\/([^/]+)$/);
    if (adminMatch && req.method === 'PATCH') {
      if (!isAdmin(req, url)) return sendJson(res, 401, { error: 'Incorrect admin PIN.' });
      const allowed = new Set(['Pending', 'Preparing', 'Ready', 'Collected', 'Cancelled']);
      const payload = await bodyJson(req); const status = cleanText(payload.status, 20);
      if (!allowed.has(status)) return sendJson(res, 400, { error: 'Invalid status.' });
      try {
        const order = await mutateStore(store => {
          const found = store.orders.find(o => o.id === adminMatch[1]);
          if (!found) throw new Error('Order not found.');
          if (status !== 'Cancelled' && found.status === 'Cancelled') {
            const active = store.orders.filter(o => o.status !== 'Cancelled' && o.id !== found.id);
            if (active.length >= MAX_PIZZAS) throw new Error('The 80-pizza limit has been reached.');
            if (active.some(o => o.slot === found.slot)) throw new Error('That collection slot is now occupied.');
          }
          found.status = status; found.updatedAt = new Date().toISOString(); return found;
        });
        return sendJson(res, 200, { order });
      } catch (error) { return sendJson(res, 400, { error: error.message }); }
    }
    if (adminMatch && req.method === 'DELETE') {
      if (!isAdmin(req, url)) return sendJson(res, 401, { error: 'Incorrect admin PIN.' });
      try {
        const deleted = await mutateStore(store => {
          const index = store.orders.findIndex(o => o.id === adminMatch[1]);
          if (index < 0) throw new Error('Order not found.');
          const [removed] = store.orders.splice(index, 1);
          return removed;
        });
        return sendJson(res, 200, { deleted });
      } catch (error) { return sendJson(res, 400, { error: error.message }); }
    }
    if (req.method !== 'GET') return sendJson(res, 405, { error: 'Method not allowed.' });
    if (pathname === '/admin') return sendFile(res, path.join(__dirname, 'public', 'admin.html'));
    const safePath = path.normalize(pathname).replace(/^(\.\.[/\\])+/, '');
    const publicFile = path.join(__dirname, 'public', safePath === '/' ? 'index.html' : safePath);
    if (!publicFile.startsWith(path.join(__dirname, 'public'))) return sendJson(res, 403, { error: 'Forbidden.' });
    try { await fs.access(publicFile); return sendFile(res, publicFile); }
    catch { return sendFile(res, path.join(__dirname, 'public', 'index.html')); }
  } catch (error) { return sendJson(res, 500, { error: error.message || 'Server error.' }); }
});

await ensureStore();
server.listen(PORT, () => console.log(`Glamfest Pizza app running on http://localhost:${PORT}`));