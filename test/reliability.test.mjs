import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { Readable } from 'node:stream';
import { fileURLToPath, pathToFileURL } from 'node:url';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';

const root = fileURLToPath(new URL('..', import.meta.url));
const adminPin = 'test-only-pin';

async function startServer(t, directory) {
  const dataDir = directory || await fs.mkdtemp(path.join(os.tmpdir(), 'glamfest-test-'));
  // Run the real request handler and filesystem writes in an isolated runtime.
  // Only the socket transport is replaced, so these tests also run offline.
  let handler;
  const source = (await fs.readFile(path.join(root, 'server.mjs'), 'utf8'))
    .replace(/^import .*;\r?$/gm, '')
    .replaceAll('import.meta.url', JSON.stringify(pathToFileURL(path.join(root, 'server.mjs')).href));
  const context = vm.createContext({
    crypto, fs, path, fileURLToPath, URL, Buffer,
    process: { pid: process.pid, env: { PORT: '0', ADMIN_PIN: adminPin, DATA_DIR: dataDir } },
    console: { log() {} },
    http: { createServer(callback) { handler = callback; return { listen() {} }; } }
  });
  await vm.runInContext(`(async () => { ${source}\n })()`, context);
  const stop = async () => {};
  async function request(route, method = 'GET', body) {
    const req = Readable.from(body === undefined ? [] : [Buffer.from(JSON.stringify(body))]);
    req.method = method; req.url = route;
    req.headers = { host: 'localhost', 'content-type': 'application/json', 'x-admin-pin': adminPin };
    let status, value;
    await handler(req, {
      writeHead(code) { status = code; },
      end(body) { value = JSON.parse(body); }
    });
    return { status, ...value };
  }
  return {
    request, dataDir, stop,
    book: (slot, extra = {}) => request('/api/orders', 'POST', {
      customerName: 'Test collector', slot, base: 'standard', toppings: [], oil: 'None', ...extra
    })
  };
}

test('a duplicate slot rejection does not stop later orders or kitchen updates', { timeout: 15000 }, async t => {
  const app = await startServer(t);
  const first = await app.book('12:00');
  assert.equal(first.status, 201);
  const duplicate = await app.book('12:00');
  assert.equal(duplicate.status, 400);
  assert.match(duplicate.error, /time has just been taken/);
  assert.equal((await app.book('12:02')).status, 201);
  assert.equal((await app.request(`/api/admin/orders/${first.order.id}`, 'PATCH', { status: 'Ready' })).status, 200);
});

test('validation, stock and gluten-free rejections leave the write queue usable', { timeout: 15000 }, async t => {
  const app = await startServer(t);
  assert.equal((await app.book('12:00', { customerName: '' })).status, 400);
  assert.equal((await app.book('12:00')).status, 201);
  assert.equal((await app.request('/api/admin/settings', 'PATCH', {
    unavailableIngredients: ['Ham'], glutenFreeLimit: 0
  })).status, 200);
  assert.equal((await app.book('12:02', { toppings: ['Ham'] })).status, 400);
  assert.equal((await app.book('12:02', { base: 'gluten-free' })).status, 400);
  assert.equal((await app.book('12:02')).status, 201);
});

test('failed kitchen edits and full capacity do not block cancellation or reopening', { timeout: 15000 }, async t => {
  const app = await startServer(t);
  const first = await app.book('12:00');
  await app.book('12:02');
  assert.equal((await app.request('/api/admin/settings', 'PATCH', { maxPizzas: 1 })).status, 400);
  assert.equal((await app.request('/api/admin/orders/missing', 'DELETE')).status, 400);
  assert.equal((await app.request('/api/admin/orders/missing', 'PATCH', { status: 'Ready' })).status, 400);
  assert.equal((await app.request('/api/admin/settings', 'PATCH', { maxPizzas: 2 })).status, 200);
  assert.equal((await app.book('12:04')).status, 400);
  const route = `/api/admin/orders/${first.order.id}`;
  assert.equal((await app.request(route, 'PATCH', { status: 'Cancelled' })).status, 200);
  const replacement = await app.book('12:00');
  assert.equal(replacement.status, 201);
  assert.equal((await app.request(route, 'PATCH', { status: 'Pending' })).status, 400);
  assert.equal((await app.request(`/api/admin/orders/${replacement.order.id}`, 'DELETE')).status, 200);
  assert.equal((await app.request(route, 'PATCH', { status: 'Pending' })).status, 200);
});

test('concurrent bookings stay unique and persist across a restart after a conflict', { timeout: 25000 }, async t => {
  const app = await startServer(t);
  const conflict = await Promise.all(Array.from({ length: 12 }, () => app.book('12:00')));
  assert.equal(conflict.filter(r => r.status === 201).length, 1);
  assert.equal(conflict.filter(r => r.status === 400).length, 11);
  const slots = (await app.request('/api/config')).slots.slice(1, 61);
  const booked = await Promise.all(slots.map(slot => app.book(slot)));
  assert.ok(booked.every(r => r.status === 201), 'Every distinct slot must remain bookable');
  const before = (await app.request('/api/admin/orders')).orders;
  assert.equal(before.length, 61);
  assert.equal(new Set(before.map(o => o.slot)).size, 61);
  assert.equal(new Set(before.map(o => o.id)).size, 61);
  await app.stop();
  const restarted = await startServer(t, app.dataDir);
  assert.deepEqual((await restarted.request('/api/admin/orders')).orders, before);
});

test('a temporary storage failure does not permanently poison later writes', { timeout: 15000 }, async t => {
  const app = await startServer(t);
  await app.book('12:00');
  const filename = path.join(app.dataDir, 'orders.json');
  const saved = await fs.readFile(filename, 'utf8');
  await fs.writeFile(filename, 'invalid JSON for failure simulation');
  assert.equal((await app.book('12:02')).status, 400);
  await fs.writeFile(filename, saved);
  assert.equal((await app.book('12:02')).status, 201);
  assert.equal((await app.request('/api/admin/orders')).orders.length, 2);
});

async function kitchen() {
  const elements = new Map();
  const element = selector => {
    if (!elements.has(selector)) elements.set(selector, {
      value: '', classList: { add() {}, remove() {} }, addEventListener() {}, focus() {}, textContent: ''
    });
    return elements.get(selector);
  };
  let tick;
  const context = vm.createContext({
    sessionStorage: { getItem: () => '', setItem() {}, removeItem() {} },
    document: {
      hidden: false, querySelector: element, addEventListener() {},
      querySelectorAll: () => [], body: { contains: () => true }
    },
    window: { addEventListener() {} },
    setInterval(callback) { tick = callback; return 1; }, clearInterval() {},
    fetch: async () => ({ ok: true, json: async () => ({ orders: [] }) })
  });
  vm.runInContext(await fs.readFile(path.join(root, 'public/admin.js'), 'utf8'), context);
  return { context, tick: () => tick() };
}

test('the kitchen keeps refreshing after a status button retains focus', async () => {
  const { context, tick } = await kitchen();
  vm.runInContext('var calls = 0; refresh = async () => { calls++; }; startRefresh();', context);
  tick();
  assert.equal(context.calls, 1);
  context.document.hidden = true;
  tick();
  assert.equal(context.calls, 1, 'Hidden tabs should not poll');
});

test('kitchen polling avoids overlapping requests and recovers after network errors', async () => {
  const { context } = await kitchen();
  vm.runInContext('applyData = () => {};', context);
  let requests = 0, finish;
  context.fetch = () => { requests++; return new Promise(resolve => { finish = resolve; }); };
  const first = vm.runInContext('refresh(true)', context);
  const overlapping = vm.runInContext('refresh(true)', context);
  assert.equal(requests, 1);
  finish({ ok: true, json: async () => ({ orders: [] }) });
  await Promise.all([first, overlapping]);
  context.fetch = async () => { requests++; throw new Error('Offline'); };
  await vm.runInContext('refresh(true)', context);
  context.fetch = async () => { requests++; return { ok: true, json: async () => ({ orders: [] }) }; };
  await vm.runInContext('refresh(true)', context);
  assert.equal(requests, 3);
});
