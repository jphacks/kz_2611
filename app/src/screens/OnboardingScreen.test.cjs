const { test } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { load, mount, findAll, press, styles } = require('../testing/render.cjs');
function setup(os = 'web') {
  const Demo = () => null;
  const { OnboardingScreen } = load(path.join(__dirname, 'OnboardingScreen.tsx'), {
    'react-native': { View: 'View', Text: 'Text', Pressable: 'Pressable', ScrollView: 'ScrollView', StyleSheet: { create: s => s }, Platform: { OS: os } },
    '../ui/theme': { C: styles, S: styles, T: styles },
    '../components/celebration/JoinCelebration': { JoinCelebration: () => null },
    '../components/celebration/feedback': { prepareCelebrationSound: () => {} },
    '../components/celebration/settings': { useCelebrateSettings: () => ({ sound: false, vibrate: false }) },
    '../components/onboarding/Demos': { BoardDemo: Demo, ChatDemo: Demo, IntroDemo: Demo, InviteDemo: Demo, SlideDemo: Demo, useReducedMotion: () => true },
    '../components/onboarding/state': { celebrationSoundEnabled: () => false },
  });
  const h = mount(() => OnboardingScreen({ onDone: async () => {} }));
  h.tree.props.onLayout({ nativeEvent: { layout: { width: 320 } } });
  return h;
}
const pages = tree => findAll(tree, n => n.type === 'ScrollView' && 'accessibilityElementsHidden' in n.props);

test('Webの非表示ページはフォーカス・操作・読み上げから外し、次へで切り替える', () => {
  const h = setup();
  assert.equal(pages(h.tree).length, 5);
  assert.equal(!!pages(h.tree)[0].props.inert, false);
  assert.equal(pages(h.tree)[1].props.inert, true);
  press(h.tree, '次へ →');
  assert.equal(pages(h.tree)[0].props.inert, true);
  assert.equal(!!pages(h.tree)[1].props.inert, false);
});

test('Nativeでは既存の読み上げ用属性を保ち、Web専用のinertを渡さない', () => {
  const h = setup('ios');
  assert.equal(pages(h.tree)[1].props.accessibilityElementsHidden, true);
  assert.equal(pages(h.tree)[1].props.inert, undefined);
});
