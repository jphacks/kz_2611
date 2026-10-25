import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, StyleSheet, View } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { C } from '../../ui/theme';

export type GaugeVariant = 1 | 2 | 3 | 4 | 5 | 6;

// カードの外枠を一周する、ごく普通の残り時間ゲージ。
// 太さ・位置はアプリ本体の EventCard と同じ（外枠から内側に 6〜7px）。
const VIEW_W = 660, VIEW_H = 580;
const STROKE = 7, RADIUS = 25, INSET = STROKE / 2;
const X = INSET, Y = INSET, WI = VIEW_W - STROKE, HI = VIEW_H - STROKE;
const TOP = WI / 2 - RADIUS;
const ARC = (Math.PI * RADIUS) / 2;
const SIDE = HI - RADIUS * 2;
const BOTTOM = WI - RADIUS * 2;
const PERIMETER = 2 * (WI + HI) - 8 * RADIUS + 2 * Math.PI * RADIUS;
const PATH = `M ${X + WI / 2} ${Y} H ${X + WI - RADIUS} A ${RADIUS} ${RADIUS} 0 0 1 ${X + WI} ${Y + RADIUS} V ${Y + HI - RADIUS} A ${RADIUS} ${RADIUS} 0 0 1 ${X + WI - RADIUS} ${Y + HI} H ${X + RADIUS} A ${RADIUS} ${RADIUS} 0 0 1 ${X} ${Y + HI - RADIUS} V ${Y + RADIUS} A ${RADIUS} ${RADIUS} 0 0 1 ${X + RADIUS} ${Y} Z`;
const TOTAL_SECONDS = 24 * 60;
const AnimatedPath = Animated.createAnimatedComponent(Path);
const AnimatedCircle = Animated.createAnimatedComponent(Circle);

/** 上辺の中央から時計回りに `distance` 進んだ点と、内側（カード中央）を向く法線。 */
function pointAt(distance: number) {
  let d = Math.max(0, Math.min(PERIMETER, distance));
  if (d <= TOP) return { x: X + WI / 2 + d, y: Y, nx: 0, ny: 1 };
  d -= TOP;
  if (d <= ARC) { const a = -Math.PI / 2 + d / RADIUS; return { x: X + WI - RADIUS + RADIUS * Math.cos(a), y: Y + RADIUS + RADIUS * Math.sin(a), nx: -Math.cos(a), ny: -Math.sin(a) }; }
  d -= ARC;
  if (d <= SIDE) return { x: X + WI, y: Y + RADIUS + d, nx: -1, ny: 0 };
  d -= SIDE;
  if (d <= ARC) { const a = d / RADIUS; return { x: X + WI - RADIUS + RADIUS * Math.cos(a), y: Y + HI - RADIUS + RADIUS * Math.sin(a), nx: -Math.cos(a), ny: -Math.sin(a) }; }
  d -= ARC;
  if (d <= BOTTOM) return { x: X + WI - RADIUS - d, y: Y + HI, nx: 0, ny: -1 };
  d -= BOTTOM;
  if (d <= ARC) { const a = Math.PI / 2 + d / RADIUS; return { x: X + RADIUS + RADIUS * Math.cos(a), y: Y + HI - RADIUS + RADIUS * Math.sin(a), nx: -Math.cos(a), ny: -Math.sin(a) }; }
  d -= ARC;
  if (d <= SIDE) return { x: X, y: Y + HI - RADIUS - d, nx: 1, ny: 0 };
  d -= SIDE;
  if (d <= ARC) { const a = Math.PI + d / RADIUS; return { x: X + RADIUS + RADIUS * Math.cos(a), y: Y + RADIUS + RADIUS * Math.sin(a), nx: -Math.cos(a), ny: -Math.sin(a) }; }
  d -= ARC;
  return { x: X + RADIUS + Math.min(d, TOP), y: Y, nx: 0, ny: 1 };
}

type Props = { variant: GaugeVariant; seconds: number; reduced: boolean };

export function Gauge({ variant, seconds, reduced }: Props) {
  const shownSeconds = reduced ? Math.ceil(seconds / 60) * 60 : seconds;
  const fraction = Math.max(0, Math.min(1, shownSeconds / TOTAL_SECONDS));
  const tipDistance = PERIMETER * fraction;
  const tip = pointAt(tipDistance);
  // 先端の光は、カードの外枠で半分欠けないよう少しだけ内側に置く。
  const dot = { x: tip.x + tip.nx * 7, y: tip.y + tip.ny * 7 };
  const soon = seconds <= 600;
  const urgent = seconds <= 180;
  const color = soon ? C.yellow : C.white;
  const tipRef = useRef(tipDistance);
  tipRef.current = tipDistance;

  // G4-1: 先端の光。2秒周期でゆっくり明滅。
  const glow = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced || variant !== 1) { glow.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(glow, { toValue: 1, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      Animated.timing(glow, { toValue: 0, duration: 1000, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [reduced, variant, glow]);

  // G4-2: ゲージ全体の呼吸。3秒周期、10分を切ったら1.5秒周期。
  const breath = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (reduced || variant !== 2) { breath.setValue(1); return; }
    const half = soon ? 750 : 1500;
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(breath, { toValue: 0.85, duration: half, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
      Animated.timing(breath, { toValue: 1, duration: half, easing: Easing.inOut(Easing.ease), useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [reduced, variant, soon, breath]);

  // G4-3: 減った瞬間、先端を短い光が走る。10秒ごとに一度。
  const glint = useRef(new Animated.Value(0)).current;
  const glintBeat = Math.floor(seconds / 10);
  useEffect(() => {
    if (reduced || variant !== 3) { glint.setValue(0); return; }
    glint.setValue(0);
    Animated.timing(glint, { toValue: 1, duration: 520, easing: Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [glintBeat, reduced, variant, glint]);

  // G4-4: 数秒に1回、細い光の筋が先端へ向かって一度だけ流れる。
  const [streak, setStreak] = useState<{ start: number; length: number; opacity: number } | null>(null);
  useEffect(() => {
    if (reduced || variant !== 4) { setStreak(null); return; }
    let painted = false;
    const began = Date.now();
    const id = setInterval(() => {
      const elapsed = (Date.now() - began) % 4200;
      const head = tipRef.current;
      if (elapsed < 1600 && head > 0) {
        const p = elapsed / 1600;
        const length = Math.min(PERIMETER * 0.06, head);
        setStreak({ start: Math.max(0, head * p - length), length, opacity: Math.min(1, Math.min(p, 1 - p) * 5) });
        painted = true;
      } else if (painted) {
        painted = false;
        setStreak(null);
      }
    }, 50);
    return () => clearInterval(id);
  }, [reduced, variant]);

  // G4-5: 黄色へのふわっとした切り替えと、3分からの小さな脈。
  const mix = useRef(new Animated.Value(soon ? 1 : 0)).current;
  useEffect(() => {
    if (variant !== 5) return;
    if (reduced) { mix.setValue(soon ? 1 : 0); return; }
    const anim = Animated.timing(mix, { toValue: soon ? 1 : 0, duration: 650, easing: Easing.inOut(Easing.ease), useNativeDriver: false });
    anim.start();
    return () => anim.stop();
  }, [soon, variant, reduced, mix]);
  const beat = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced || variant !== 5 || !urgent) { beat.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(beat, { toValue: 1, duration: 700, easing: Easing.out(Easing.ease), useNativeDriver: false }),
      Animated.timing(beat, { toValue: 0, duration: 700, easing: Easing.in(Easing.ease), useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [reduced, variant, urgent, beat]);

  // G4-6: 先端から、ごく控えめにこぼれる粒。
  const speck0 = useRef(new Animated.Value(0)).current;
  const speck1 = useRef(new Animated.Value(0)).current;
  const speck2 = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduced || variant !== 6) { speck0.setValue(0); speck1.setValue(0); speck2.setValue(0); return; }
    const make = (value: Animated.Value, delay: number) => Animated.loop(Animated.sequence([
      Animated.delay(delay),
      Animated.timing(value, { toValue: 1, duration: 1700, easing: Easing.out(Easing.quad), useNativeDriver: false }),
      Animated.timing(value, { toValue: 0, duration: 1, useNativeDriver: false }),
      Animated.delay(3400),
    ]));
    const loops = [make(speck0, 0), make(speck1, 240), make(speck2, 520)];
    loops.forEach(loop => loop.start());
    return () => loops.forEach(loop => loop.stop());
  }, [reduced, variant, speck0, speck1, speck2]);

  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%" viewBox={`0 0 ${VIEW_W} ${VIEW_H}`} preserveAspectRatio="none" accessibilityLabel={`残り時間 ${Math.ceil(seconds / 60)}分`}>
        <Path d={PATH} fill="none" stroke="rgba(255,255,255,0.16)" strokeWidth={STROKE} />
        {fraction > 0 && variant !== 2 && variant !== 5 && (
          <Path d={PATH} fill="none" stroke={color} strokeWidth={STROKE} strokeLinecap="round" strokeDasharray={`${tipDistance} ${PERIMETER}`} />
        )}
        {fraction > 0 && variant === 2 && (
          <AnimatedPath d={PATH} fill="none" stroke={color} strokeWidth={STROKE} strokeLinecap="round" strokeDasharray={`${tipDistance} ${PERIMETER}`} opacity={breath} />
        )}
        {fraction > 0 && variant === 5 && (
          <>
            <Path d={PATH} fill="none" stroke={C.white} strokeWidth={STROKE} strokeLinecap="round" strokeDasharray={`${tipDistance} ${PERIMETER}`} />
            <AnimatedPath d={PATH} fill="none" stroke={C.yellow} strokeWidth={STROKE} strokeLinecap="round" strokeDasharray={`${tipDistance} ${PERIMETER}`} opacity={mix} />
          </>
        )}

        {variant === 1 && fraction > 0 && (
          <>
            <AnimatedCircle cx={dot.x} cy={dot.y} r={10} fill={color} opacity={glow.interpolate({ inputRange: [0, 1], outputRange: [0.08, 0.24] })} />
            <AnimatedCircle cx={dot.x} cy={dot.y} r={4.2} fill={color} opacity={glow.interpolate({ inputRange: [0, 1], outputRange: [0.45, 1] })} />
          </>
        )}

        {variant === 3 && !reduced && fraction > 0 && (
          <AnimatedPath
            d={PATH} fill="none" stroke={C.red} strokeWidth={STROKE + 1} strokeLinecap="round"
            strokeDasharray={`${Math.min(PERIMETER * 0.05, tipDistance)} ${PERIMETER}`}
            strokeDashoffset={glint.interpolate({ inputRange: [0, 1], outputRange: [Math.max(0, tipDistance - PERIMETER * 0.13), Math.max(0, tipDistance - PERIMETER * 0.05)] })}
            opacity={glint.interpolate({ inputRange: [0, 0.15, 0.4, 1], outputRange: [0, 0.95, 0.7, 0] })}
          />
        )}

        {variant === 4 && streak && (
          <Path d={PATH} fill="none" stroke={C.red} strokeWidth={2.4} strokeLinecap="round" strokeDasharray={`${streak.length} ${PERIMETER}`} strokeDashoffset={-streak.start} opacity={streak.opacity * 0.9} />
        )}

        {variant === 5 && fraction > 0 && urgent && (
          <>
            <AnimatedCircle cx={dot.x} cy={dot.y} r={beat.interpolate({ inputRange: [0, 1], outputRange: [5, 11] })} fill="none" stroke={C.yellow} strokeWidth={1.6} opacity={beat.interpolate({ inputRange: [0, 1], outputRange: [0.45, 0] })} />
            <AnimatedCircle cx={dot.x} cy={dot.y} r={beat.interpolate({ inputRange: [0, 1], outputRange: [3.2, 4.6] })} fill={C.yellow} opacity={beat.interpolate({ inputRange: [0, 1], outputRange: [0.9, 0.55] })} />
          </>
        )}

        {variant === 6 && fraction > 0 && !reduced && [
          { value: speck0, dx: -7, dy: 13 },
          { value: speck1, dx: 3, dy: 18 },
          { value: speck2, dx: 10, dy: 24 },
        ].map(({ value, dx, dy }, i) => (
          <AnimatedCircle
            key={`speck-${i}`}
            cx={value.interpolate({ inputRange: [0, 1], outputRange: [dot.x, dot.x + dx] })}
            cy={value.interpolate({ inputRange: [0, 1], outputRange: [dot.y, dot.y + dy] })}
            r={value.interpolate({ inputRange: [0, 1], outputRange: [2, 0.8] })}
            fill={color}
            opacity={value.interpolate({ inputRange: [0, 0.08, 0.55, 1], outputRange: [0, 0.7, 0.45, 0] })}
          />
        ))}
      </Svg>
    </View>
  );
}
