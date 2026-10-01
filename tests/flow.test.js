const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');
const flows=JSON.parse(fs.readFileSync('flows/flows.json','utf8'));
test('flow JSON contains one tab',()=>assert.equal(flows.filter(x=>x.type==='tab').length,1));
test('has health endpoint',()=>assert.ok(flows.find(x=>x.type==='http in'&&x.url==='/health')));
test('has orders page',()=>assert.ok(flows.find(x=>x.type==='http in'&&x.url==='/orders')));
test('has order post endpoint',()=>assert.ok(flows.find(x=>x.type==='http in'&&x.method==='post'&&x.url==='/api/orders')));
test('has list endpoint',()=>assert.ok(flows.find(x=>x.type==='http in'&&x.method==='get'&&x.url==='/api/orders')));
test('has detail endpoint',()=>assert.ok(flows.find(x=>x.url==='/api/orders/:id')));
test('has inventory HTTP integration',()=>assert.ok(flows.some(x=>x.type==='http request'&&x.name==='调用库存服务')));
test('has catch path',()=>assert.ok(flows.some(x=>x.type==='catch')));
test('all HTTP inputs lead to wires',()=>assert.ok(flows.filter(x=>x.type==='http in').every(x=>x.wires.flat().length===1)));
test('all responses have no output wires',()=>assert.ok(flows.filter(x=>x.type==='http response').every(x=>x.wires.length===0)));

