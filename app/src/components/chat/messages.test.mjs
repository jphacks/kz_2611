import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeMessages, canJoin } from './messages.ts';

test('送信と定期取得が重なってもID順で重複しない', () => {
  const m = (id) => ({ id, event_id: 1, user: null, kind: 'system', body: '参加しました', created_at: 0 });
  assert.deepEqual(mergeMessages([m(2)], [m(1), m(2), m(3)]).map(x => x.id), [1, 2, 3]);
});
test('未参加・募集中・空きありのときだけ参加できる', () => {
  const e = { joined: false, is_host: false, count: 2, capacity: 3, expires_at: 101 };
  assert.equal(canJoin(e, 100), true);
  for (const change of [{ joined: true }, { is_host: true }, { count: 3 }, { expires_at: 100 }]) {
    assert.equal(canJoin({ ...e, ...change }, 100), false);
  }
});
