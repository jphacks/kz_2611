const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, 'eventOrder.ts'), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const moduleExports = {};
vm.runInNewContext(output, { exports: moduleExports });
const { compareBoardEvents } = moduleExports;

test('主催の募集を先にし、主催どうし・それ以外は締切が近い順', () => {
  const events = [
    { id: '参加・遅い', is_host: false, expires_at: 400 },
    { id: '主催・遅い', is_host: true, expires_at: 300 },
    { id: '参加・早い', is_host: false, expires_at: 100 },
    { id: '主催・早い', is_host: true, expires_at: 200 },
  ];
  events.sort(compareBoardEvents);
  assert.deepEqual(events.map(e => e.id), ['主催・早い', '主催・遅い', '参加・早い', '参加・遅い']);
});

test('主催区分と締切が同じなら元の順序を保つ', () => {
  const events = [
    { id: 1, is_host: true, expires_at: 100 },
    { id: 2, is_host: true, expires_at: 100 },
    { id: 3, is_host: false, expires_at: 100 },
    { id: 4, is_host: false, expires_at: 100 },
  ];
  events.sort(compareBoardEvents);
  assert.deepEqual(events.map(e => e.id), [1, 2, 3, 4]);
});
