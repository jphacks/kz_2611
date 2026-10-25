const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load } = require('../../testing/render.cjs');

function feedback(navigator = {}, document) {
  return load(__dirname + '/feedback.ts', { 'react-native': { Platform: { OS: 'web' } } }, { navigator, document });
}

test('オフでは停止パターンも含めて振動APIを呼ばない', () => {
  const calls = [];
  feedback({ vibrate: p => calls.push(p) }).vibratePattern(0, false);
  assert.deepEqual(calls, []);
});

test('参加確定で同期的に1パターンだけ要求し、取消は停止できる', () => {
  const calls = [];
  const f = feedback({ vibrate: p => { calls.push(Array.isArray(p) ? Array.from(p) : p); return true; } });
  const stop = f.startJoinHaptic(true);
  assert.deepEqual(calls, [[30, 20, 35, 20, 40, 25, 60]]);
  stop();
  stop();
  assert.deepEqual(calls, [[30, 20, 35, 20, 40, 25, 60], 0]);
});

test('iPhoneでは同期的にswitchラベルを1回だけ操作しDOMを残さない', () => {
  const calls = [], children = [];
  const doc = {
    body: { appendChild: n => children.push(n) },
    createElement: tag => ({ style: {}, setAttribute() {}, appendChild(n) { this.child = n; },
      click() { calls.push([tag, this.child.type, this.child.switch, this.child.tabIndex]); },
      remove() { children.splice(children.indexOf(this), 1); } }),
  };
  // setAttribute の switch を記録する
  const create = doc.createElement;
  doc.createElement = tag => { const n = create(tag); n.setAttribute = (k, v) => { n[k] = v; }; return n; };
  const f = feedback({ userAgent: 'iPhone; CPU iPhone OS 18_0 like Mac OS X' }, doc);
  f.startJoinHaptic(false)();
  assert.equal(calls.length, 0);
  f.startJoinHaptic(true)();
  assert.deepEqual(calls, [['label', 'checkbox', '', -1]]);
  assert.equal(children.length, 0);
});

test('非対応・旧iOS・例外でも参加を妨げない', () => {
  for (const nav of [{}, { userAgent: 'iPhone OS 17_0' }, { vibrate() { throw Error('denied'); } }]) {
    assert.doesNotThrow(() => feedback(nav).startJoinHaptic(true)());
  }
});
