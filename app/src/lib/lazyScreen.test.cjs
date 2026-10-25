// 画面の遅延読み込み（#135）のテスト。
// 読み込み中の案内・失敗時の再試行・成功後の再取得なしを、実際の画面と同じ順序で確かめる。
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { load, mount, text, findAll, flush } = require('../testing/render.cjs');

const read = p => fs.readFileSync(path.join(__dirname, '..', '..', p), 'utf8');

function modules() {
  return {
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', ActivityIndicator: 'ActivityIndicator' },
    '../ui/theme': { C: { red: '#FF5A36' }, S: { screen: {}, btn: {}, btnText: {} }, T: { screenTitle: {}, sub: {} } },
  };
}

const deferred = () => {
  let resolve, reject;
  const promise = new Promise((ok, ng) => { resolve = ok; reject = ng; });
  return { promise, resolve, reject };
};

test('読み込み中は案内を出し、終わったら画面を描く', async () => {
  const screen = () => ({ type: 'LoadedScreen', props: {} });
  let calls = 0;
  const lazy = load(path.join(__dirname, 'lazyScreen.tsx'), modules());
  const Screen = lazy.lazyScreen(() => { calls++; return Promise.resolve({ default: screen }); });
  const view = mount(() => Screen({ me: null }));
  assert.equal(text(view.tree), '読み込み中…');
  assert.equal(view.tree.type, 'View');
  await flush();
  assert.equal(calls, 1);
  assert.equal(view.tree.type, 'LoadedScreen');
});

test('成功した画面は覚えておき、描き直しやタブの戻りで読み直さない', async () => {
  const lazy = load(path.join(__dirname, 'lazyScreen.tsx'), modules());
  let calls = 0;
  const Screen = lazy.lazyScreen(() => { calls++; return Promise.resolve({ default: () => ({ type: 'LoadedScreen', props: {} }) }); });
  const first = mount(() => Screen({}));
  await flush();
  first.unmount();
  // タブを切り替えて戻ってきたときと同じ（同じコンポーネントをもう一度描く）
  const second = mount(() => Screen({}));
  assert.equal(second.tree.type, 'LoadedScreen');
  assert.equal(calls, 1);
});

test('失敗したら再試行を出し、押すと読み直して復旧する', async () => {
  const lazy = load(path.join(__dirname, 'lazyScreen.tsx'), modules());
  let calls = 0;
  const pending = [];
  const Screen = lazy.lazyScreen(() => {
    calls++;
    const d = deferred();
    pending.push(d);
    return d.promise;
  });
  const view = mount(() => Screen({}));
  assert.equal(text(view.tree), '読み込み中…');
  pending[0].reject(new Error('chunk load failed'));
  await flush();
  assert.equal(text(view.tree), '読み込めませんでした電波の状況を確かめて、もう一度お試しください。再試行');
  const retry = findAll(view.tree, n => n.type === 'Pressable');
  assert.equal(retry.length, 1);
  retry[0].props.onPress();
  assert.equal(calls, 2);
  assert.equal(text(view.tree), '読み込み中…');
  pending[1].resolve({ default: () => ({ type: 'LoadedScreen', props: {} }) });
  await flush();
  assert.equal(view.tree.type, 'LoadedScreen');
});

test('同時に読んでも同じ読み込みを共有する', async () => {
  const lazy = load(path.join(__dirname, 'lazyScreen.tsx'), modules());
  let calls = 0;
  const loader = lazy.createScreenLoader(() => { calls++; return Promise.resolve({ default: () => ({}) }); });
  const [a, b] = await Promise.all([loader.load(), loader.load()]);
  assert.equal(calls, 1);
  assert.equal(a, b);
  assert.equal(loader.get(), a);
});

test('ログイン後にしか使わない画面は初回のバンドルに静的 import しない', () => {
  const main = read('src/Main.tsx');
  for (const name of ['Board', 'Create', 'Talk', 'Follow', 'Profile']) {
    assert.ok(!main.includes(`import { ${name}Screen }`), `${name}Screen が静的 import されている`);
    assert.ok(main.includes(`import('./screens/${name}Screen')`), `${name}Screen が遅延読み込みされていない`);
  }
  // 初回案内とログインは最初の画面なので、先に読む（遅延にしない）
  assert.ok(main.includes("import { AuthScreen } from './screens/AuthScreen'"));
  assert.ok(main.includes("import { OnboardingScreen } from './screens/OnboardingScreen'"));
});
