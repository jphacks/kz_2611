import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CELEBRATION, birdOrigin, celebrationEffects, celebrationTotalMs, letterDelays, rotateAt, shakeAt, shakeInput, shakeOutput, zoomAt } from './timing.ts';
import { QUALITY_STEPS, averageFps, nextQuality, particleCount } from './quality.ts';

test('ヒットストップを無くしても、演出は約3秒で自動で消える', () => {
  assert.equal(celebrationTotalMs(), CELEBRATION.burstMs);
  assert.equal(celebrationTotalMs(), 2800);
  assert.ok(celebrationTotalMs() <= 3000);
});

test('視差効果を減らすと揺れ・フラッシュ・色収差を止める', () => {
  assert.deepEqual(celebrationEffects(false), { shake: true, flash: true, chromatic: true });
  assert.deepEqual(celebrationEffects(true), { shake: false, flash: false, chromatic: false });
});

test('揺れは最大18pxで、視差効果を減らすと全部0になる', () => {
  const normal = shakeOutput(false);
  assert.equal(normal.length, shakeInput().length);
  assert.equal(Math.max(...normal.map(Math.abs)), CELEBRATION.shake);
  assert.ok(normal.some(v => v !== 0));
  assert.deepEqual(shakeOutput(true), normal.map(() => 0));
});

test('Canvas 用の揺れ・傾き・ズームは今の Animated と同じ形で、触れた瞬間から動く', () => {
  assert.equal(shakeAt(0, false), 0);
  assert.equal(shakeAt(0.02, false), -CELEBRATION.shake);
  assert.equal(shakeAt(0.35, false), 0);
  assert.equal(shakeAt(0.02, true), 0);
  assert.equal(rotateAt(0.045, false), -2);
  assert.equal(rotateAt(0.045, true), 0);
  assert.equal(zoomAt(0), 1);
  assert.equal(zoomAt(0.04), CELEBRATION.zoom);
  assert.equal(zoomAt(0.16), 1);
});

test('「とまった!!」は1文字ずつ遅れて出て、演出の終わりより前に出そろう', () => {
  const delays = letterDelays('とまった!!'.length);
  assert.equal(delays.length, 6);
  assert.equal(delays[0], CELEBRATION.letters / CELEBRATION.burstMs);
  for (let i = 1; i < delays.length; i++) {
    assert.ok(delays[i] > delays[i - 1]);
    assert.ok(Math.abs((delays[i] - delays[i - 1]) - CELEBRATION.letterStep / CELEBRATION.burstMs) < 1e-12);
  }
  assert.ok(delays[delays.length - 1] + 0.12 < 1);
  assert.deepEqual(letterDelays(0), []);
});

test('鳥の大群は画面のほぼ中央から飛び立つ', () => {
  assert.deepEqual(birdOrigin(390, 844), { x: 195, y: 844 * 0.52 });
  // レイアウト前（0）でも画面外にならない
  assert.deepEqual(birdOrigin(0, 0), { x: 195, y: 640 * 0.52 });
});

test('平均 FPS が50を下回ったときだけ、粒の数を1段階減らす', () => {
  assert.equal(averageFps(1000, 60), 60);
  assert.equal(averageFps(0, 0), 60);
  assert.equal(nextQuality(0, 60), 0);
  assert.equal(nextQuality(0, 50), 0);
  assert.equal(nextQuality(0, 49.9), 1);
  assert.equal(nextQuality(QUALITY_STEPS.length - 1, 20), QUALITY_STEPS.length - 1);
  assert.equal(particleCount(240, QUALITY_STEPS[0]), 240);
  assert.equal(particleCount(240, QUALITY_STEPS[QUALITY_STEPS.length - 1]), 79);
  assert.equal(particleCount(0, 1), 0);
});
