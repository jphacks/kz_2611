const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, mount, text, buttons, findAll, press, fakeApi, flush, styles } = require('../testing/render.cjs');

const me = { id: 1, handle: 'me', name: '自分', avatar: null, invite_code: 'mine' };
const bob = { id: 2, handle: 'bob', name: 'ボブ', avatar: null };
const carol = { id: 3, handle: 'carol', name: 'キャロル', avatar: null };

function setup(invite = null) {
  const replaced = [];
  const server = fakeApi();
  const social = { friends: [], refreshes: 0 };
  const util = { errMsg: e => e.message };
  // 申請一覧は実物のフックを使う（取り直しと画面の組み合わせを確かめる）
  const { useFriendRequests } = load(__dirname + '/../hooks/useFriendRequests.ts', {
    '../api': { api: server.api }, '../lib/util': util,
    './useClock': { isVisible: () => true, onVisibilityChange: () => () => {} },
  });
  const { FollowScreen } = load(__dirname + '/FollowScreen.tsx', {
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', ActivityIndicator: 'ActivityIndicator', TextInput: 'TextInput', Platform: { OS: invite ? 'web' : 'ios' }, StyleSheet: { create: s => s } },
    '../api': { api: server.api },
    '../ui/Header': { Header: () => null },
    '../ui/Avatar': { Avatar: () => null },
    '../ui/Sheet': { Sheet: ({ visible, children }) => visible ? { type: 'Sheet', props: { children } } : null },
    '../ui/theme': { C: styles, S: styles, T: styles },
    '../hooks/useSocialData': { useSocialData: () => ({ friends: social.friends, groups: [], loading: false, error: '', refresh: async () => { social.refreshes++; } }) },
    '../hooks/useFriendRequests': { useFriendRequests },
    '../lib/util': util,
    '../components/follow/GroupEditSheet': { GroupEditSheet: () => null },
    '../components/follow/InviteQr': { InviteQr: () => null },
    '../components/follow/invite': { inviteFromUrl: () => invite, inviteLink: code => 'https://example.com/?invite=' + code },
  }, { URL, window: { location: { href: 'https://example.com/?invite=' + invite }, history: { state: null, replaceState: (_, __, url) => replaced.push(url) } } });
  const h = mount(() => FollowScreen({ me }));
  return { server, social, h, replaced };
}
const lists = (server, received, sent) => server.take('GET', '/friend-requests').resolve({ received, sent });
const page = h => text(h.tree);

test('届いた申請を承認すると一覧から消え、友達一覧と申請一覧を取り直す', async () => {
  const { server, social, h } = setup();
  lists(server, [bob, carol], []); await flush();
  assert.match(page(h), /届いた友達申請 · 2/);
  assert.equal(buttons(h.tree, '承認する').length, 2);
  buttons(h.tree, '承認する')[0].props.onPress();
  assert.ok(buttons(h.tree, '承認する').every(b => b.props.disabled), '処理中は他の申請も押せない');
  server.take('POST', '/friend-requests/2/accept').resolve({ status: 'friends', friend: bob }); await flush();
  social.friends = [bob];
  lists(server, [carol], []); await flush();
  assert.equal(social.refreshes, 1);
  assert.match(page(h), /ボブさんと友達になりました/);
  assert.match(page(h), /届いた友達申請 · 1/);
  const panel = findAll(h.tree, n => n.type === 'View' && text(n).startsWith('届いた友達申請'))[0];
  assert.doesNotMatch(text(panel), /ボブ/); assert.match(text(panel), /キャロル/);
  assert.equal(buttons(h.tree, '承認する').length, 1);
});

test('届いた申請を拒否すると DELETE し、最後の1件なら欄ごと消える', async () => {
  const { server, social, h } = setup();
  lists(server, [bob], []); await flush();
  press(h.tree, '拒否する');
  server.take('DELETE', '/friend-requests/2').resolve({ ok: true }); await flush();
  lists(server, [], []); await flush();
  assert.match(page(h), /ボブさんの申請を断りました/);
  assert.doesNotMatch(page(h), /届いた友達申請/);
  assert.equal(social.refreshes, 1);
});

test('送った申請を取り消すと DELETE し、送った申請の欄が消える', async () => {
  const { server, h } = setup();
  lists(server, [], [carol]); await flush();
  assert.match(page(h), /送った友達申請 · 1/);
  assert.match(page(h), /@carol · 申請中/);
  press(h.tree, '取り消す');
  server.take('DELETE', '/friend-requests/3').resolve({ ok: true }); await flush();
  lists(server, [], []); await flush();
  assert.match(page(h), /キャロルさんへの申請を取り消しました/);
  assert.doesNotMatch(page(h), /送った友達申請/);
});

test('承認に失敗したらエラーを出し、申請一覧だけ取り直す', async () => {
  const { server, social, h } = setup();
  lists(server, [bob], []); await flush();
  press(h.tree, '承認する');
  server.take('POST', '/friend-requests/2/accept').reject(new Error('友達申請が見つかりません')); await flush();
  lists(server, [], []); await flush();
  assert.match(page(h), /友達申請が見つかりません/);
  assert.doesNotMatch(page(h), /届いた友達申請/);
  assert.equal(social.refreshes, 0);
  assert.equal(findAll(h.tree, n => n.type === 'Pressable' && n.props.disabled && text(n) === '再読み込み').length, 0);
});

test('IDでの追加は申請（requested）なら申請した旨、friend が返れば友達になった旨を出す', async () => {
  const { server, h } = setup();
  lists(server, [], []); await flush();
  const input = () => findAll(h.tree, n => n.type === 'TextInput')[0];
  input().props.onChangeText('carol');
  press(h.tree, 'IDで追加');
  const sent = server.take('POST', '/friends');
  assert.equal(JSON.stringify(sent.body), '{"handle":"carol"}');
  sent.resolve({ status: 'requested' }); await flush();
  lists(server, [], [carol]); await flush();
  assert.match(page(h), /@carolさんに友達申請しました。承認されると友達になります/);
  assert.match(page(h), /送った友達申請 · 1/);
  assert.equal(input().props.value, '');

  input().props.onChangeText('bob'); // 相手からも申請が届いていた
  press(h.tree, 'IDで追加');
  server.take('POST', '/friends').resolve({ status: 'friends', friend: bob }); await flush();
  lists(server, [], [carol]); await flush();
  assert.match(page(h), /ボブさんと友達になりました/);
});

test('招待リンクの追加は status なしの { friend } でも友達になった旨を出し、招待を消す', async () => {
  const { server, social, h, replaced } = setup('bobcode');
  server.take('GET', '/invite/bobcode').resolve({ user: bob });
  lists(server, [], []); await flush();
  press(h.tree, '友達に追加する');
  const sent = server.take('POST', '/friends');
  assert.equal(JSON.stringify(sent.body), '{"invite_code":"bobcode"}');
  sent.resolve({ friend: bob }); await flush();
  lists(server, [], []); await flush();
  assert.match(page(h), /ボブさんと友達になりました/);
  assert.doesNotMatch(page(h), /招待が届いています/);
  assert.equal(social.refreshes, 1);
  assert.deepEqual([...replaced], ['https://example.com/']);
});

test('招待確認に失敗しても「再読み込み」で確認し直し、招待シートを表示する', async () => {
  const { server, h } = setup('bobcode');
  server.take('GET', '/invite/bobcode').reject(new Error('Failed to fetch'));
  lists(server, [], []); await flush();
  assert.match(page(h), /招待を確認できませんでした: Failed to fetch/);
  press(h.tree, '再読み込み');
  server.take('GET', '/invite/bobcode').resolve({ user: bob });
  lists(server, [], []); await flush();
  assert.doesNotMatch(page(h), /招待を確認できませんでした/);
  assert.match(page(h), /招待が届いています/);
  assert.match(page(h), /ボブ/);
});

test('再読み込みしても招待確認に失敗したら、招待エラーを出し続ける', async () => {
  const { server, social, h } = setup('bobcode');
  server.take('GET', '/invite/bobcode').reject(new Error('Failed to fetch'));
  lists(server, [], []); await flush();
  press(h.tree, '再読み込み');
  server.take('GET', '/invite/bobcode').reject(new Error('Failed to fetch'));
  lists(server, [], []); await flush();
  assert.match(page(h), /招待を確認できませんでした: Failed to fetch/);
  assert.doesNotMatch(page(h), /招待が届いています/);
  assert.equal(social.refreshes, 1);
});
