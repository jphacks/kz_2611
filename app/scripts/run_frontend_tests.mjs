import { readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { spawnSync } from 'node:child_process';

const root = new URL('../src', import.meta.url).pathname;
const files = [];
function walk(dir) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const st = statSync(full);
    if (st.isDirectory()) walk(full);
    else if (name.endsWith('.test.cjs') || name.endsWith('.test.mjs')) files.push(full);
  }
}
walk(root);
files.sort();

if (files.length === 0) {
  console.error('テストファイルが見つかりません');
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', ...files], { stdio: 'inherit' });
process.exit(result.status ?? 1);
