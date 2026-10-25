import test from 'node:test';
import assert from 'node:assert/strict';
import { isAuthRejection, restoreSession } from './session.ts';

const apiError = (status) => Object.assign(new Error('通信に失敗しました'), { status });
const networkError = () => new TypeError('Failed to fetch');

test('認証拒否（401/403）だけトークンを捨てる対象にする', () => {
  assert.equal(isAuthRejection(apiError(401)), true);
  assert.equal(isAuthRejection(apiError(403)), true);
});

test('通信失敗・5xx はトークンを捨てる対象にしない', () => {
  assert.equal(isAuthRejection(networkError()), false);
  assert.equal(isAuthRejection(apiError(500)), false);
  assert.equal(isAuthRejection(apiError(502)), false);
  assert.equal(isAuthRejection(apiError(503)), false);
  assert.equal(isAuthRejection(apiError(429)), false);
  assert.equal(isAuthRejection(undefined), false);
  assert.equal(isAuthRejection(null), false);
});

test('起動時に通信できなくても保存済みトークンを消さない', async () => {
  const cleared = [];
  const r = await restoreSession({
    token: 'saved',
    fetchMe: async () => { throw networkError(); },
    clearToken: async () => { cleared.push(1); },
  });
  assert.deepEqual(r, { me: null, failed: true });
  assert.deepEqual(cleared, []);
});

test('起動時に 5xx でも保存済みトークンを消さない', async () => {
  const cleared = [];
  const r = await restoreSession({
    token: 'saved',
    fetchMe: async () => { throw apiError(503); },
    clearToken: async () => { cleared.push(1); },
  });
  assert.deepEqual(r, { me: null, failed: true });
  assert.deepEqual(cleared, []);
});

test('通信復旧後の再試行は同じトークンでログイン状態に戻る', async () => {
  const cleared = [];
  let online = false;
  const fetchMe = async () => {
    if (!online) throw networkError();
    return { id: 1, handle: 'me', name: '自分', avatar: null, invite_code: 'abc' };
  };
  const opts = { token: 'saved', fetchMe, clearToken: async () => { cleared.push(1); } };
  assert.deepEqual(await restoreSession(opts), { me: null, failed: true });
  online = true;
  const retried = await restoreSession(opts);
  assert.equal(retried.failed, false);
  assert.equal(retried.me?.handle, 'me');
  assert.deepEqual(cleared, []);
});

test('無効・期限切れトークンは認証拒否として捨てる（従来どおり認証画面へ）', async () => {
  const cleared = [];
  const r = await restoreSession({
    token: 'expired',
    fetchMe: async () => { throw apiError(401); },
    clearToken: async () => { cleared.push(1); },
  });
  assert.deepEqual(r, { me: null, failed: false });
  assert.deepEqual(cleared, [1]);
});

test('トークンが無ければ /me を呼ばない', async () => {
  let called = 0;
  const r = await restoreSession({
    token: null,
    fetchMe: async () => { called += 1; return { id: 1 }; },
    clearToken: async () => {},
  });
  assert.deepEqual(r, { me: null, failed: false });
  assert.equal(called, 0);
});
