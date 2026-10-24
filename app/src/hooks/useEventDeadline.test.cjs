const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
test('一覧は次の期限だけで更新し、復帰時にも期限を再評価する', () => {
  let effect, listener, now = 1000, visible = true, nextId = 0;
  const timers = new Map(), updates = [];
  const exports = {};
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(__dirname + '/useEventDeadline.ts', 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, Date: { now: () => now },
    setTimeout(fn, ms) { timers.set(++nextId, { fn, ms }); return nextId; }, clearTimeout(id) { timers.delete(id); },
    require: id => id === 'react' ? { useEffect(fn) { effect = fn; }, useState() { return [now, value => updates.push(value)]; } } : { isVisible: () => visible, onVisibilityChange(fn) { listener = fn; return () => { listener = undefined; }; } },
  });
  exports.useEventDeadline([{ expires_at: 4000 }, { expires_at: 9000 }, { expires_at: 500 }]);
  const cleanup = effect();
  assert.equal([...timers.values()][0].ms, 3000);
  now = 4000; [...timers.values()][0].fn();
  assert.equal(updates.at(-1), 4000); assert.equal([...timers.values()][0].ms, 5000);
  visible = false; listener(); assert.equal(timers.size, 0);
  visible = true; now = 10000; listener(); assert.equal(updates.at(-1), 10000); assert.equal(timers.size, 0);
  cleanup(); assert.equal(listener, undefined);
});
