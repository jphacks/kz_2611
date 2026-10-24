// 実行: node --test src/components/create/form.test.cjs
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const fs = require('node:fs');
require.extensions['.ts'] = (module, filename) => {
  module._compile(ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText, filename);
};
const { validateDraft } = require('./form.ts');
const valid = { title: 'ご飯', place: '', time_text: '', capacity_min: 2, capacity: 4, duration_min: 30, group_id: null };
test('タイトル必須・API契約の上限と選択肢を検証する', () => {
  assert.equal(validateDraft(valid), '');
  for (const change of [
    { title: '   ' }, { title: 'あ'.repeat(21) }, { place: 'あ'.repeat(31) },
    { time_text: 'あ'.repeat(21) }, { capacity: 1 }, { capacity: 21 },
    { capacity: 2.5 }, { duration_min: 45 },
  ]) assert.notEqual(validateDraft({ ...valid, ...change }), '');
  assert.equal(validateDraft({ ...valid, capacity: 2, duration_min: 15 }), '');
  assert.equal(validateDraft({ ...valid, capacity: 20, duration_min: 120 }), '');
});
