const { DatabaseSync } = require('node:sqlite');
const crypto = require('node:crypto');

const PRODUCTS = [
  ['BOOK', '软件工程教材', 'office', 20, 5],
  ['PEN', '黑色签字笔', 'office', 50, 10],
  ['PAPER', 'A4 打印纸', 'office', 8, 3],
  ['MOUSE', '有线鼠标', 'device', 6, 2],
  ['KEYBOARD', '机械键盘', 'device', 4, 1],
  ['CABLE', '网线', 'device', 15, 4],
  ['DRIVE', '移动硬盘', 'device', 2, 1],
  ['BADGE', '访客证', 'access', 10, 2],
  ['HEADSET', '耳机', 'device', 0, 1],
  ['ADAPTER', '电源适配器', 'device', 1, 1]
];

class InventoryStore {
  constructor(path) {
    this.db = new DatabaseSync(path);
    this.db.exec('PRAGMA journal_mode=WAL; PRAGMA busy_timeout=3000;');
    this.db.exec(`CREATE TABLE IF NOT EXISTS products(
      sku TEXT PRIMARY KEY, name TEXT NOT NULL, category TEXT NOT NULL,
      stock INTEGER NOT NULL CHECK(stock >= 0), max_per_request INTEGER NOT NULL,
      rule_version TEXT NOT NULL DEFAULT '2026.1');
      CREATE TABLE IF NOT EXISTS reservations(
      request_id TEXT PRIMARY KEY, sku TEXT NOT NULL, quantity INTEGER NOT NULL,
      request_hash TEXT NOT NULL, status TEXT NOT NULL, reason TEXT,
      remaining_stock INTEGER, rule_version TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP);`);
    const add = this.db.prepare('INSERT OR IGNORE INTO products(sku,name,category,stock,max_per_request) VALUES(?,?,?,?,?)');
    for (const row of PRODUCTS) add.run(...row);
  }
  close() { this.db.close(); }
  products() { return this.db.prepare('SELECT * FROM products ORDER BY sku').all(); }
  reservations(status) {
    if (status) return this.db.prepare('SELECT * FROM reservations WHERE status=? ORDER BY created_at DESC').all(status);
    return this.db.prepare('SELECT * FROM reservations ORDER BY created_at DESC').all();
  }
  reservation(id) { return this.db.prepare('SELECT * FROM reservations WHERE request_id=?').get(id); }
  reserve(input) {
    const request_id = String(input.request_id || '');
    const sku = String(input.sku || '').toUpperCase();
    const quantity = input.quantity;
    if (!/^[A-Za-z0-9-]{6,40}$/.test(request_id)) return { code: 400, body: { error: 'invalid_request_id' } };
    if (!/^[A-Z0-9_-]{2,24}$/.test(sku)) return { code: 400, body: { error: 'invalid_sku' } };
    if (!Number.isInteger(quantity) || quantity <= 0) return { code: 400, body: { error: 'invalid_quantity' } };
    const hash = crypto.createHash('sha256').update(JSON.stringify({ request_id, sku, quantity })).digest('hex');
    this.db.exec('BEGIN IMMEDIATE');
    try {
      const existing = this.reservation(request_id);
      if (existing) {
        this.db.exec('COMMIT');
        if (existing.request_hash !== hash) return { code: 409, body: { error: 'request_id_conflict', request_id } };
        return { code: 200, body: { ...existing, idempotent_replay: true } };
      }
      const product = this.db.prepare('SELECT * FROM products WHERE sku=?').get(sku);
      if (!product) { this.db.exec('ROLLBACK'); return { code: 404, body: { error: 'unknown_sku' } }; }
      let status = 'completed', reason = null, remaining = product.stock, code = 201;
      if (quantity > product.max_per_request) { status = 'rejected'; reason = 'rule_limit'; code = 409; }
      else {
        const updated = this.db.prepare('UPDATE products SET stock=stock-? WHERE sku=? AND stock>=?').run(quantity, sku, quantity);
        if (updated.changes === 0) { status = 'rejected'; reason = 'insufficient_stock'; code = 409; }
        else remaining = product.stock - quantity;
      }
      this.db.prepare(`INSERT INTO reservations(request_id,sku,quantity,request_hash,status,reason,remaining_stock,rule_version)
        VALUES(?,?,?,?,?,?,?,?)`).run(request_id, sku, quantity, hash, status, reason, remaining, product.rule_version);
      this.db.exec('COMMIT');
      return { code, body: { request_id, sku, quantity, status, reason, remaining_stock: remaining, rule_version: product.rule_version, idempotent_replay: false } };
    } catch (error) { try { this.db.exec('ROLLBACK'); } catch {} throw error; }
  }
}

module.exports = { InventoryStore, PRODUCTS };

