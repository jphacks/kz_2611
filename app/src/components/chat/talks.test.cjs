const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

const source = fs.readFileSync(path.join(__dirname, 'talks.ts'), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const moduleExports = {};
vm.runInNewContext(output, { exports: moduleExports });
const { mergeFirstPage, appendPage } = moduleExports;

const talk = (id, active = true) => ({ event: { id, created_at: id }, last: null, active });

test('全件を返した再取得では退出・削除したトークを残さない', () => {
  assert.deepEqual(Array.from(mergeFirstPage([talk(3), talk(2)], [talk(2)], null), t => t.event.id), [2]);
  assert.equal(mergeFirstPage([talk(2)], [], null).length, 0);
});

test('続きがある再取得でも先頭の確定範囲から消えた行を残さない', () => {
  assert.deepEqual(Array.from(mergeFirstPage([talk(5), talk(4), talk(1)], [talk(6), talk(4)], 'cursor'), t => t.event.id), [6, 4, 1]);
});

test('先頭ページの更新は読み込み済みの古いページを残し、同じイベントは先頭側だけにする', () => {
  const current = [talk(3), talk(2), talk(1)];
  const first = [talk(4), talk(2, false)];
  const merged = mergeFirstPage(current, first, 'cursor');
  assert.deepEqual(Array.from(merged, t => t.event.id), [4, 2, 1]);
  assert.equal(merged[1].active, false);
});

test('先頭ページで並びが変わったイベントは重複させず先頭へ移す', () => {
  const current = [talk(5), talk(4), talk(3), talk(2), talk(1)];
  const updated = { ...talk(2), last: { id: 10, created_at: 10 } };
  const merged = mergeFirstPage(current, [updated, talk(5)], 'cursor');
  assert.deepEqual(Array.from(merged, t => t.event.id), [2, 5, 4, 3, 1]);
});

test('次ページは後ろに足し、取得中に先頭ページへ移ったイベントは二重にしない', () => {
  const current = [talk(6), talk(5), talk(4)];
  const page = [talk(4), talk(3), talk(2)];
  assert.deepEqual(Array.from(appendPage(current, page), t => t.event.id), [6, 5, 4, 3, 2]);
});
