import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const source = readFileSync(new URL('./Demos.tsx', import.meta.url), 'utf8');
test('掲示板と参加デモは本番の EventCard をダミーデータで描画する', () => {
  assert.match(source, /import \{ EventCard \} from '\.\.\/EventCard'/);
  assert.match(source, /<EventCard /);
  assert.doesNotMatch(source, /function Hand\(/);
  assert.doesNotMatch(source, /\bapi\s*\(/);
});
