import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profilePatch, jpegDataUrl } from './profile.ts';
import * as profile from './profile.ts';

test('破損画像の0・負数・有限でない寸法は切り取り前に拒否する', () => {
  for (const [width, height] of [[0, 0], [0, 100], [100, 0], [-1, 100], [NaN, 100], [100, Infinity]]) {
    assert.throws(() => profile.validateImageAsset({ width, height }), /画像を読み込めませんでした/);
  }
});

test('正しい画像と大きな画像は切り取り・縮小へ進める', () => {
  for (const [width, height] of [[1, 1], [640, 480], [8192, 8192]]) {
    assert.doesNotThrow(() => profile.validateImageAsset({ width, height }));
  }
});

test('変更した名前と写真だけを送信する', () => {
  const me = { name: '元の名前', avatar: null };
  assert.deepEqual(profilePatch(me, ' 新しい名前 ', 'data:image/jpeg;base64,YQ=='), { name: '新しい名前', avatar: 'data:image/jpeg;base64,YQ==' });
  assert.deepEqual(profilePatch(me, '元の名前', null), {});
  assert.throws(() => profilePatch(me, '  ', null), /名前/);
  assert.throws(() => profilePatch(me, 'あ'.repeat(21), null), /20/);
  assert.deepEqual(profilePatch({ name: '名前', avatar: '写真' }, '名前', null), { avatar: null });
});

test('JPEGのdata URLを200KB以下に制限する', () => {
  assert.equal(jpegDataUrl('YQ=='), 'data:image/jpeg;base64,YQ==');
  assert.throws(() => jpegDataUrl(undefined), /画像/);
  assert.throws(() => jpegDataUrl('A'.repeat(205000)), /200KB/);
});
