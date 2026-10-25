// #93 参加が成立した瞬間に全画面で流す演出。
// プレビュー X6 の「繋がった瞬間」だけを移植し、見出し・説明・スライダー・カード・
// 「もう一度」ボタン・「主役は、あなた。」の文字・「TONIGHT'S MAIN CHARACTER」の帯は持たない。
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo, Animated, Easing, Image, Pressable, StyleSheet, Text, View,
  type LayoutChangeEvent,
} from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { C, FONT } from '../../ui/theme';
import { playCelebrationSound, playHitSound, vibratePattern } from './feedback';
import { useReducedMotion } from './reducedMotion';
import {
  CELEBRATION, birdOrigin, celebrationEffects, celebrationTotalMs, letterDelays, shakeInput, shakeOutput,
} from './timing';

const BIRDS = [
  require('./bird_black.png'),
  require('./bird_orange.png'),
  require('./bird_blue.png'),
  require('./bird_pink.png'),
  require('./bird_white.png'),
];
// テーマの色だけで作る（新しい色は増やさない）
const COLORS = [C.red, C.pink, C.yellow, C.white, C.blue];
const WORD = 'とまった!!';
const SPARK_LEFT = [18, 80, 50, 12, 88, 50];
const SPARK_TOP = [32, 30, 48, 65, 62, 20];
const HAPTIC = { impact: 30, explosion: [35, 20, 40, 25, 60], wave: 18 } as const;

export interface JoinCelebrationProps {
  visible: boolean;
  onDone: () => void;
  sound: boolean;
  vibrate: boolean;
}

type Stage = 'hit' | 'burst';

export function JoinCelebration({ visible, onDone, sound, vibrate }: JoinCelebrationProps) {
  const reduced = useReducedMotion();
  const effects = celebrationEffects(reduced);
  const [stage, setStage] = useState<Stage>('hit');
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [run, setRun] = useState(0);
  const burst = useRef(new Animated.Value(0)).current;
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const finished = useRef(false);
  const active = useRef(true);
  // 演出中に親が再描画されても最初の設定のまま動かす
  const settings = useRef({ sound, vibrate });
  settings.current = { sound, vibrate };
  // onDone が毎回新しい関数でも演出をやり直さない
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);

  const finish = useCallback(() => {
    if (finished.current) return;
    finished.current = true;
    clearTimers();
    vibratePattern(0);
    burst.stopAnimation();
    doneRef.current();
  }, [clearTimers, burst]);

  useEffect(() => {
    active.current = true;
    return () => {
      active.current = false;
      clearTimers();
      burst.stopAnimation();
    };
  }, [clearTimers, burst]);

  useEffect(() => {
    clearTimers();
    burst.stopAnimation();
    burst.setValue(0);
    setStage('hit');
    finished.current = false;
    if (!visible) return;

    const enabled = settings.current;
    vibratePattern(HAPTIC.impact, enabled.vibrate);
    playHitSound(enabled.sound);
    AccessibilityInfo.announceForAccessibility?.('参加が成立しました');

    // ヒットストップのあとに大群と文字を出す
    timers.current.push(setTimeout(() => {
      if (!active.current) return;
      setStage('burst');
      setRun(value => value + 1);
      playCelebrationSound(enabled.sound);
      vibratePattern([...HAPTIC.explosion], enabled.vibrate);
      timers.current.push(setTimeout(() => vibratePattern(HAPTIC.wave, enabled.vibrate), 420));
      timers.current.push(setTimeout(() => vibratePattern(HAPTIC.wave, enabled.vibrate), 840));
      Animated.timing(burst, {
        toValue: 1,
        duration: CELEBRATION.burstMs,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start();
    }, CELEBRATION.hitStopMs));

    // 約3秒で自動で消える
    timers.current.push(setTimeout(() => {
      if (active.current) finish();
    }, celebrationTotalMs()));

    return clearTimers;
  }, [visible, finish, clearTimers, burst]);

  if (!visible) return null;

  const origin = birdOrigin(size.width, size.height);
  const delays = letterDelays(WORD.length);
  const shake = burst.interpolate({ inputRange: shakeInput(), outputRange: shakeOutput(reduced) });
  const rotate = burst.interpolate({
    inputRange: [0, 0.045, 0.06, 0.075, 0.09, 0.12, 0.16, 1],
    outputRange: effects.shake
      ? ['0deg', '-2deg', '2deg', '-1.5deg', '1deg', '-0.5deg', '0deg', '0deg']
      : ['0deg', '0deg', '0deg', '0deg', '0deg', '0deg', '0deg', '0deg'],
  });

  return (
    <View
      style={styles.overlay}
      pointerEvents="box-none"
      onLayout={(event: LayoutChangeEvent) => {
        const layout = event.nativeEvent.layout;
        setSize({ width: layout.width, height: layout.height });
      }}
    >
      {/* 演出中だけ画面全体を覆い、タップで早く閉じる */}
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="参加が成立しました。タップで閉じる"
        onPress={finish}
        style={StyleSheet.absoluteFill}
      />

      {/* ヒットストップ: 一瞬だけ白く飛ぶ */}
      {stage === 'hit' && effects.flash && <View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.flash]} />}

      {stage === 'burst' && (
        <Animated.View
          pointerEvents="none"
          accessibilityElementsHidden
          importantForAccessibility="no-hide-descendants"
          style={[styles.overlay, { opacity: burst.interpolate({ inputRange: [0, 0.03, 0.78, 1], outputRange: [1, 1, 1, 0] }) }]}
        >
          <Animated.View
            style={[
              styles.overlay,
              styles.stage,
              {
                transform: [
                  { scale: burst.interpolate({ inputRange: [0, 0.04, 0.16, 1], outputRange: [1, CELEBRATION.zoom, 1, 1] }) },
                  { translateX: shake },
                  { rotate },
                ],
              },
            ]}
          >
            <View style={[StyleSheet.absoluteFill, styles.pinkWash]} />

            {/* フラッシュ */}
            {effects.flash && (
              <Animated.View
                style={[StyleSheet.absoluteFill, styles.flash, {
                  opacity: burst.interpolate({ inputRange: [0, 0.025, 0.04, 0.055, 0.075, 1], outputRange: [0.95, 0.95, 0, 0.7, 0, 0] }),
                }]}
              />
            )}

            {/* 色収差（赤青の縁） */}
            {effects.chromatic && [C.blue, C.pink].map((color, i) => (
              <Animated.View
                key={color}
                style={[StyleSheet.absoluteFill, {
                  borderWidth: 16,
                  borderColor: color,
                  opacity: burst.interpolate({ inputRange: [0, 0.1, 0.25, 1], outputRange: [0.7, 0.4, 0, 0] }),
                  transform: [{ translateX: i ? 10 : -10 }],
                }]}
              />
            ))}

            {/* 放射線 */}
            <Animated.View style={[StyleSheet.absoluteFill, {
              opacity: burst.interpolate({ inputRange: [0, 0.04, 0.62, 1], outputRange: [0, 0.95, 0.65, 0] }),
            }]}>
              <Svg width="100%" height="100%" viewBox="0 0 390 844" preserveAspectRatio="xMidYMid slice">
                <Path d="M30 0 L360 844 L80 844Z" fill={C.yellow} fillOpacity={0.27} />
                <Path d="M370 0 L30 844 L290 844Z" fill={C.white} fillOpacity={0.33} />
                {Array.from({ length: 24 }, (_, i) => (
                  <Path key={i} d="M195 422 L180 -450 L210 -450Z" fill={i % 2 ? C.pink : C.yellow} fillOpacity={0.4} transform={`rotate(${i * 15} 195 422)`} />
                ))}
              </Svg>
            </Animated.View>

            {/* 波紋 */}
            {[0, 1, 2, 3, 4].map(i => (
              <Animated.View
                key={`ring-${i}`}
                style={[styles.ring, {
                  borderWidth: 6 - i,
                  borderColor: COLORS[i],
                  opacity: burst.interpolate({ inputRange: [0, 0.04 + i * 0.03, 0.35 + i * 0.06, 1], outputRange: [0, 1, 0, 0] }),
                  transform: [{ scale: burst.interpolate({ inputRange: [0, 0.03 + i * 0.03, 0.4 + i * 0.06, 1], outputRange: [0.1, 0.1, 12, 12] }) }],
                }]}
              />
            ))}

            {/* 飛び立つ位置の光 */}
            <Animated.View
              style={[styles.originRing, {
                left: origin.x - 35,
                top: origin.y - 35,
                opacity: burst.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 0.4, 0] }),
                transform: [{ scale: burst.interpolate({ inputRange: [0, 1], outputRange: [0.1, 6] }) }],
              }]}
            />

            {/* 紙吹雪 */}
            {Array.from({ length: CELEBRATION.sparks }, (_, i) => {
              const group = i % 6;
              const delay = 0.05 + group * 0.075;
              return (
                <Animated.View
                  key={`spark-${i}`}
                  style={[styles.spark, {
                    left: `${SPARK_LEFT[group]}%`,
                    top: `${SPARK_TOP[group]}%`,
                    width: i % 3 ? 6 : 12,
                    height: i % 3 ? 17 : 12,
                    borderRadius: i % 4 === 0 ? 20 : 0,
                    backgroundColor: COLORS[i % 5],
                    opacity: burst.interpolate({ inputRange: [0, delay, delay + 0.025, 0.85, 1], outputRange: [0, 0, 1, 1, 0] }),
                    transform: [
                      { translateX: burst.interpolate({ inputRange: [0, delay, 1], outputRange: [0, 0, Math.cos(i * 2.4) * (150 + (i % 7) * 35)] }) },
                      { translateY: burst.interpolate({ inputRange: [0, delay, delay + 0.2, 1], outputRange: [0, 0, -100 - (i % 6) * 26, 450] }) },
                      { rotate: burst.interpolate({ inputRange: [0, 1], outputRange: ['0deg', `${i * 93}deg`] }) },
                    ],
                  }]}
                />
              );
            })}

            {/* 鳥の大群 */}
            {Array.from({ length: CELEBRATION.birds }, (_, i) => {
              const wave = i % 3;
              const delay = wave * 0.15;
              const end = delay + 0.58;
              const angle = i * 2.39996;
              const distance = i < 6 ? 90 + i * 18 : 700 + (i % 9) * 65 + (14 - (i % 15)) * 22;
              const birdSize = i < 6 ? 26 : 14 + (i % 15) * 9;
              return (
                <Animated.View
                  key={`bird-${run}-${i}`}
                  style={[styles.bird, {
                    left: origin.x - birdSize / 2,
                    top: origin.y - birdSize / 2,
                    width: birdSize,
                    height: birdSize,
                    opacity: burst.interpolate({ inputRange: [0, delay, delay + 0.012, end - 0.1, end, 1], outputRange: [0, 0, 1, 1, 0, 0] }),
                    transform: [
                      { translateX: burst.interpolate({ inputRange: [0, delay, delay + 0.1, end, 1], outputRange: [0, 0, Math.cos(angle) * distance * 0.035, Math.cos(angle) * distance, Math.cos(angle) * distance] }) },
                      { translateY: burst.interpolate({
                        inputRange: [0, delay, delay + 0.12, delay + 0.24, delay + 0.36, end, 1],
                        outputRange: [0, 0, Math.sin(angle) * distance * 0.2 + (i % 4 === 0 ? -55 : 0), Math.sin(angle) * distance * 0.42 + (i % 4 === 0 ? 55 : 0), Math.sin(angle) * distance * 0.65, Math.sin(angle) * distance, Math.sin(angle) * distance],
                      }) },
                      { scaleY: burst.interpolate({ inputRange: [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 1], outputRange: [1, 0.4, 1, 0.5, 1, 0.4, 1, 0.5, 1, 1] }) },
                      { rotate: burst.interpolate({ inputRange: [0, delay, end, 1], outputRange: [`${i * 31}deg`, `${i * 31}deg`, `${i < 6 ? 0 : i * 31 + (i % 2 ? 440 : -440)}deg`, `${i < 6 ? 0 : i * 31 + (i % 2 ? 440 : -440)}deg`] }) },
                      { scale: burst.interpolate({ inputRange: [0, delay, delay + 0.06, end, 1], outputRange: [0.1, 0.1, 1, 1.3, 1.3] }) },
                    ],
                  }]}
                >
                  <Image source={BIRDS[i % 5]} style={{ width: birdSize, height: birdSize }} resizeMode="contain" />
                </Animated.View>
              );
            })}

            {/* 巨大な「とまった!!」 */}
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
          </Animated.View>
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 100 },
  stage: { overflow: 'hidden' },
  flash: { backgroundColor: C.white },
  pinkWash: { backgroundColor: C.pink, opacity: 0.33 },
  ring: { position: 'absolute', left: '50%', top: '50%', width: 100, height: 100, marginLeft: -50, marginTop: -50, borderRadius: 100 },
  originRing: { position: 'absolute', width: 70, height: 70, borderRadius: 50, borderWidth: 3, borderColor: C.yellow },
  spark: { position: 'absolute' },
  bird: { position: 'absolute' },
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
