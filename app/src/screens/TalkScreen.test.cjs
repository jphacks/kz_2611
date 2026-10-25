// トーク一覧の定期取得が先頭ページだけで止まり、過去ページは「もっと見る」で足せることを確かめる（#136）。
const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { load, mount, text, press, buttons, fakeApi, flush, styles } = require('../testing/render.cjs');

const me = { id: 1, handle: 'me', name: '自分', avatar: null };
const talk = (id, active = true) => ({
  event: {
    id, title: `イベント${id}`, place: '', time_text: '', capacity: 3, capacity_min: 3, duration_min: 15,
    expires_at: 1000, created_at: 1, group_id: null, group_name: null,
    host: { id: 1, handle: 'me', name: '自分', avatar: null }, members: [], count: 1, joined: true, is_host: true,
  },
  last: null,
  active,
});

function setup() {
  const server = fakeApi();
  const timers = [];
  const timer = fn => { timers.push(fn); return timers.length; };
  const talks = load(path.join(__dirname, '../components/chat/talks.ts'), {});
  // 実物の usePolling を使い、3秒後の取得を手で起こす。
  const util = load(path.join(__dirname, '../lib/util.ts'), {
    'react-native': { AppState: { currentState: 'active' }, Platform: { OS: 'web' } },
  }, { document: { visibilityState: 'visible' }, setTimeout: timer, clearTimeout: () => {} });
  const { TalkScreen } = load(path.join(__dirname, 'TalkScreen.tsx'), {
    'react-native': {
      View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', ActivityIndicator: 'ActivityIndicator',
      StyleSheet: { create: s => s },
    },
    '../api': { api: server.api },
    '../components/ChatSheet': { ChatSheet: () => null },
    '../components/chat/talks': talks,
    '../lib/util': util,
    '../ui/Avatar': { Avatar: () => null },
    '../ui/Header': { Header: () => null },
    '../ui/theme': { C: styles, S: styles, T: styles, popColor: () => '#FF5A36', RADIUS: 22 },
  });
  const h = mount(() => TalkScreen({ me, go: () => {} }));
  return { server, timers, h };
}

test('初回は先頭50件だけを取得し、定期取得でも過去ページを取り直さない', async () => {
  const { server, timers, h } = setup();
  assert.deepEqual(server.calls.map(c => c.path), ['/talks?limit=50']);
  server.take('GET', '/talks?limit=50').resolve({ talks: [talk(3), talk(2)], next: '100:200:2' });
  await flush();
  assert.match(text(h.tree), /イベント3/);
  assert.ok(buttons(h.tree, 'もっと見る').length === 1);

  // 3秒後の定期取得
  timers.shift()();
  await flush();
  const poll = server.take('GET', '/talks?limit=50');
  poll.resolve({ talks: [talk(3), talk(2)], next: '100:200:2' });
  await flush();
  assert.equal(server.calls.filter(c => c.path.includes('before=')).length, 0);
  assert.equal(server.calls.length, 0);
});

test('もっと見るで次のページを足し、その後の定期取得でも読み込み済みの行を残す', async () => {
  const { server, timers, h } = setup();
  server.take('GET', '/talks?limit=50').resolve({ talks: [talk(3), talk(2)], next: '100:200:2' });
  await flush();
  press(h.tree, 'もっと見る');
  assert.equal(server.calls[0].path, '/talks?limit=50&before=100%3A200%3A2');
  server.take('GET', '/talks?limit=50&before=100%3A200%3A2').resolve({ talks: [talk(1)], next: null });
  await flush();
  assert.match(text(h.tree), /イベント1/);
  assert.equal(buttons(h.tree, 'もっと見る').length, 0);

  // 新しいページが来ても、読み込み済みの過去ページは残し、カーソルを先頭ページへ戻さない。
  timers.shift()();
  await flush();
  server.take('GET', '/talks?limit=50').resolve({ talks: [talk(4), talk(3), talk(2)], next: '300:400:2' });
  await flush();
  assert.match(text(h.tree), /イベント4/);
  assert.match(text(h.tree), /イベント1/);
  assert.equal(buttons(h.tree, 'もっと見る').length, 0);
  assert.deepEqual(server.calls.map(c => c.path), []);
});
