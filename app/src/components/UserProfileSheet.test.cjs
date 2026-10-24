const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, mount, text, buttons, press, fakeApi, flush, styles } = require('../testing/render.cjs');

const me = { id: 1, handle: 'me', name: '自分', avatar: null, invite_code: 'x' };
const bob = { id: 2, handle: 'bob', name: 'ボブ', avatar: null };

function setup() {
  const server = fakeApi();
  let socialRefreshes = 0;
  const { UserProfileSheet } = load(__dirname + '/UserProfileSheet.tsx', {
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', ActivityIndicator: 'ActivityIndicator' },
    '../api': { api: server.api },
    '../hooks/useSocialData': { refreshSocialData: async () => { socialRefreshes++; } },
    '../lib/util': { errMsg: e => e.message },
    '../ui/Avatar': { Avatar: () => null },
    '../ui/Sheet': { Sheet: ({ children }) => ({ type: 'Sheet', props: { children } }) },
    '../ui/theme': { C: styles, S: styles, T: styles },
  });
  const h = mount(() => UserProfileSheet({ userId: bob.id, me, onClose() {} }));
  return { server, h, socialRefreshes: () => socialRefreshes };
}
const profile = request => ({ user: bob, is_friend: false, request });
const friend = { user: bob, is_friend: true, request: 'none' };

test('申請なしは「友達申請」でIDの申請を送り、申請中の表示に変わる', async () => {
  const { server, h, socialRefreshes } = setup();
  server.take('GET', '/users/2').resolve(profile('none')); await flush();
  press(h.tree, '友達申請');
  assert.throws(() => press(h.tree, '送信中…'), /押せない/);
  const sent = server.take('POST', '/friends');
  assert.equal(JSON.stringify(sent.body), '{"handle":"bob"}'); assert.equal(server.calls.length, 0);
  sent.resolve({ status: 'requested' }); await flush();
  server.take('GET', '/users/2').resolve(profile('sent')); await flush();
  assert.equal(socialRefreshes(), 1);
  assert.match(text(h.tree), /申請中/);
  assert.equal(buttons(h.tree, '友達申請').length, 0);
  assert.doesNotMatch(text(h.tree), /届いています/);
});

test('相手から届いている申請は「承認する」で承認し、友達になる', async () => {
  const { server, h } = setup();
  server.take('GET', '/users/2').resolve(profile('received')); await flush();
  assert.match(text(h.tree), /この人から友達申請が届いています/);
  press(h.tree, '承認する');
  server.take('POST', '/friend-requests/2/accept').resolve({ status: 'friends', friend: bob }); await flush();
  server.take('GET', '/users/2').resolve(friend); await flush();
  assert.match(text(h.tree), /友達です/);
  assert.equal(buttons(h.tree, '承認する').length, 0);
  assert.doesNotMatch(text(h.tree), /届いています/);
});

test('承認に失敗したら（相手が取り消した等）状態を取り直し、古い「承認する」を残さない', async () => {
  const { server, h } = setup();
  server.take('GET', '/users/2').resolve(profile('received')); await flush();
  press(h.tree, '承認する');
  server.take('POST', '/friend-requests/2/accept').reject(new Error('友達申請が見つかりません')); await flush();
  server.take('GET', '/users/2').resolve(profile('none')); await flush();
  assert.match(text(h.tree), /友達申請が見つかりません/);
  assert.equal(buttons(h.tree, '承認する').length, 0);
  assert.equal(buttons(h.tree, '友達申請').length, 1);
});

test('友達には申請ボタンを出さない', async () => {
  const { server, h } = setup();
  server.take('GET', '/users/2').resolve(friend); await flush();
  assert.match(text(h.tree), /友達です/);
  assert.equal(buttons(h.tree, '友達申請').length + buttons(h.tree, '承認する').length, 0);
});
