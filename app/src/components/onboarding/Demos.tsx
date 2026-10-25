import { useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, G, Path, Rect } from 'react-native-svg';
import { C, FONT, PILL, RADIUS, T, tint, popColor } from '../../ui/theme';

// X6 の Hand の線画を再利用。色は共通テーマに合わせる。
function Hand({ x = 0, flip = false }: { x?: number; flip?: boolean }) {
  return <G transform={`translate(${x} 0)${flip ? ' translate(660 0) scale(-1 1)' : ''}`} fill={C.ink} stroke={flip ? C.white : C.red} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round"><Path d="M-140 255 H64 V310 H-140 M88 239 H120 Q148 239 148 267 V295 Q148 323 120 323 H88 Q57 323 57 295 V267 Q57 239 88 239Z" /><Path d="M128 248 H250 A16 16 0 0 1 250 281 H111" /><Rect x={108} y={281} width={62} height={20} rx={10} /><Rect x={108} y={301} width={55} height={20} rx={10} /><Rect x={70} y={260} width={62} height={20} rx={10} /></G>;
}

export function useReducedMotion() {
  // 設定が分かるまでは動かさない。
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; subscription.remove(); };
  }, []);
  return reduced;
}

function useDemoProgress(active: boolean, reduced: boolean) {
  const value = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active || reduced) { value.setValue(1); return; }
    value.setValue(0);
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(450),
      Animated.timing(value, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      Animated.delay(1800),
      Animated.timing(value, { toValue: 0, duration: 350, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [active, reduced, value]);
  return value;
}

function DemoCard({ title = 'カラオケ', compact = false }: { title?: string; compact?: boolean }) {
  return <View style={[s.card, { backgroundColor: popColor(title), padding: compact ? 14 : 24 }]}>
    <View style={s.row}><View style={[s.avatar, compact && { width: 52, height: 52 }]}><Text style={s.avatarText}>あ</Text></View><View style={{ flex: 1, gap: 5 }}><Text style={[s.cardTitle, compact && { fontSize: 24 }]}>{title}</Text><Text style={s.white}>19:00〜 · 駅前</Text><Text style={s.white}>あき・りな　2 / 3人</Text></View></View>
    {!compact && <View style={s.time}><Text style={[s.white, { fontSize: 12 }]}>あと24分</Text></View>}
  </View>;
}

export function IntroDemo({ active, reduced }: { active: boolean; reduced: boolean }) {
  const p = useDemoProgress(active, reduced);
  return <View style={s.center}><Animated.View style={{ transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [6, -6] }) }] }}><Image source={require('../../../public/icons/icon-512.png')} accessibilityLabel="このゆびとまれの鳥" style={s.logo} /></Animated.View><Text style={[T.h1, { marginTop: 22 }]}>このゆびとまれ</Text><View style={s.tags}>{['誘う', '集まる', '遊ぶ'].map((word, i) => <View key={word} style={[s.tag, { backgroundColor: [C.red, C.blue, C.pink][i] }]}><Text style={s.white}>{word}</Text></View>)}</View></View>;
}

export function InviteDemo({ active, reduced }: { active: boolean; reduced: boolean }) {
  const p = useDemoProgress(active, reduced);
  return <View style={{ width: '100%', gap: 18 }}><View style={s.draft}><Text style={T.sub}>何して遊ぶ？</Text><Text style={T.h1}>カラオケ</Text><View style={s.row}>{['駅前', '19:00〜', '3人'].map(word => <View style={[s.tag, { backgroundColor: C.surface }]} key={word}><Text style={T.body}>{word}</Text></View>)}</View></View><Animated.View style={{ opacity: p.interpolate({ inputRange: [0, .6, 1], outputRange: [.25, 1, 1] }), transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [26, 0] }) }, { scale: p.interpolate({ inputRange: [0, 1], outputRange: [.94, 1] }) }] }}><DemoCard /></Animated.View><View style={s.published}><Text style={[s.white, { fontSize: 16 }]}>みんなを誘う →</Text></View></View>;
}

export function BoardDemo({ active, reduced }: { active: boolean; reduced: boolean }) {
  const p = useDemoProgress(active, reduced);
  return <View style={{ width: '100%', gap: 12 }}><View style={[s.row, { justifyContent: 'space-between' }]}><Text style={T.h1}>掲示板</Text><Text style={T.sub}>友達の募集</Text></View>{['カラオケ', 'ラーメン', '夜ドライブ'].map((title, i) => <Animated.View key={title} style={{ opacity: p.interpolate({ inputRange: [0, .25 + i * .2, 1], outputRange: [0, .55, 1] }), transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [45 + i * 20, 0] }) }] }}><DemoCard title={title} compact /></Animated.View>)}</View>;
}

export function SlideDemo({ active, reduced }: { active: boolean; reduced: boolean }) {
  const p = useDemoProgress(active, reduced);
  const [progress, setProgress] = useState(reduced ? 1 : 0);
  useEffect(() => { const id = p.addListener(({ value }) => setProgress(value)); return () => p.removeListener(id); }, [p]);
  return <View style={{ width: '100%', gap: 20 }}><View style={[s.card, { backgroundColor: C.ink, padding: 0, overflow: 'hidden' }]}><View style={{ padding: 24, gap: 6 }}><Text style={[s.white, { color: C.red, fontSize: 12 }]}>参加のデモ</Text><Text style={s.cardTitle}>カラオケ</Text><Text style={s.white}>19:00〜 · 駅前　2 / 3人</Text></View><Svg width="100%" height={150} viewBox="0 140 660 230" accessibilityLabel="左の指が右へスライドして主催者の指に触れるデモ"><Hand x={progress * 64} /><Hand x={-progress * 64} flip />{progress > .95 && <Circle cx={330} cy={265} r={13} fill={C.yellow} />}</Svg><View style={{ paddingHorizontal: 24, paddingBottom: 24 }}><Text style={[s.white, { color: C.red }]}>指を右へスライド →</Text></View></View><View style={s.tag}><Text style={[T.h2, { color: C.blue }]}>{progress > .95 ? 'タッチ！ 参加できた' : 'あなたの指 → 友達の指'}</Text></View></View>;
}

export function ChatDemo({ active, reduced }: { active: boolean; reduced: boolean }) {
  const p = useDemoProgress(active, reduced);
  return <View style={{ width: '100%', gap: 20 }}><View style={s.row}>{[0, 1, 2].map(i => <Animated.Image key={i} source={require('../../../public/icons/icon-512.png')} style={{ width: 58, height: 58, borderRadius: PILL, transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [i % 2 ? 10 : -10, 0] }) }] }} />)}<Text style={[T.h2, { color: C.red }]}>3 / 3人</Text></View><Text style={[T.huge, { color: C.red, fontSize: 40 }]}>とまった!!</Text><View style={s.chat}><Text style={[T.sub, { textAlign: 'center', marginBottom: 8 }]}>参加者だけのチャット</Text><View style={[s.bubble, { backgroundColor: tint(0), alignSelf: 'flex-start' }]}><Text style={T.body}>駅前で集合しよう！</Text></View><Animated.View style={[s.bubble, { backgroundColor: C.blue, alignSelf: 'flex-end', opacity: p.interpolate({ inputRange: [0, 1], outputRange: [.3, 1] }) }]}><Text style={s.white}>今から行くね！</Text></Animated.View><View style={[s.bubble, { backgroundColor: tint(3), alignSelf: 'flex-start' }]}><Text style={T.body}>楽しみ！</Text></View></View></View>;
}

const s = StyleSheet.create({
  center: { alignItems: 'center', justifyContent: 'center', width: '100%' },
  logo: { width: 176, height: 176, borderRadius: 44 },
  tags: { flexDirection: 'row', gap: 8, marginTop: 20 },
  tag: { borderRadius: PILL, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  card: { borderRadius: RADIUS, gap: 16 },
  cardTitle: { fontFamily: FONT, fontSize: 28, fontWeight: '900', color: C.white },
  white: { fontFamily: FONT, fontSize: 14, fontWeight: '700', color: C.white },
  avatar: { width: 62, height: 62, borderRadius: PILL, borderWidth: 5, borderColor: C.white, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontFamily: FONT, color: C.white, fontSize: 24, fontWeight: '900' },
  time: { backgroundColor: C.ink, paddingHorizontal: 12, paddingVertical: 7, borderRadius: PILL, alignSelf: 'flex-end' },
  draft: { borderRadius: RADIUS, padding: 22, gap: 12, backgroundColor: C.bg },
  published: { backgroundColor: C.red, borderRadius: PILL, alignItems: 'center', padding: 16 },
  chat: { backgroundColor: C.bg, padding: 20, borderRadius: RADIUS, gap: 14 },
  bubble: { borderRadius: RADIUS, paddingHorizontal: 16, paddingVertical: 14 },
});
