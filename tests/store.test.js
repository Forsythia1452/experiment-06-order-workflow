const test = require('node:test');
const assert = require('node:assert/strict');
const { InventoryStore } = require('../service/store');

function fresh() { return new InventoryStore(':memory:'); }

test('seeds ten products',()=>{const s=fresh();assert.equal(s.products().length,10);s.close()});
test('healthy stock completes',()=>{const s=fresh();const r=s.reserve({request_id:'req-0001',sku:'BOOK',quantity:2});assert.equal(r.code,201);assert.equal(r.body.remaining_stock,18);s.close()});
test('same request is idempotent',()=>{const s=fresh();const x={request_id:'req-0002',sku:'BOOK',quantity:2};s.reserve(x);const r=s.reserve(x);assert.equal(r.code,200);assert.equal(r.body.idempotent_replay,true);assert.equal(s.products().find(x=>x.sku==='BOOK').stock,18);s.close()});
test('same id different body conflicts',()=>{const s=fresh();s.reserve({request_id:'req-0003',sku:'BOOK',quantity:1});assert.equal(s.reserve({request_id:'req-0003',sku:'BOOK',quantity:2}).body.error,'request_id_conflict');s.close()});
test('zero stock rejects',()=>{const s=fresh();const r=s.reserve({request_id:'req-0004',sku:'HEADSET',quantity:1});assert.equal(r.body.reason,'insufficient_stock');s.close()});
test('boundary stock succeeds',()=>{const s=fresh();const r=s.reserve({request_id:'req-0005',sku:'ADAPTER',quantity:1});assert.equal(r.body.remaining_stock,0);s.close()});
test('stock never negative',()=>{const s=fresh();s.reserve({request_id:'req-0006',sku:'ADAPTER',quantity:1});s.reserve({request_id:'req-0007',sku:'ADAPTER',quantity:1});assert.equal(s.products().find(x=>x.sku==='ADAPTER').stock,0);s.close()});
test('rule limit changes result',()=>{const s=fresh();const r=s.reserve({request_id:'req-0008',sku:'BOOK',quantity:6});assert.equal(r.body.reason,'rule_limit');assert.equal(r.body.rule_version,'2026.1');s.close()});
test('unknown sku is 404',()=>{const s=fresh();assert.equal(s.reserve({request_id:'req-0009',sku:'NOPE',quantity:1}).code,404);s.close()});
test('invalid id is 400',()=>{const s=fresh();assert.equal(s.reserve({request_id:'x',sku:'BOOK',quantity:1}).code,400);s.close()});
test('invalid quantity type is 400',()=>{const s=fresh();assert.equal(s.reserve({request_id:'req-0010',sku:'BOOK',quantity:'2'}).code,400);s.close()});
test('invalid negative quantity is 400',()=>{const s=fresh();assert.equal(s.reserve({request_id:'req-0011',sku:'BOOK',quantity:-1}).code,400);s.close()});
test('completed filter only returns completed',()=>{const s=fresh();s.reserve({request_id:'req-0012',sku:'BOOK',quantity:1});s.reserve({request_id:'req-0013',sku:'HEADSET',quantity:1});assert.ok(s.reservations('completed').every(x=>x.status==='completed'));s.close()});
test('detail returns created record',()=>{const s=fresh();s.reserve({request_id:'req-0014',sku:'BOOK',quantity:1});assert.equal(s.reservation('req-0014').sku,'BOOK');s.close()});
test('missing detail is undefined',()=>{const s=fresh();assert.equal(s.reservation('missing'),undefined);s.close()});

