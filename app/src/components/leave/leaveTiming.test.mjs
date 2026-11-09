import { test } from 'node:test';
import assert from 'node:assert/strict';
import { LEAVE_TIMING, LEAVE_TEXT, dripProgress, lidOpen } from './leaveTiming.ts';

test('演出は暗転→開く→見つめる→切れるの順で、約8秒で終わる', () => {
  const s = LEAVE_TIMING;
  const order = [s.slit, s.open0, s.open1, s.look, s.stare, s.whisper, s.cut, s.end];
  assert.deepEqual([...order].sort((a, b) => a - b), order);
  assert.ok(s.end <= 9000);
});

test('暗転のあいだは目を閉じたまま、見つめるときは見開く', () => {
  assert.equal(lidOpen(0), 0);
  assert.equal(lidOpen(LEAVE_TIMING.slit - 1), 0);
  assert.ok(lidOpen(LEAVE_TIMING.open1 + 50) > 0.99);
  assert.ok(lidOpen(LEAVE_TIMING.stare + 400) > 1.1);
});

test('血のしずくは止まりながらも戻らずに最後まで伸びる', () => {
  for (const pause of [0, 0.5, 1]) {
    let last = 0;
    for (let u = 0; u <= 1; u += 0.01) {
      const p = dripProgress(u, pause);
      assert.ok(p >= last - 1e-9);
      last = p;
    }
    assert.ok(Math.abs(dripProgress(1, pause) - 1) < 1e-9);
  }
});

test('血文字は「なんでやめたの」だけ（名前は出さない）', () => {
  assert.equal(LEAVE_TEXT, 'なんでやめたの');
});
