// 実シートを描画して権限と退会の確認操作を検証する。
const { test } = require('node:test');
const assert = require('node:assert/strict');
const ts = require('typescript');
const vm = require('node:vm');
const fs = require('node:fs');
function harness(id) {
  let cursor = 0; const slots = []; const calls = []; let refreshed = 0; let closed = 0;
  const react = { createElement: (type, props, ...children) => ({ type, props: { ...props, children: children.flat(Infinity) } }), useState(value) { const i = cursor++; if (!(i in slots)) slots[i] = value; return [slots[i], value => { slots[i] = value; }]; } };
  const exports = {};
  const source = fs.readFileSync(__dirname + '/GroupEditSheet.tsx', 'utf8');
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS } }).outputText, { exports, React: react, require: name => name === 'react' ? react : name === 'react-native' ? { Pressable: 'button', ScrollView: 'scroll', Text: 'text', TextInput: 'input', View: 'view', StyleSheet: { create: x => x } } : name.includes('/api') ? { api: async (...args) => { calls.push(args); } } : name.includes('theme') ? { C: {}, S: {}, T: {} } : name.includes('util') ? { errMsg: e => e.message } : {} });
  const users = [{ id: 1, name: '作成者' }, { id: 2, name: 'メンバー' }];
  const props = { group: { id: 8, name: '研究室', profile: '', owner_id: 1, members: users }, me: users[id - 1], friends: [...users, { id: 3, name: '友達' }], refresh: async () => { refreshed++; }, onClose: () => { closed++; } };
  const render = () => { cursor = 0; return exports.GroupEditSheet(props); };
  function nodes(n) { return !n || typeof n !== 'object' ? [] : [n, ...(n.props.children || []).flatMap(nodes)]; }
  const buttons = () => nodes(render()).filter(n => n.type === 'button');
  const text = n => (n.props.children || []).map(c => typeof c === 'object' ? text(c) : String(c ?? '')).join('');
  const press = label => { const b = buttons().find(n => text(n) === label); assert.ok(b, label); b.props.onPress(); };
  return { nodes: () => nodes(render()), labels: () => buttons().map(text), press, calls, get refreshed() { return refreshed; }, get closed() { return closed; } };
}
test('作成者だけが保存・友達追加・他人削除を操作できる', () => {
  const owner = harness(1); assert.ok(owner.labels().includes('変更を保存')); assert.ok(owner.labels().includes('友達さんを追加')); assert.ok(owner.labels().includes('メンバーさんを外す'));
  const member = harness(2); assert.deepEqual(member.labels(), ['閉じる', 'グループから抜ける']); assert.equal(member.nodes().filter(n => n.type === 'input').length, 0);
});
test('退会は確認後だけ実行し、共有データ更新後に閉じる', async () => {
  const h = harness(2); h.press('グループから抜ける'); assert.equal(h.calls.length, 0); h.press('やめる'); assert.equal(h.calls.length, 0);
  h.press('グループから抜ける'); h.press('確定する'); await new Promise(resolve => setImmediate(resolve));
  assert.equal(h.calls[0][0], '/groups/8/members/2'); assert.equal(h.calls[0][1].method, 'DELETE'); assert.equal(h.refreshed, 1); assert.equal(h.closed, 1);
});
