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
const { roundUpTime, parseTimeText, formatWheelTime } = require('./time.ts');
test('現在時刻を5分刻みに切り上げ、日をまたいでもDateを変えない', () => {
  const now = new Date(2026, 11, 31, 23, 58);
  const before = now.getTime();
  assert.deepEqual(roundUpTime(now), { hour: 0, minute: 0 });
  assert.deepEqual(roundUpTime(new Date(2026, 9, 24, 18, 3)), { hour: 18, minute: 5 });
  assert.deepEqual(roundUpTime(new Date(2026, 9, 24, 18, 5)), { hour: 18, minute: 5 });
  assert.equal(now.getTime(), before);
  assert.deepEqual(roundUpTime(new Date(2026, 9, 24, 18, 5, 1)), { hour: 18, minute: 10 });
});
test('保存済みの時刻を解析し、古い自由入力は現在時刻へ戻す', () => {
  const now = new Date(2026, 9, 24, 18, 3);
  assert.deepEqual(parseTimeText('08:07〜', now), { hour: 8, minute: 7 });
  assert.deepEqual(parseTimeText('明日 00:30〜', now), { hour: 0, minute: 30 });
  for (const value of ['', '今すぐ', '19時', '24:00〜', '12:60〜', '8:05〜']) {
    assert.deepEqual(parseTimeText(value, now), { hour: 18, minute: 5 });
  }
});
test('選択が現在の分より前なら翌日、同じ分なら今日としてゼロ埋め保存', () => {
  const now = new Date(2026, 11, 31, 18, 5, 30);
  assert.equal(formatWheelTime({ hour: 18, minute: 0 }, now), '明日 18:00〜');
  assert.equal(formatWheelTime({ hour: 18, minute: 5 }, now), '18:05〜');
  assert.equal(formatWheelTime({ hour: 19, minute: 0 }, now), '19:00〜');
  assert.equal(formatWheelTime({ hour: 0, minute: 0 }, new Date(2026, 11, 31, 23, 59)), '明日 00:00〜');
});
