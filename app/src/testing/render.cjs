// フロントのテスト用の最小のフック実行環境（react-test-renderer なしで画面を1つ動かす）。
// .ts/.tsx を transpile して vm で読み、require は modules の差し替えで解決する。
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(file, modules, globals = {}) {
  const source = fs.readFileSync(file, 'utf8');
  const { outputText } = ts.transpileModule(source, { fileName: path.basename(file), compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } });
  const exports = {};
  vm.runInNewContext(outputText, { exports, React: runtime.React, console, setTimeout, clearTimeout, ...globals, require: id => {
    if (id === 'react') return runtime.React;
    if (!(id in modules)) throw new Error(`未定義のモジュール: ${id}（${path.basename(file)}）`);
    return modules[id];
  } });
  return exports;
}

const same = (a, b) => !!a && !!b && a.length === b.length && a.every((v, i) => Object.is(v, b[i]));

// 1つのコンポーネント（またはフック）だけを持つ描画。関数コンポーネントはその場で展開する（子はフックを使わないこと）。
const runtime = {
  current: null,
  React: {
    createElement(type, props, ...children) {
      const all = { ...props, children: children.length <= 1 ? children[0] : children };
      return typeof type === 'function' ? type(all) : { type, props: all };
    },
    Fragment: 'Fragment',
    useState(init) {
      const h = runtime.current, i = h.index++;
      if (!(i in h.slots)) h.slots[i] = typeof init === 'function' ? init() : init;
      return [h.slots[i], value => {
        if (h.unmounted) { h.lateUpdates++; return; }
        h.slots[i] = typeof value === 'function' ? value(h.slots[i]) : value; h.render();
      }];
    },
    useRef(init) {
      const h = runtime.current, i = h.index++;
      if (!(i in h.slots)) h.slots[i] = { current: init };
      return h.slots[i];
    },
    useCallback(fn, deps) {
      const h = runtime.current, i = h.index++;
      if (!h.slots[i] || !same(h.slots[i].deps, deps)) h.slots[i] = { fn, deps };
      return h.slots[i].fn;
    },
    useEffect(fn, deps) {
      const h = runtime.current, i = h.index++;
      const prev = h.slots[i];
      if (prev && deps && same(prev.deps, deps)) return;
      h.slots[i] = { deps, cleanup: prev?.cleanup };
      h.pending.push(() => { h.slots[i].cleanup?.(); h.slots[i].cleanup = fn() || undefined; });
    },
  },
};

/** fn をフックの持ち主として描画する。setState のたびに描き直し、tree を最新にする */
function mount(fn) {
  const h = { slots: [], index: 0, pending: [], tree: null, unmounted: false, lateUpdates: 0, rendering: false, dirty: false };
  h.render = () => {
    if (h.rendering) { h.dirty = true; return; }
    h.rendering = true;
    try {
      do {
        h.dirty = false; h.index = 0;
        const prev = runtime.current; runtime.current = h;
        try { h.tree = fn(); } finally { runtime.current = prev; }
        const effects = h.pending.splice(0);
        effects.forEach(run => run());
      } while (h.dirty && !h.unmounted);
    } finally { h.rendering = false; }
  };
  h.unmount = () => {
    h.unmounted = true;
    h.slots.forEach(slot => slot && typeof slot.cleanup === 'function' && slot.cleanup());
  };
  h.render();
  return h;
}

const kids = node => node == null || typeof node === 'boolean' ? [] : Array.isArray(node) ? node.flatMap(kids) : [node];
function text(node) {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node !== 'object') return String(node);
  if (Array.isArray(node)) return node.map(text).join('');
  return text(node.props.children);
}
function findAll(node, pred, out = []) {
  for (const n of kids(node)) {
    if (typeof n !== 'object') continue;
    if (pred(n)) out.push(n);
    findAll(n.props.children, pred, out);
  }
  return out;
}
/** 表示文字がちょうど label のボタン（Pressable） */
const buttons = (tree, label) => findAll(tree, n => n.type === 'Pressable' && text(n) === label);
function button(tree, label) {
  const found = buttons(tree, label);
  if (found.length !== 1) throw new Error(`ボタン「${label}」が ${found.length} 個: ${text(tree)}`);
  return found[0];
}
function press(tree, label) {
  const b = button(tree, label);
  if (b.props.disabled) throw new Error(`ボタン「${label}」は押せない`);
  b.props.onPress();
}

/** 外から解決できる api の差し替え。呼び出しは calls に積む */
function fakeApi() {
  const calls = [];
  const api = (p, opts = {}) => new Promise((resolve, reject) => calls.push({ path: p, method: opts.method || (opts.body ? 'POST' : 'GET'), body: opts.body, resolve, reject }));
  const take = (method, p) => {
    const i = calls.findIndex(c => c.method === method && c.path === p);
    if (i < 0) throw new Error(`${method} ${p} は呼ばれていない: ${calls.map(c => c.method + ' ' + c.path).join(', ')}`);
    return calls.splice(i, 1)[0];
  };
  return { api, calls, take };
}

const flush = async () => { for (let i = 0; i < 5; i++) await new Promise(resolve => setImmediate(resolve)); };
const styles = new Proxy({}, { get: () => ({}) });

module.exports = { load, mount, text, findAll, buttons, button, press, fakeApi, flush, styles };
