const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, mount, fakeApi, flush } = require('../testing/render.cjs');

function setup(visible = true) {
  const server = fakeApi();
  const view = { visible, listener: undefined };
  const { useFriendRequests } = load(__dirname + '/useFriendRequests.ts', {
    '../api': { api: server.api },
    '../lib/util': { errMsg: e => e.message },
    './useClock': { isVisible: () => view.visible, onVisibilityChange(fn) { view.listener = fn; return () => { view.listener = undefined; }; } },
  });
  const h = mount(() => useFriendRequests());
  return { server, view, h };
}
const ids = r => ({ received: r.received.map(u => u.id), sent: r.sent.map(u => u.id) });

test('友達申請は見えているときだけ取得し、非表示から戻ると取り直す', async () => {
  const { server, view, h } = setup(false);
  assert.equal(server.calls.length, 0);
  view.listener(); assert.equal(server.calls.length, 0);
  view.visible = true; view.listener();
  server.take('GET', '/friend-requests').resolve({ received: [{ id: 2 }], sent: [] }); await flush();
  assert.deepEqual(ids(h.tree), { received: [2], sent: [] });
  view.visible = false; view.listener(); assert.equal(server.calls.length, 0);
  view.visible = true; view.listener();
  server.take('GET', '/friend-requests').resolve({ received: [], sent: [{ id: 3 }] }); await flush();
  assert.deepEqual(ids(h.tree), { received: [], sent: [3] });
  h.unmount(); assert.equal(view.listener, undefined);
});

test('変更前に出した遅い応答・失敗で新しい一覧を巻き戻さない', async () => {
  const { server, view, h } = setup();
  const stale = server.take('GET', '/friend-requests');  // マウント時（承認前の一覧）
  void h.tree.refresh();                                  // 承認後の明示的な取り直し
  server.take('GET', '/friend-requests').resolve({ received: [], sent: [] }); await flush();
  stale.resolve({ received: [{ id: 2 }], sent: [] }); await flush();
  assert.deepEqual(ids(h.tree), { received: [], sent: [] });

  view.listener(); const staleError = server.take('GET', '/friend-requests');
  void h.tree.refresh(); server.take('GET', '/friend-requests').resolve({ received: [{ id: 4 }], sent: [] }); await flush();
  staleError.reject(new Error('古い失敗')); await flush();
  assert.equal(h.tree.error, ''); assert.deepEqual(ids(h.tree), { received: [4], sent: [] });

  void h.tree.refresh(); server.take('GET', '/friend-requests').reject(new Error('通信に失敗しました')); await flush();
  assert.equal(h.tree.error, '通信に失敗しました'); assert.deepEqual(ids(h.tree), { received: [4], sent: [] });
  void h.tree.refresh(); server.take('GET', '/friend-requests').resolve({ received: [], sent: [] }); await flush();
  assert.equal(h.tree.error, '');
});

test('外した後に届いた応答は採用しない', async () => {
  const { server, h } = setup();
  const late = server.take('GET', '/friend-requests');
  h.unmount();
  late.resolve({ received: [{ id: 9 }], sent: [] }); await flush();
  assert.equal(h.lateUpdates, 0);
});
