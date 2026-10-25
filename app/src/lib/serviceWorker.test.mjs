// Service Worker 本体を読み、Push表示と通知からの遷移を検証する。
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';

function worker(windows = []) {
  const handlers = {}, notifications = [], opened = [];
  const self = {
    location: { origin: 'https://example.test' },
    addEventListener: (name, handler) => { handlers[name] = handler; },
    registration: { showNotification: async (title, options) => { notifications.push({ title, ...options }); } },
    clients: {
      matchAll: async () => windows,
      openWindow: async url => { opened.push(url); },
    },
  };
  runInNewContext(readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8'), { self, URL });
  async function dispatch(name, props) {
    let pending;
    handlers[name]({ ...props, waitUntil: promise => { pending = promise; } });
    await pending;
  }
  return { dispatch, notifications, opened };
}

test('nullなど通知オブジェクト以外のPushもデフォルト通知として表示する', async () => {
  for (const text of ['null', '[]', 'true', '42', '"hello"', '{broken']) {
    const w = worker();
    await w.dispatch('push', { data: { json: () => JSON.parse(text) } });
    assert.equal(w.notifications.length, 1, text);
    assert.equal(w.notifications[0].title, 'このゆびとまれ', text);
    assert.equal(w.notifications[0].body, '', text);
    assert.equal(w.notifications[0].data.event_id, null, text);
  }
});

test('空のPushはデフォルト通知、通常のPushはタイトル・本文・アイコン・募集IDを保持する', async () => {
  const w = worker();
  await w.dispatch('push', { data: null });
  assert.equal(w.notifications[0].title, 'このゆびとまれ');
  await w.dispatch('push', { data: { json: () => ({ title: '新しい募集', body: 'ご飯', event_id: 12, tag: 'event-12' }) } });
  const n = w.notifications[1];
  assert.equal(n.title, '新しい募集');
  assert.equal(n.body, 'ご飯');
  assert.equal(n.icon, '/icons/icon-192.png');
  assert.equal(n.tag, 'event-12');
  assert.equal(n.data.event_id, 12);
});

test('通知クリックは既存の同一originの画面を対象募集へ移動しフォーカスする', async () => {
  let navigated, focused = false, closed = false;
  const w = worker([
    { url: 'https://other.test/', navigate: () => { throw Error('別origin'); } },
    { url: 'https://example.test/', navigate: async url => { navigated = url; return { focus: async () => { focused = true; } }; } },
  ]);
  await w.dispatch('notificationclick', { notification: { data: { event_id: 12 }, close: () => { closed = true; } } });
  assert.equal(navigated, 'https://example.test/?event=12');
  assert.equal(focused, true);
  assert.equal(closed, true);
  assert.deepEqual(w.opened, []);
});

test('既存画面がない場合と移動に失敗した場合は新規画面を開く', async () => {
  for (const windows of [[], [{ url: 'https://example.test/', navigate: async () => { throw Error('閉じた画面'); } }]]) {
    const w = worker(windows);
    await w.dispatch('notificationclick', { notification: { data: { event_id: 7 }, close() {} } });
    assert.deepEqual(w.opened, ['https://example.test/?event=7']);
  }
});
