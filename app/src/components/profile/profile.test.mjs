import { test } from 'node:test';
import assert from 'node:assert/strict';
import { profilePatch, jpegDataUrl } from './profile.ts';

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
