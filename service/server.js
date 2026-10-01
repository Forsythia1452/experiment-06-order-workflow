const http = require('node:http');
const { URL } = require('node:url');
const path = require('node:path');
const { InventoryStore } = require('./store');

const port = Number(process.env.INVENTORY_PORT || 8001);
const dbPath = process.env.INVENTORY_DB || path.join(__dirname, '..', 'data', 'inventory.db');
const store = new InventoryStore(dbPath);

function send(res, code, body) {
  res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' });
  res.end(JSON.stringify(body));
}
function readJson(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => { data += c; if (data.length > 32_768) reject(new Error('too_large')); });
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch { reject(new Error('invalid_json')); } });
    req.on('error', reject);
  });
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || '127.0.0.1'}`);
  try {
    if (req.method === 'GET' && url.pathname === '/health') return send(res, 200, { status: 'ok', service: 'inventory' });
    if (req.method === 'GET' && url.pathname === '/products') return send(res, 200, { items: store.products() });
    if (req.method === 'GET' && url.pathname === '/reservations') return send(res, 200, { items: store.reservations(url.searchParams.get('status')) });
    if (req.method === 'GET' && url.pathname.startsWith('/reservations/')) {
      const item = store.reservation(decodeURIComponent(url.pathname.slice(14)));
      return item ? send(res, 200, item) : send(res, 404, { error: 'reservation_not_found' });
    }
    if (req.method === 'POST' && url.pathname === '/reserve') {
      const result = store.reserve(await readJson(req)); return send(res, result.code, result.body);
    }
    send(res, 404, { error: 'not_found' });
  } catch (error) {
    send(res, error.message === 'too_large' ? 413 : 400, { error: error.message });
  }
});

server.listen(port, '127.0.0.1', () => console.log(`inventory service http://127.0.0.1:${port}`));
process.on('SIGTERM', () => server.close(() => { store.close(); process.exit(0); }));

