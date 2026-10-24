// 実コンポーネントを変換し、描画・ジェスチャー・親 props の更新を検証する。
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(require('node:path').join(__dirname, '../EventCard.tsx'), 'utf8');
function harness(overrides = {}) {
  const slots = []; let cursor = 0; let effects = []; let handlers; let joins = 0; let opens = 0; let leaves = 0;
  class Value {
    constructor(v) { this.value = v; }
    setValue(v) { this.value = v; }
    stopAnimation() {}
    interpolate(config) { return { value: this, config }; }
  }
  const element = (type, props, ...children) => ({ type, props: { ...props, children: children.flat() } });
  const react = {
    createElement: element,
    useRef(v) { const i = cursor++; return slots[i] ||= { current: v }; },
    useState(v) { const i = cursor++; if (!(i in slots)) slots[i] = v; return [slots[i], n => { slots[i] = n; }]; },
    useEffect(fn) { effects.push(fn); },
  };
  const rn = {
    Platform: { OS: 'web' }, View: 'View', Text: 'Text', Pressable: 'Pressable',
    StyleSheet: { create: x => x, absoluteFill: {} },
    Animated: { Value, View: 'AnimatedView', spring: (v, c) => ({ start() { v.setValue(c.toValue); } }), timing: (v, c) => ({ start() { v.setValue(c.toValue); } }) },
    PanResponder: { create(h) { handlers = h; return { panHandlers: h }; } },
  };
  const output = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.React, jsxFactory: 'React.createElement', module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  vm.runInNewContext(output, { exports, React: react, requestAnimationFrame: fn => { effects.push(fn); }, setTimeout: fn => fn(), require: id => id === 'react' ? react : id === 'react-native' ? rn : id === 'react-native-svg' ? { default: 'Svg', Circle: 'Circle', Path: 'Path', Rect: 'Rect' } : id.includes('Avatar') ? { Avatar: 'Avatar' } : { C: { white: '#fff', yellow: '#FFD43B' }, FONT: 'Inter', RADIUS: 22, popColor: () => '#FF5A36' } });
  let props = { event: { id: 1, title: 'カラオケ', host: { name: '主催' }, members: [], count: 1, capacity: 4, duration_min: 60, expires_at: 3600000, joined: false, is_host: false }, now: 0, onJoin: () => { joins++; }, onLeave: () => { leaves++; }, onOpen: () => { opens++; }, onPressMembers() {}, ...overrides };
  function render(change = {}) { props = { ...props, ...change }; cursor = 0; effects = []; const tree = exports.EventCard(props); const pending = effects; effects = []; pending.forEach(fn => fn()); return tree; }
  let tree = render(); tree.props.onLayout({ nativeEvent: { layout: { width: 358, height: 190 } } }); tree = render();
  return { render, get props() { return props; }, get tree() { return tree; }, get handlers() { return handlers; }, get leaves() { return leaves; }, get joins() { return joins; }, get opens() { return opens; }, offset: () => slots[1].current.value };
}
function nodes(tree) { return !tree || typeof tree !== 'object' ? [] : [tree, ...tree.props.children.flatMap(nodes)]; }
test('参加済みを左へ半分超スワイプすると取り消し、短い場合は右に戻る', () => {
  const base = harness().props.event;
  const h = harness({ event: { ...base, joined: true } });
  assert.equal(h.handlers.onMoveShouldSetPanResponder(null, { dx: -20, dy: 0 }), true);
  h.handlers.onPanResponderGrant(); h.handlers.onPanResponderMove(null, { dx: -80 }); assert.equal(h.offset(), 138);
  h.handlers.onPanResponderRelease(null, { dx: -109, dy: 0 }); assert.equal(h.leaves, 0); assert.equal(h.offset(), 218);
  h.handlers.onPanResponderGrant(); h.handlers.onPanResponderRelease(null, { dx: -110, dy: 0 }); assert.equal(h.leaves, 1); assert.equal(h.opens, 0);
  h.render({ leaving: true }); assert.equal(h.offset(), 0);
  h.render({ leaving: false }); assert.equal(h.offset(), 218);
  h.render({ event: { ...base, joined: false } }); assert.equal(h.offset(), 0);
});
test('縦移動では確定せず、主催者・処理中は操作不可', () => {
  const h = harness();
  assert.equal(h.handlers.onStartShouldSetPanResponder(), true);
  assert.equal(h.handlers.onMoveShouldSetPanResponder(null, { dx: 12, dy: 40 }), false);
  h.handlers.onPanResponderGrant(); h.handlers.onPanResponderRelease(null, { dx: 120, dy: 240 }); assert.equal(h.joins, 0);
  h.render({ event: { ...h.props.event, joined: true, is_host: true } });
  assert.equal(h.handlers.onStartShouldSetPanResponder(), false);
  assert.equal(h.handlers.onMoveShouldSetPanResponder(null, { dx: -180, dy: 0 }), false);
  h.render({ event: { ...h.props.event, is_host: false }, leaving: true });
  assert.equal(h.handlers.onMoveShouldSetPanResponder(null, { dx: -180, dy: 0 }), false);
});
test('スワイプ案内は読み上げに残し、文字では表示しない', () => {
  const h = harness(); const all = nodes(h.tree);
  assert.ok(all.some(n => n.props.accessibilityLabel?.includes('右へスワイプで参加')));
  assert.ok(!all.some(n => n.type === 'Text' && n.props.children.some(c => typeof c === 'string' && c.includes('スワイプで参加'))));
});
test('指に追従して100pxを越え、幅から求めた右端で止まる', () => {
  const h = harness(); h.handlers.onPanResponderGrant(); h.handlers.onPanResponderMove(null, { dx: 180 }); assert.equal(h.offset(), 180);
  h.handlers.onPanResponderMove(null, { dx: 999 }); assert.equal(h.offset(), 218);
});
test('半分以下で戻り、半分を越えたら一度だけ参加', () => {
  const h = harness(); h.handlers.onPanResponderGrant(); h.handlers.onPanResponderRelease(null, { dx: 109, dy: 0 }); assert.equal(h.joins, 0); assert.equal(h.offset(), 0);
  h.handlers.onPanResponderGrant(); h.handlers.onPanResponderRelease(null, { dx: 110, dy: 0 }); assert.equal(h.joins, 1);
});
test('参加処理中と成功後は右端、失敗時は左へ戻る', () => {
  const h = harness(); h.render({ joining: true }); assert.equal(h.offset(), 218);
  h.render({ joining: false }); assert.equal(h.offset(), 0);
  h.render({ event: { ...h.props.event, joined: true } }); assert.equal(h.offset(), 218);
});
test('参加済みは初回から右端、主催者は左のまま', () => {
  const base = harness().props.event;
  const joined = harness({ event: { ...base, joined: true } }); assert.equal(joined.offset(), 218);
  const host = harness({ event: { ...base, joined: true, is_host: true } }); assert.equal(host.offset(), 0);
});
test('人数表示は下限に対応し、undefined・0・同値は上限だけ', () => {
  const h = harness();
  for (const [minimum, expected] of [[2, '1 / 2〜4人'], [undefined, '1 / 4人'], [0, '1 / 4人'], [4, '1 / 4人']]) {
    const tree = h.render({ event: { ...h.props.event, capacity_min: minimum } }); assert.ok(tree.props.accessibilityLabel.includes(expected));
  }
});
test('人数リングは12時開始の時計回りPath、時間減少は時計回り', () => {
  const h = harness(); const tree = h.render({ now: 1800000 });
  const paths = nodes(tree).filter(n => n.type === 'Path');
  assert.ok(paths.some(n => n.props.d === 'M 50 6 A 44 44 0 0 1 50 94 A 44 44 0 0 1 50 6'));
  const gauge = paths.find(n => n.props.strokeDashoffset !== undefined); assert.ok(gauge.props.strokeDashoffset < 0);
});
