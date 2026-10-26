const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, mount, buttons, findAll, fakeApi, flush, styles } = require('../testing/render.cjs');

const event = { id: 10, title: '遊び', expires_at: 9999999999999, count: 1, capacity: 5, joined: false, is_host: false, host: { id: 2 }, members: [] };

function chat(settings = { sound: false, vibrate: true, ready: true }) {
  const backend = fakeApi(), calls = [];
  const rn = {
    ActivityIndicator: 'ActivityIndicator', KeyboardAvoidingView: 'KeyboardAvoidingView', Modal: 'Modal',
    Platform: { OS: 'web' }, Pressable: 'Pressable', ScrollView: 'ScrollView', Text: 'Text', TextInput: 'TextInput', View: 'View',
  };
  const { ChatSheet } = load(__dirname + '/ChatSheet.tsx', {
    'react-native': rn,
    'react-native-svg': { default: 'Svg', Path: 'Path' },
    '../api': { api: backend.api },
    '../lib/util': { errMsg: e => e.message, usePolling() {} },
    '../ui/Avatar': { Avatar: 'Avatar' },
    '../ui/Sheet': { Sheet: 'Sheet' },
    '../ui/theme': { C: styles, S: styles, T: styles, tint: () => ({}) },
    './ParticipantsSheet': { ParticipantsSheet: 'ParticipantsSheet' },
    './celebration/JoinCelebration': { JoinCelebration: 'JoinCelebration' },
    './celebration/birds': { preloadBirdImages() {} },
    './celebration/feedback': {
      prepareCelebrationSound() {},
      startJoinHaptic: on => {
        if (on) calls.push('start');
        return () => { if (on) calls.push('stop'); };
      },
    },
    './celebration/settings': { useCelebrateSettings: () => settings },
    './chat/messages': { canJoin: () => true, mergeMessages: (a, b) => a.concat(b) },
  });
  const h = mount(() => ChatSheet({ eventId: 10, me: { id: 1 }, onClose() {}, onChanged() {}, onEdit() {} }));
  return { h, backend, calls };
}

async function opened(settings) {
  const ctx = chat(settings);
  ctx.backend.take('GET', '/events/10').resolve({ event });
  await flush();
  return ctx;
}

const tapJoin = h => buttons(h.tree, '参加する')[0].props.onPress();
const celebration = h => findAll(h.tree, n => n.type === 'JoinCelebration')[0].props.visible;

test('チャットの参加タップでAPI応答を待たずに1回だけ振動を開始する', async () => {
  const { h, backend, calls } = await opened();
  const pending = tapJoin(h);
  assert.deepEqual(calls, ['start']);
  backend.take('POST', '/events/10/join').resolve({ event: { ...event, joined: true } });
  await pending;
  await flush();
  // 成功後の演出側から重ねて要求しない
  assert.deepEqual(calls, ['start']);
  assert.equal(celebration(h), true);
  h.unmount();
});

test('参加APIが失敗したら開始した振動を止めて演出を出さない', async () => {
  const { h, backend, calls } = await opened();
  const pending = tapJoin(h);
  assert.deepEqual(calls, ['start']);
  backend.take('POST', '/events/10/join').reject(Error('満員'));
  await pending;
  await flush();
  assert.deepEqual(calls, ['start', 'stop']);
  assert.equal(celebration(h), false);
  assert.match(JSON.stringify(h.tree), /満員/);
  h.unmount();
});

test('画面を離れたら開始した振動を止める', async () => {
  const { h, backend, calls } = await opened();
  tapJoin(h);
  assert.deepEqual(calls, ['start']);
  h.unmount();
  assert.deepEqual(calls, ['start', 'stop']);
  backend.take('POST', '/events/10/join').resolve({ event: { ...event, joined: true } });
  await flush();
  assert.deepEqual(calls, ['start', 'stop']);
});

for (const settings of [{ sound: false, vibrate: false, ready: true }, { sound: false, vibrate: true, ready: false }]) {
  test(`オフ／設定未読では参加タップで振動しない ${JSON.stringify(settings)}`, async () => {
    const { h, backend, calls } = await opened(settings);
    const pending = tapJoin(h);
    assert.deepEqual(calls, []);
    backend.take('POST', '/events/10/join').resolve({ event: { ...event, joined: true } });
    await pending;
    await flush();
    assert.deepEqual(calls, []);
    h.unmount();
  });
}
