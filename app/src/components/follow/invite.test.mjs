import assert from 'node:assert/strict';
import { test } from 'node:test';
import { inviteLink, inviteFromUrl } from './invite.ts';

test('招待コードはURLとして安全に往復できる', () => {
  assert.equal(inviteLink('a+b/?'), 'https://kz2611.pages.dev/?invite=a%2Bb%2F%3F');
  assert.equal(inviteFromUrl(inviteLink('a+b/?')), 'a+b/?');
});
test('招待パラメーターがない・空・不正なURLでは確認を出さない', () => {
  for (const url of ['https://example.com/', 'https://example.com/?invite=', 'invalid']) assert.equal(inviteFromUrl(url), null);
});
