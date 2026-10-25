import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  CELEBRATION, birdOrigin, celebrationEffects, celebrationTotalMs, letterDelays, shakeInput, shakeOutput,
} from './timing.ts';

test('演出はヒットストップのあと約3秒で自動で消える', () => {
  assert.equal(celebrationTotalMs(), CELEBRATION.hitStopMs + CELEBRATION.burstMs);
  assert.equal(celebrationTotalMs(), 2950);
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
