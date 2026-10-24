const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = p => fs.readFileSync(path.join(__dirname, '../..', p), 'utf8');
test('掲示板は毎秒更新せずカードへ時刻を渡さない', () => {
  const board = read('screens/BoardScreen.tsx');
  assert.ok(!board.includes('setInterval'));
  assert.ok(!board.includes('now={now}'));
  assert.ok(read('components/EventCard.tsx').includes('memo('));
});
test('友達・グループの取得と自己判定は共有データを使う', () => {
  for (const screen of ['Board', 'Create', 'Follow']) {
    const source = read(`screens/${screen}Screen.tsx`);
    assert.ok(source.includes('useSocialData('));
    assert.ok(!source.includes("api<{ groups: Group[] }>('/groups')"));
    assert.ok(!source.includes("api<{ friends: User[] }>('/friends')"));
  }
  assert.ok(!read('components/UserProfileSheet.tsx').includes("('/me')"));
  assert.ok(read('components/UserProfileSheet.tsx').includes('me.id === userId'));
});
