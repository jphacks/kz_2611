// API を読み込まず、実デモの描画・本番部品への props を確かめる。
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(require('node:path').join(__dirname, 'Demos.tsx'), 'utf8');

function harness() {
  const slots = []; let cursor = 0;
  const react = {
    createElement(type, props, ...children) { return typeof type === 'function' ? type({ ...props, children }) : { type, props: { ...props, children: children.flat() } }; },
    useState(initial) { const i = cursor++; if (!(i in slots)) slots[i] = typeof initial === 'function' ? initial() : initial; return [slots[i], value => { slots[i] = value; }]; },
    useRef(initial) { const i = cursor++; return slots[i] ||= { current: initial }; },
    useEffect() {}, useCallback: fn => fn,
  };
  class Value { constructor(value) { this.value = value; } interpolate() { return this.value; } setValue(value) { this.value = value; } }
  const theme = { C: {}, T: {}, S: {}, tint: id => `tint-${id}`, popColor: () => 'pop' };
  const exports = {};
  vm.runInNewContext(ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.React, module: ts.ModuleKind.CommonJS } }).outputText, {
    exports, React: react, Date,
    require: id => {
      if (id.endsWith('.png')) return 'bird';
      if (id === 'react') return react;
      if (id === 'react-native') return { View: 'View', Text: 'Text', Pressable: 'Pressable', Image: 'Image', StyleSheet: { create: x => x }, Animated: { Value, View: 'AnimatedView' }, Easing: {} };
      if (id === 'react-native-svg') return { __esModule: true, default: 'Svg', Path: 'Path' };
      if (id.includes('theme')) return theme;
      if (id.includes('EventCard')) return { EventCard: 'EventCard' };
      if (id.includes('Avatar')) return { Avatar: 'Avatar' };
      if (id.includes('Chip')) return { Chip: 'Chip' };
      if (id.includes('TimeWheel')) return { TimeWheel: 'TimeWheel' };
      throw new Error(`デモで不要な依存: ${id}`);
    },
  });
  return { render(name, props = {}) { cursor = 0; return exports[name]({ active: true, reduced: true, ...props }); } };
}
function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  return tree && typeof tree === 'object' ? [tree, ...nodes(tree.props?.children)] : [];
}
test('掲示板は本番カード3枚にダミーの未参加募集と副作用のない操作を渡す', () => {
  const h = harness();
  nodes(h.render('BoardDemo')).filter(n => n.type === 'View' && n.props.onLayout).forEach(n => n.props.onLayout({ nativeEvent: { layout: { width: 306 } } }));
  const cards = nodes(h.render('BoardDemo')).filter(n => n.type === 'EventCard');
  assert.equal(cards.length, 3);
  assert.deepEqual(cards.map(n => n.props.event.title), ['カラオケ', 'ラーメン', '夜ドライブ']);
  for (const { props } of cards) {
    assert.equal(props.event.joined, false);
    assert.equal(props.event.is_host, false);
    assert.ok(props.event.expires_at > Date.now());
    for (const action of ['onOpen', 'onJoin', 'onLeave', 'onDelete', 'onPressMembers']) assert.equal(props[action](props.event), undefined);
  }
});
test('誘うは本番のホイールとチップを表示専用で使う', () => {
  const tree = nodes(harness().render('InviteDemo'));
  const wheel = tree.find(n => n.type === 'TimeWheel');
  assert.equal(wheel.props.value.hour, 19);
  assert.equal(wheel.props.value.minute, 0);
  assert.equal(tree.filter(n => n.type === 'Chip').length, 5);
  assert.ok(tree.some(n => n.props.pointerEvents === 'none'));
});
test('参加は本番カードの操作で一度だけ演出を通知し、通信しない', () => {
  const h = harness(); let touches = 0;
  const props = { onTouch: () => { touches++; } };
  nodes(h.render('SlideDemo', props)).filter(n => n.type === 'View' && n.props.onLayout).forEach(n => n.props.onLayout({ nativeEvent: { layout: { width: 306 } } }));
  const card = nodes(h.render('SlideDemo', props)).find(n => n.type === 'EventCard');
  card.props.onJoin(card.props.event);
  card.props.onJoin(card.props.event);
  assert.equal(touches, 1);
  assert.equal(card.props.onLeave(card.props.event), undefined);
});

test('チャットは参加者の Avatar・左右の吹き出しと送信アイコンを描き、入力は作らない', () => {
  const tree = nodes(harness().render('ChatDemo'));
  assert.equal(tree.filter(n => n.type === 'Avatar').length, 4);
  assert.equal(tree.filter(n => n.type === 'Svg').length, 1);
  assert.equal(tree.filter(n => n.type === 'TextInput').length, 0);
  assert.ok(tree.some(n => n.props.style?.alignSelf === 'flex-end'));
});
