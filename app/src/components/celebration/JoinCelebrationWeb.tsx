// #98 参加が成立した瞬間の演出（Web）。粒は Canvas 1枚、揺れ・ズームは CSS transform。
// 見た目・量・音・振動は #93 と同じ。ヒットストップ（約150msの硬直）だけを無くした。
import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { AccessibilityInfo, Animated, Easing, Pressable, StyleSheet, Text, View, type LayoutChangeEvent } from 'react-native';
import { C, FONT } from '../../ui/theme';
import { preloadBirdImages } from './birds';
import { startCelebrationCanvas, type CelebrationCanvasHandle } from './canvasEngine';
import { playCelebrationSound, playHitSound, vibratePattern } from './feedback';
import { useReducedMotion } from './reducedMotion';
import { CELEBRATION, celebrationEffects, celebrationTotalMs, letterDelays } from './timing';

const WORD = 'とまった!!';
// 触れた瞬間の振動から、間を空けずに爆発の連打へ続ける
const HAPTIC = { immediate: [30, 20, 35, 20, 40, 25, 60], wave: 18 } as const;

export interface JoinCelebrationProps {
  visible: boolean;
  onDone: () => void;
  sound: boolean;
  vibrate: boolean;
}

export function JoinCelebrationWeb({ visible, onDone, sound, vibrate }: JoinCelebrationProps) {
  const reduced = useReducedMotion();
  const effects = celebrationEffects(reduced);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const burst = useRef(new Animated.Value(0)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const finished = useRef(false);
  const active = useRef(true);
  const engine = useRef<CelebrationCanvasHandle | null>(null);
  const host = useRef<ComponentRef<typeof View>>(null);
  const stage = useRef<ComponentRef<typeof View>>(null);
  // 演出中に親が再描画されても最初の設定のまま動かす
  const settings = useRef({ sound, vibrate });
  settings.current = { sound, vibrate };
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const stopEngine = useCallback(() => {
    engine.current?.stop();
    engine.current = null;
  }, []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    clearTimers();
    stopEngine();
    vibratePattern(0);
    burst.stopAnimation();
    doneRef.current();
  }, [clearTimers, stopEngine, burst]);

  useEffect(() => {
    active.current = true;
    // 掲示板を開いた時点で読み込んでいれば、参加の瞬間に読み込み待ちが無い
    preloadBirdImages();
    return () => {
      active.current = false;
      clearTimers();
      stopEngine();
      burst.stopAnimation();
    };
  }, [clearTimers, stopEngine, burst]);

  // 触れた瞬間から音・振動・文字を始める（ヒットストップ無し）
  useEffect(() => {
    clearTimers();
    stopEngine();
    burst.stopAnimation();
    burst.setValue(0);
    finished.current = false;
    if (!visible) return;

    const enabled = settings.current;
    vibratePattern([...HAPTIC.immediate], enabled.vibrate);
    playHitSound(enabled.sound);
    playCelebrationSound(enabled.sound);
    AccessibilityInfo.announceForAccessibility?.('参加が成立しました');

    // 約3秒で自動で消える（ヒットストップの分だけ前へ詰めた）
    timers.current.push(setTimeout(() => vibratePattern(HAPTIC.wave, enabled.vibrate), 420));
    timers.current.push(setTimeout(() => vibratePattern(HAPTIC.wave, enabled.vibrate), 840));
    timers.current.push(setTimeout(() => {
      if (active.current) finish();
    }, celebrationTotalMs()));

    Animated.timing(burst, {
      toValue: 1,
      duration: CELEBRATION.burstMs,
      easing: Easing.linear,
      useNativeDriver: false, // Web は JS ドライバ。transform と opacity だけを動かす
    }).start();

    return clearTimers;
  }, [visible, finish, clearTimers, stopEngine, burst]);

  // レイアウトが決まったら Canvas を1枚だけ差し込む。途中の再描画では作り直さない
  useEffect(() => {
    if (!visible || finished.current || size.width <= 0 || size.height <= 0 || engine.current) return;
    const hostNode = host.current as unknown as HTMLElement | null;
    const stageNode = stage.current as unknown as HTMLElement | null;
    if (!hostNode || !stageNode) return;
    engine.current = startCelebrationCanvas({
      host: hostNode,
      stage: stageNode,
      width: size.width,
      height: size.height,
      reduced,
      flash: effects.flash,
      chromatic: effects.chromatic,
    });
  }, [visible, size.width, size.height, reduced, effects.flash, effects.chromatic]);

  if (!visible) return null;

  const delays = letterDelays(WORD.length);

  return (
    <View
      style={styles.overlay}
      pointerEvents="box-none"
      onLayout={(event: LayoutChangeEvent) => {
        const layout = event.nativeEvent.layout;
        if (layout.width !== size.width || layout.height !== size.height) {
          setSize({ width: layout.width, height: layout.height });
        }
      }}
    >
      {/* 演出中だけ画面全体を覆い、タップで早く閉じる */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="参加が成立しました。タップで閉じる"
        onPress={finish}
        style={StyleSheet.absoluteFill}
      />

      <Animated.View
        pointerEvents="none"
        accessibilityElementsHidden
        importantForAccessibility="no-hide-descendants"
        style={[
          styles.overlay,
          { opacity: burst.interpolate({ inputRange: [0, 0.03, 0.78, 1], outputRange: [1, 1, 1, 0] }) },
        ]}
      >
        {/* ここに Canvas を差し込む。CSS transform はこの View に当てる */}
        <View ref={stage} style={[styles.overlay, styles.stage]}>
          <View ref={host} style={StyleSheet.absoluteFill} />

          {/* 巨大な「とまった!!」は少数の要素なので Animated のまま */}
          <Animated.View
            style={[styles.word, {
              opacity: burst.interpolate({ inputRange: [0, 0.055, 0.08, 0.7, 0.88, 1], outputRange: [0, 0, 1, 1, 0, 0] }),
              transform: [
                { scale: burst.interpolate({ inputRange: [0, 0.055, 0.12, 0.17, 0.23, 1], outputRange: [0.05, 0.05, 1.2, 0.93, 1, 1] }) },
                { rotate: burst.interpolate({ inputRange: [0, 0.12, 0.2, 1], outputRange: ['-14deg', '-8deg', '-5deg', '-5deg'] }) },
              ],
            }]}
          >
            <View style={styles.wordRow}>
              {Array.from(WORD).map((letter, i) => {
                const start = delays[i];
                return (
                  <Animated.View
                    key={`${letter}-${i}`}
                    style={{
                      transform: [
                        { scale: burst.interpolate({ inputRange: [0, start, start + 0.06, start + 0.12, 1], outputRange: [0, 0, 1.5, 1, 1] }) },
                        { translateY: burst.interpolate({ inputRange: [0, start, start + 0.06, start + 0.12, 1], outputRange: [90, 90, -20, 0, 0] }) },
                      ],
                    }}
                  >
                    {effects.chromatic && <Text style={[styles.letter, styles.chromaBlue]}>{letter}</Text>}
                    {effects.chromatic && <Text style={[styles.letter, styles.chromaPink]}>{letter}</Text>}
                    <Text style={styles.letter}>{letter}</Text>
                  </Animated.View>
                );
              })}
            </View>
          </Animated.View>
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 100 },
  stage: { overflow: 'hidden' },
  word: { position: 'absolute', top: '37%', left: 0, right: 0, alignItems: 'center' },
  wordRow: { flexDirection: 'row', paddingHorizontal: 8 },
  letter: {
    fontFamily: FONT,
    fontSize: 65,
    lineHeight: 78,
    fontWeight: '900',
    letterSpacing: -5,
    color: C.white,
    textShadowColor: C.ink,
    textShadowOffset: { width: 5, height: 6 },
    textShadowRadius: 0,
  },
  chromaBlue: { position: 'absolute', left: -5, top: 0, color: C.blue },
  chromaPink: { position: 'absolute', left: 5, top: 0, color: C.pink },
});
