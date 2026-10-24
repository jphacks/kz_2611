const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
test('時計は非表示中に停止し、復帰時に現在時刻へ追いつき、購読を解除する', () => {
  let subscribe, listener, cleanup, ticks = 0, nextId = 0;
  const timers = new Map();
  const document = { visibilityState: 'visible', addEventListener(_, fn) { listener = fn; }, removeEventListener(_, fn) { assert.equal(fn, listener); listener = undefined; } };
  const react = { useSyncExternalStore(fn, getSnapshot) { subscribe = fn; return getSnapshot(); } };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(__dirname + '/useClock.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, document,
    setInterval(fn) { timers.set(++nextId, fn); return nextId; },
    clearInterval(id) { timers.delete(id); },
    require: id => id === 'react' ? react : { Platform: { OS: 'web' } },
  });
  exports.useClock(); cleanup = subscribe(() => ticks++);
  const cleanupSecond = subscribe(() => {});
  assert.equal(timers.size, 1); assert.equal(ticks, 1);
  [...timers.values()][0](); assert.equal(ticks, 2);
  document.visibilityState = 'hidden'; listener(); assert.equal(timers.size, 0);
  document.visibilityState = 'visible'; listener(); assert.equal(ticks, 3); assert.equal(timers.size, 1);
  cleanupSecond(); assert.equal(timers.size, 1);
  cleanup(); assert.equal(timers.size, 0); assert.equal(listener, undefined);
});
