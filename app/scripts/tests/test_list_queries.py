"""一覧ハンドラのD1呼び出し数が件数で増えないことを検証する。SQLの結果はAPI統合テストで確認。"""
import subprocess
import tempfile
from pathlib import Path

app = Path(__file__).resolve().parents[2]
scratch = app / '.wrangler' / 'test-queries'
scratch.mkdir(parents=True, exist_ok=True)
with tempfile.TemporaryDirectory(prefix='kz-queries-', dir=scratch) as temp:
    subprocess.run([str(app / 'node_modules/.bin/tsc'), '--ignoreConfig', '--skipLibCheck', '--target', 'ES2022', '--module', 'commonjs',
                    '--outDir', temp, *[str(app / f'functions/lib/{name}.ts')
                                       for name in ('events', 'chat', 'groups')]], check=True, cwd=app)
    script = Path(temp) / 'check.cjs'
    script.write_text(r'''
const assert = require('node:assert/strict');
async function count(file, exported, path, size) {
  let calls = 0;
  const rows = Array.from({length: size}, (_, i) => ({id: i + 1, event_id: i + 1,
    host_id: 1, group_id: null, expires_at: Date.now() + 60000, created_at: 1,
    capacity: 3, capacity_min: 2, duration_min: 15, last_id: i + 1, message_id: i + 1}));
  const db = { prepare(sql) {
    const stmt = { bind(...values) { assert.ok(values.length <= 100, 'D1バインド変数上限'); return stmt; }, async all() {
      calls++;
      if (/FROM events e/.test(sql)) return {results: rows};
      if (/FROM event_members|FROM group_members/.test(sql)) return {results: []};
      if (/FROM messages/.test(sql) && !/FROM events/.test(sql)) return {results: []};
      return {results: rows};
    }, async first() { calls++; return rows[0]; } };
    return stmt;
  }};
  const route = require('./' + file + '.js')[exported].find(r => r.method === 'GET' && r.path.test(path));
  const response = await route.handler({env: {DB: db}, me: {id: 1}, url: new URL('http://localhost' + path)});
  assert.equal(response.status, 200);
  return calls;
}
(async () => {
  for (const [file, exported, path] of [['events','eventRoutes','/events'], ['chat','chatRoutes','/talks'], ['groups','groupRoutes','/groups']]) {
    const small = await count(file, exported, path, 1);
    const large = await count(file, exported, path, 150);
    assert.equal(large, small, path + ' のD1呼び出し数');
    assert.ok(large <= 2, path + ' は最大2回');
    assert.equal(await count(file, exported, path, 0), 1, path + ' 空一覧では追加問い合わせなし');
    console.log('ok ' + path + ' D1呼び出し数: ' + small + ' → ' + large);
  }
})().catch(e => { console.error(e); process.exit(1); });
''')
    subprocess.run(['node', str(script)], check=True, cwd=app)
