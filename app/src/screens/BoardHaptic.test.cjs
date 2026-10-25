const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, mount, findAll, fakeApi, flush, styles } = require('../testing/render.cjs');

function board(settings = { sound: false, vibrate: true, ready: true }) {
  const backend = fakeApi(), calls = [];
  let refresh;
  const rn = Object.fromEntries(['ActivityIndicator', 'Pressable', 'ScrollView', 'Text', 'View'].map(k => [k, k]));
  const { BoardScreen } = load(__dirname + '/BoardScreen.tsx', {
    'react-native': rn,
    '../hooks/useSocialData': { useSocialData: () => ({ groups: [], friends: [{}], loading: false }) },
    '../hooks/useEventDeadline': { useEventDeadline: () => 0 },
    '../api': { api: backend.api },
    '../components/ChatSheet': { ChatSheet: 'ChatSheet' },
    '../components/EventCard': { EventCard: 'EventCard' },
    '../components/board/eventOrder': { compareBoardEvents: () => 0 },
    '../components/celebration/JoinCelebration': { JoinCelebration: 'JoinCelebration' },
    '../components/celebration/birds': { preloadBirdImages() {} },
    '../components/celebration/feedback': { prepareCelebrationSound() {}, startJoinHaptic: on => { if (on) calls.push('start'); return () => { if (on) calls.push('stop'); }; } },
    '../components/celebration/settings': { useCelebrateSettings: () => settings },
    '../components/ParticipantsSheet': { ParticipantsSheet: 'ParticipantsSheet' },
    '../lib/util': { errMsg: e => e.message, usePolling: fn => { refresh = fn; } },
    '../ui/Chip': { Chip: 'Chip' }, '../ui/Header': { Header: 'Header' },
    '../ui/theme': { C: styles, S: styles, T: styles },
  });
  const h = mount(() => BoardScreen({ me: { id: 1 } }));
  void refresh();
  const event = { id: 10, expires_at: 9999999999999, count: 1, capacity: 5, joined: false, is_host: false };
  backend.take('GET', '/events?group=all').resolve({ events: [event] });
  return { h, backend, calls, event };
}

test('API応答を待たず参加操作の同期処理で振動し、失敗時は止める', async () => {
  const { h, backend, calls, event } = board();
  await flush();
  const card = findAll(h.tree, n => n.type === 'EventCard')[0];
  const pending = card.props.onJoin(event);
  assert.deepEqual(calls, ['start']);
  backend.take('POST', '/events/10/join').reject(Error('満員'));
  await pending;
  assert.deepEqual(calls, ['start', 'stop']);
  assert.equal(findAll(h.tree, n => n.type === 'JoinCelebration')[0].props.visible, false);
  h.unmount();
});

for (const settings of [{ sound: false, vibrate: false, ready: true }, { sound: false, vibrate: true, ready: false }]) {
  test(`オフ／設定未読では振動を開始しない ${JSON.stringify(settings)}`, async () => {
    const { h, backend, calls, event } = board(settings);
    await flush();
    const pending = findAll(h.tree, n => n.type === 'EventCard')[0].props.onJoin(event);
    assert.deepEqual(calls, []);
    backend.take('POST', '/events/10/join').resolve({ event: { ...event, joined: true } });
    await pending;
    assert.deepEqual(calls, []);
    h.unmount();
  });
}
