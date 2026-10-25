// 実コンポーネントを変換し、描画・指の操作・親 props の更新を検証する。
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const source = fs.readFileSync(path.join(__dirname, '../EventCard.tsx'), 'utf8');

const gestureSource = fs.readFileSync(path.join(__dirname, 'fingerGesture.ts'), 'utf8');
const gestureOutput = ts.transpileModule(gestureSource, { compilerOptions: { module: ts.ModuleKind.CommonJS } }).outputText;
const gesture = {};
vm.runInNewContext(gestureOutput, { exports: gesture });

function harness(overrides = {}) {
  const slots = []; let cursor = 0; let effects = []; let handlers; let joins = 0; let opens = 0; let leaves = 0; let deletes = 0; let memberPresses = 0;
  const element = (type, props, ...children) => ({ type, props: { ...props, children: children.length ? children.flat() : props?.children || [] } });
  const react = {
    createElement: (type, props, ...children) => typeof type === 'function' ? type({ ...props, ...(children.length ? { children: children.flat() } : {}) }) : element(type, props, ...children),
    memo: fn => fn,
    useRef(v) { const i = cursor++; return slots[i] ||= { current: v }; },
    useState(v) { const i = cursor++; if (!(i in slots)) slots[i] = v; return [slots[i], n => { slots[i] = n; }]; },
    useEffect(fn) { effects.push(fn); },
  };
  const rn = {
    Platform: { OS: 'web' }, View: 'View', Text: 'Text', Pressable: 'Pressable', Image: 'Image',
    StyleSheet: { create: x => x, absoluteFill: {} },
    PanResponder: { create(h) { handlers = h; return { panHandlers: h }; } },
  };
  const output = ts.transpileModule(source, { compilerOptions: { jsx: ts.JsxEmit.React, jsxFactory: 'React.createElement', module: ts.ModuleKind.CommonJS } }).outputText;
  const exports = {};
  const ClockDate = class extends Date { static now() { return props.now; } };
  vm.runInNewContext(output, {
    exports, Date: ClockDate, React: react, requestAnimationFrame: fn => { effects.push(fn); }, setTimeout: fn => fn(),
    require: id => id.endsWith('.png') ? 'bird'
      : id.includes('useClock') ? { useClock: () => props.now }
      : id === 'react' ? react
      : id === 'react-native' ? rn
      : id === 'react-native-svg' ? { default: 'Svg', Circle: 'Circle', G: 'G', Path: 'Path', Rect: 'Rect', Text: 'SvgText' }
      : id.includes('Avatar') ? { Avatar: 'Avatar' }
      : id.includes('fingerGesture') ? gesture
      : { C: { red: '#FF5A36', blue: '#3D5AFE', pink: '#FF3D9A', green: '#00B37E', yellow: '#FFD43B', white: '#FFFFFF', ink: '#111111' }, FONT: 'Inter', PILL: 999 },
  });
  let props = {
    event: {
      id: 1, title: 'カラオケ', place: '片町', time_text: '19:00〜', host: { id: 9, name: '主催', avatar: null }, members: [],
      count: 1, capacity: 4, capacity_min: 0, duration_min: 60, expires_at: 3600000, joined: false, is_host: false,
    },
    now: 0, onJoin: () => { joins++; }, onLeave: () => { leaves++; }, onDelete: () => { deletes++; },
    onOpen: () => { opens++; }, onPressMembers() { memberPresses++; }, ...overrides,
  };
  function render(change = {}) {
    props = { ...props, ...change };
    cursor = 0; effects = [];
    const tree = exports.EventCard(props);
    const pending = effects; effects = [];
    pending.forEach(fn => fn());
    return tree;
  }
  let tree = render();
  tree.props.onLayout({ nativeEvent: { layout: { width: 358, height: 315 } } });
  tree = render();
  return {
    render, get props() { return props; }, get tree() { return tree; }, get handlers() { return handlers; },
    get leaves() { return leaves; }, get deletes() { return deletes; }, get joins() { return joins; }, get opens() { return opens; }, get memberPresses() { return memberPresses; },
  };
}

function nodes(tree) {
  if (Array.isArray(tree)) return tree.flatMap(nodes);
  if (!tree || typeof tree !== 'object') return [];
  return [tree, ...nodes(tree.props?.children)];
}
function labeled(tree, text, exact = true) {
  const node = nodes(tree).find(n => exact ? n.props.accessibilityLabel === text : n.props.accessibilityLabel?.includes(text));
  assert.ok(node, `${text} が見つかる`);
  return node;
}
function press(node) { node.props.onPress({ stopPropagation() {} }); }
function progressWidth(tree) {
  const rect = nodes(tree).find(n => n.type === 'Rect' && n.props.height === 5 && n.props.fill === '#E5FF56');
  assert.ok(rect, '進み具合の帯が見つかる');
  return rect.props.width;
}
function flush(h, change = {}) { h.render(change); return h.render(); }

test('参加済みを左へ半分超スワイプすると取り消し、短い場合は触れた位置へ戻る', () => {
  const base = harness().props.event;
  const h = harness({ event: { ...base, joined: true } });
  assert.equal(progressWidth(h.tree), 588);
  assert.equal(h.handlers.onMoveShouldSetPanResponder(null, { dx: -20, dy: 0 }), true);
  h.handlers.onPanResponderGrant(); h.handlers.onPanResponderMove(null, { dx: -40 });
  const moving = progressWidth(h.render());
  assert.ok(moving < 588 && moving > 5);
  h.handlers.onPanResponderRelease(null, { dx: -44, dy: 0 }); assert.equal(h.leaves, 0); assert.equal(progressWidth(h.render()), 588);
  h.handlers.onPanResponderGrant(); h.handlers.onPanResponderRelease(null, { dx: -45, dy: 0 }); assert.equal(h.leaves, 1); assert.equal(h.opens, 0);
  const left = flush(h, { leaving: true }); assert.equal(progressWidth(left), 5);
  const back = flush(h, { leaving: false }); assert.equal(progressWidth(back), 588);
  const unjoined = flush(h, { event: { ...base, joined: false } }); assert.equal(progressWidth(unjoined), 5);
});

test('縦移動では確定せず、参加・参加取り消しの処理中は操作不可', () => {
  const h = harness();
  assert.equal(h.handlers.onStartShouldSetPanResponder(), true);
  assert.equal(h.handlers.onMoveShouldSetPanResponder(null, { dx: 12, dy: 40 }), false);
  h.handlers.onPanResponderGrant(); h.handlers.onPanResponderRelease(null, { dx: 120, dy: 240 }); assert.equal(h.joins, 0);
  flush(h, { joining: true });
  assert.equal(h.handlers.onStartShouldSetPanResponder(), false);
  assert.equal(h.handlers.onMoveShouldSetPanResponder(null, { dx: 180, dy: 0 }), false);
  flush(h, { joining: false, event: { ...h.props.event, joined: true }, leaving: true });
  assert.equal(h.handlers.onStartShouldSetPanResponder(), false);
  assert.equal(h.handlers.onMoveShouldSetPanResponder(null, { dx: -180, dy: 0 }), false);
});

test('スワイプ案内は読み上げに残し、案内文はカード内の線画文字だけにする', () => {
  const h = harness(); const all = nodes(h.tree);
  assert.ok(all.some(n => n.props.accessibilityLabel?.includes('右へスワイプで参加')));
  assert.ok(!all.some(n => n.type === 'Text' && n.props.children.some(c => typeof c === 'string' && c.includes('スワイプで参加'))));
  assert.ok(all.some(n => n.type === 'SvgText' && n.props.children.join('') === '指を右へスライド →'));
});

test('指に追従してカード幅の1/4まで動き、右端で止まる', () => {
  const h = harness(); h.handlers.onPanResponderGrant(); h.handlers.onPanResponderMove(null, { dx: 40 });
  assert.ok(Math.abs(progressWidth(h.render()) - 588 * (40 / 89.5)) < 1);
  h.handlers.onPanResponderMove(null, { dx: 999 }); assert.equal(progressWidth(h.render()), 588);
});

test('半分以下で戻り、半分を越えたら一度だけ参加', () => {
  const h = harness();
  h.handlers.onPanResponderGrant(); h.handlers.onPanResponderRelease(null, { dx: 44, dy: 0 }); assert.equal(h.joins, 0); assert.equal(progressWidth(h.render()), 5);
  h.handlers.onPanResponderGrant(); h.handlers.onPanResponderRelease(null, { dx: 45, dy: 0 }); assert.equal(h.joins, 1); assert.equal(progressWidth(h.render()), 588);
});

test('参加処理中と成功後は触れた状態、失敗時は離れた位置へ戻る', () => {
  const h = harness();
  const joining = flush(h, { joining: true }); assert.equal(progressWidth(joining), 588);
  const failed = flush(h, { joining: false }); assert.equal(progressWidth(failed), 5);
  const joined = flush(h, { event: { ...h.props.event, joined: true } }); assert.equal(progressWidth(joined), 588);
});

test('参加済み・主催・参加処理中は初回から指先が触れた状態', () => {
  const base = harness().props.event;
  assert.equal(progressWidth(harness({ event: { ...base, joined: true } }).tree), 588);
  assert.equal(progressWidth(harness({ event: { ...base, is_host: true } }).tree), 588);
  assert.equal(progressWidth(harness({ joining: true }).tree), 588);
});

test('主催のカードは指が動かず、左スワイプ半分以下なら確認せず元の位置', () => {
  const base = harness().props.event;
  const h = harness({ event: { ...base, is_host: true } });
  assert.equal(h.handlers.onMoveShouldSetPanResponder(null, { dx: -20, dy: 0 }), true);
  assert.equal(h.handlers.onMoveShouldSetPanResponder(null, { dx: 180, dy: 0 }), false);
  h.handlers.onPanResponderGrant(); h.handlers.onPanResponderMove(null, { dx: -80 }); assert.equal(progressWidth(h.render()), 588);
  h.handlers.onPanResponderRelease(null, { dx: -44, dy: 0 }); assert.equal(progressWidth(h.render()), 588);
  assert.equal(h.deletes, 0); assert.equal(h.opens, 0);
  assert.equal(nodes(h.render()).some(n => n.props.accessibilityRole === 'alert'), false);
});

test('主催の左スワイプは確認を表示し、やめると触れた位置へ戻る', () => {
  const base = harness().props.event;
  const h = harness({ event: { ...base, is_host: true } });
  h.handlers.onPanResponderGrant(); h.handlers.onPanResponderRelease(null, { dx: -45, dy: 0 });
  assert.equal(h.deletes, 0); assert.equal(h.opens, 0);
  const tree = flush(h);
  assert.ok(nodes(tree).some(n => n.type === 'Text' && n.props.children.includes('掲示を取り消しますか？')));
  assert.equal(progressWidth(tree), 5);
  assert.equal(nodes(tree).some(n => n.props.accessibilityLabel?.includes('左へスワイプで掲示を取り消す')), false);
  press(labeled(tree, '掲示の取り消しをやめる'));
  const back = flush(h);
  assert.equal(nodes(back).some(n => n.props.accessibilityRole === 'alert'), false);
  assert.equal(progressWidth(back), 588); assert.equal(h.deletes, 0);
});

test('掲示削除は確認後だけ呼び、処理中は離れ、失敗時は触れた位置へ戻る', () => {
  const base = harness().props.event;
  const h = harness({ event: { ...base, is_host: true } });
  h.handlers.onPanResponderGrant(); h.handlers.onPanResponderRelease(null, { dx: -180, dy: 0 });
  const confirm = flush(h);
  press(labeled(confirm, '掲示を取り消す')); assert.equal(h.deletes, 1);
  const deleting = flush(h, { deleting: true });
  assert.equal(progressWidth(deleting), 5);
  assert.equal(nodes(deleting).some(n => n.props.accessibilityRole === 'alert'), false);
  assert.ok(nodes(deleting).some(n => n.type === 'Text' && n.props.children.includes('取り消し中…')));
  const restored = flush(h, { deleting: false }); assert.equal(progressWidth(restored), 588);
});

test('カード内の指の帯をタップするとチャットを開く', () => {
  const h = harness();
  h.handlers.onPanResponderGrant(); h.handlers.onPanResponderRelease(null, { dx: 0, dy: 0 });
  assert.equal(h.opens, 1); assert.equal(h.joins, 0);
});

test('カード全体のタップはチャット、参加者アイコンは参加者一覧を開く', () => {
  const h = harness();
  press(h.tree); assert.equal(h.opens, 1);
  press(labeled(h.tree, '1人の参加者を見る')); assert.equal(h.memberPresses, 1);
  assert.equal(h.opens, 1);
});

test('人数表示は下限に対応し、undefined・0・同値は上限だけ', () => {
  const h = harness();
  for (const [minimum, expected] of [[2, '1 / 2〜4人'], [undefined, '1 / 4人'], [0, '1 / 4人'], [4, '1 / 4人']]) {
    const tree = h.render({ event: { ...h.props.event, capacity_min: minimum } });
    assert.ok(tree.props.accessibilityLabel.includes(expected));
  }
});

test('人数リングは12時開始の時計回りPath、残り時間ゲージは時計回りに減る', () => {
  const h = harness(); const tree = h.render({ now: 1800000 });
  const paths = nodes(tree).filter(n => n.type === 'Path');
  assert.ok(paths.some(n => n.props.d === 'M 50 6 A 44 44 0 0 1 50 94 A 44 44 0 0 1 50 6'));
  const gauge = paths.find(n => n.props.strokeDashoffset !== undefined); assert.ok(gauge.props.strokeDashoffset < 0);
  // カードは黒地なのでゲージも黒。締切10分以下だけ黄（X6 の見た目を崩さない）
  assert.equal(gauge.props.stroke, '#111111');
  assert.equal(gauge.props.strokeWidth, 6);
  const soon = nodes(h.render({ now: 3540000 })).find(n => n.type === 'Path' && n.props.strokeDashoffset !== undefined);
  assert.equal(soon.props.stroke, '#FFD43B');
});

test('見た目は X6 の色と位置のまま（LIVEの灰色・ライム・スライダーの帯・文言）', () => {
  const h = harness();
  const badge = () => nodes(h.tree).find(n => n.type === 'SvgText' && n.props.children.join('').includes('LIVE'));
  assert.equal(badge().props.fill, '#B2B2B2');
  assert.ok(nodes(h.tree).some(n => n.type === 'Rect' && n.props.height === 5 && n.props.fill === '#FFFFFF33'), 'スライダーの帯は #FFFFFF33');
  h.handlers.onPanResponderGrant(); h.handlers.onPanResponderMove(null, { dx: 30 });
  const message = nodes(h.render()).find(n => n.type === 'SvgText' && n.props.children.join('') === '近づいてる…');
  // X6 は x242 y210。390px では人数の行に重なるので、X6 の見え方を保ったまま y240 へ
  assert.deepEqual([message.props.x, message.props.y, message.props.fontSize, message.props.fill], [242, 240, 22, '#E5FF56']);
  const joined = flush(h, { event: { ...h.props.event, joined: true } });
  assert.equal(nodes(joined).find(n => n.type === 'SvgText' && n.props.children.join('').includes('JOINED')).props.fill, '#E5FF56');
});
