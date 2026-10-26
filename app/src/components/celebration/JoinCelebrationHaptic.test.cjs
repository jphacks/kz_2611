const { test } = require('node:test');
const assert = require('node:assert/strict');
const { load, mount } = require('../../testing/render.cjs');

// 参加成立後の演出は振動を要求しない（要求は参加タップの同期処理だけが行う）
test('JoinCelebrationWebは表示されても振動を要求しない', () => {
  const calls = [];
  const navigator = { vibrate: p => { calls.push(p); return true; } };
  const feedback = load(__dirname + '/feedback.ts', { 'react-native': { Platform: { OS: 'web' } } }, { navigator });
  const Animated = {
    Value: class { constructor(v) { this.v = v; } interpolate() { return {}; } stopAnimation() {} setValue(v) { this.v = v; } },
    timing: () => ({ start() {} }),
    View: 'AnimatedView',
  };
  const { JoinCelebrationWeb } = load(__dirname + '/JoinCelebrationWeb.tsx', {
    'react-native': {
      AccessibilityInfo: { announceForAccessibility() {} },
      Animated,
      Easing: { linear: v => v },
      Pressable: 'Pressable',
      StyleSheet: { absoluteFill: {}, create: o => o },
      Text: 'Text',
      View: 'View',
    },
    '../../ui/theme': { C: {}, FONT: 'Inter' },
    './birds': { preloadBirdImages() {} },
    './canvasEngine': { startCelebrationCanvas: () => ({ stop() {} }) },
    './feedback': feedback,
    './reducedMotion': { useReducedMotion: () => false },
    './timing': {
      CELEBRATION: { burstMs: 100 },
      celebrationEffects: () => ({ flash: false, chromatic: false }),
      celebrationTotalMs: () => 3000,
      letterDelays: n => Array.from({ length: n }, () => 0),
    },
  });
  const h = mount(() => JoinCelebrationWeb({ visible: true, onDone() {}, sound: true, vibrate: true }));
  assert.deepEqual(calls, []);
  h.unmount();
});
