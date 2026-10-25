import test from 'node:test';
import assert from 'node:assert/strict';
import { celebrationSoundEnabled, shouldShowOnboarding } from './state.ts';

test('未ログインで保存値が無い端末だけ初回案内を表示する', () => {
  assert.equal(shouldShowOnboarding(false, null), true);
  assert.equal(shouldShowOnboarding(false, '1'), false);
  assert.equal(shouldShowOnboarding(false, ''), false);
  assert.equal(shouldShowOnboarding(true, null), false);
  assert.equal(shouldShowOnboarding(true, '1'), false);
});

test('参加の効果音は、設定がオンでユーザーが一度でも操作した後だけ鳴らす', () => {
  assert.equal(celebrationSoundEnabled(true, true), true);
  assert.equal(celebrationSoundEnabled(true, false), false); // 自動デモでは鳴らさない
  assert.equal(celebrationSoundEnabled(false, true), false); // 設定がオフ
  assert.equal(celebrationSoundEnabled(false, false), false);
});
