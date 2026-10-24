// 実行: node --test src/components/create/time.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, filename);
};
const { resolveTimeText } = require('./time.ts');
test('今すぐ・1時間後、ゼロ埋め、翌日・月年境界を扱い元のDateを変えない', () => {
  const now = new Date(2026, 11, 31, 23, 30);
  const before = now.getTime();
  assert.equal(resolveTimeText('', '今すぐ', now), '23:30〜');
  assert.equal(resolveTimeText('', '30分後', now), '明日 00:00〜');
  assert.equal(resolveTimeText('', '1時間後', now), '明日 00:30〜');
  assert.equal(now.getTime(), before);
  assert.equal(resolveTimeText('', '今すぐ', new Date(2026, 9, 24, 8, 5)), '08:05〜');
  assert.equal(resolveTimeText('', '1時間後', new Date(2026, 9, 24, 18, 12)), '19:12〜');
});
test('自由入力・空欄・保存済みの時刻は変換しない（候補と同じ文字でも）', () => {
  for (const text of ['', '19時に集合', '30分後', '今すぐ', '明日 00:30〜', 'あ'.repeat(20)]) {
    assert.equal(resolveTimeText(text, null, new Date(2026, 9, 24, 18, 12)), text);
  }
});
test('候補の30分後を保存時のローカル時刻へ変換する', () => {
  assert.equal(resolveTimeText('', '30分後', new Date(2026, 9, 24, 18, 12)), '18:42〜');
});
