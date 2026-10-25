import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldShowOnboarding } from './state.ts';

test('未ログインで保存値が無い端末だけ初回案内を表示する', () => {
  assert.equal(shouldShowOnboarding(false, null), true);
  assert.equal(shouldShowOnboarding(false, '1'), false);
  assert.equal(shouldShowOnboarding(false, ''), false);
  assert.equal(shouldShowOnboarding(true, null), false);
  assert.equal(shouldShowOnboarding(true, '1'), false);
});
