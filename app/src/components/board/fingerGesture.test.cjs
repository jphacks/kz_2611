const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, 'fingerGesture.ts'), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const moduleExports = {};
vm.runInNewContext(output, { exports: moduleExports });
const { fingerTravel, fingerProgress, crossesCommit } = moduleExports;

test('指の移動量はカード幅の1/4（390pxなら約90px）', () => {
  assert.equal(fingerTravel(390), 97.5);
  assert.equal(fingerTravel(358), 89.5);
  assert.equal(fingerTravel(0), 0);
});

test('触れた状態1・離れた状態0を端で止める', () => {
  assert.equal(fingerProgress(0, 0, 358), 0);
  assert.equal(fingerProgress(0, 44.75, 358), 0.5);
  assert.equal(fingerProgress(0, 200, 358), 1);
  assert.equal(fingerProgress(1, -200, 358), 0);
  assert.equal(fingerProgress(1, -22.375, 358), 0.75);
});

test('離したときの確定は移動量の半分を越えたときだけ', () => {
  assert.equal(crossesCommit(44, 358), false);
  assert.equal(crossesCommit(45, 358), true);
  assert.equal(crossesCommit(-44, 358), false);
  assert.equal(crossesCommit(-45, 358), true);
  assert.equal(crossesCommit(100, 0), false);
});
