// IDEA 13 指さしナビ（集合直前は、指が行き先を指さす）— プレビュー f5 専用の画面。
// API は呼ばない。画面内の state だけで 参加前 → 参加後 → 到着 とドラッグによる方角の疑似を動かす。
import { useRef, useState } from 'react';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import { C, FONT, PILL, RADIUS } from '../../ui/theme';
import { Gauge } from './GaugeFrame';
import { PointingHand } from './PointingHand';

const COMPASS = ['北', '北東', '東', '南東', '南', '南西', '西', '北西'] as const;
const compass = (bearing: number) => COMPASS[Math.round((((bearing % 360) + 360) % 360) / 45) % 8];

// ステージごとの見え方（架空のデータ: 主催者「あ＝あおい」）
const STAGES = [
  { name: '参加前', mins: 24, distance: '1.2km', bearing: 225, message: '集合場所の方向を指す' },
  { name: '参加後', mins: 3, distance: '120m', bearing: 45, message: 'あおいはすぐそこ' },
  { name: '到着', mins: 0, distance: '0m', bearing: 0, message: 'とまれ！' },
] as const;

export function NaviCard13() {
  const [stage, setStage] = useState(0);
  const [bearing, setBearing] = useState<number>(STAGES[0].bearing);
  const rot = useRef(new Animated.Value(STAGES[0].bearing)).current;
  // ドラッグの起点と最新のステージを参照する（古い closure を防ぐ）
  const latest = useRef<{ start: number; bearing: number; stage: number }>({ start: 0, bearing: STAGES[0].bearing, stage: 0 });
  latest.current = { start: 0, bearing, stage };

  // スマホの向きの疑似: 指の四角を左右にドラッグすると指が回る（縦はスクロールに譲る）
  const pan = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => false,
    onMoveShouldSetPanResponderCapture: (_, g) => Math.abs(g.dx) > 6 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderGrant: () => { rot.stopAnimation(); latest.current.start = latest.current.bearing; },
    onPanResponderMove: (_, g) => {
      const b = (latest.current.start + g.dx * 0.5 + 360 * 10) % 360;
      rot.setValue(b);
      setBearing(b);
    },
    onPanResponderRelease: () => {
      // 真上（±15°）に運ぶと指はまっすぐ上＝「とまれ！」の向き
      const b = latest.current.bearing;
      const toUp = b < 15 || b > 345;
      if (toUp) { Animated.spring(rot, { toValue: 0, useNativeDriver: false }).start(() => {}); setBearing(0); }
    },
    onPanResponderTerminationRequest: () => true,
    onPanResponderTerminate: () => { rot.setValue(latest.current.bearing); },
  })).current;

  const goStage = (i: number) => {
    setStage(i);
    setBearing(STAGES[i].bearing);
    Animated.spring(rot, { toValue: STAGES[i].bearing, useNativeDriver: false, speed: 14, bounciness: 6 }).start();
  };

  const st = STAGES[stage];
  const arrived = stage === 2;
  const soon = st.mins <= 3 && st.mins > 0;
  const rotDeg = rot.interpolate({ inputRange: [0, 360], outputRange: ['0deg', '360deg'] });

  return (
    <View>
      {/* ステージを切り替えるチップ（参加前 → 参加後 → 到着） */}
      <View style={s.chips}>
        {STAGES.map((x, i) => (
          <Pressable key={x.name} accessibilityRole="button" accessibilityLabel={`デモを${x.name}にする`}
            onPress={() => goStage(i)} style={[S.chipbase, stage === i && S.chipOn]}>
            <Text style={[S.chipText, stage === i && S.chipOnText]}>{x.name}</Text>
          </Pressable>
        ))}
      </View>

      <View style={[s.card, { backgroundColor: C.blue }]}>
        <Gauge fraction={arrived ? 0 : st.mins / 32} soon={soon || arrived} />
        <View style={s.left}>
          <Text style={s.title}>集合</Text>
          <Text style={s.time}>18:30 · 駅前 時計台</Text>
          <View style={s.hostRow}>
            <View style={s.hostDot}><Text style={s.hostDotText}>あ</Text></View>
            <Text numberOfLines={1} style={[s.message, arrived && s.messageBig]}>{st.message}</Text>
          </View>
        </View>
        <View {...pan.panHandlers} style={[s.panel, Platform.OS === 'web' ? { touchAction: 'pan-y' } as ViewStyle : null]}
          accessibilityLabel="指で方角を指す四角。左右にドラッグで方角が変わる">
          <Animated.View style={[s.hand, { transform: [{ rotate: rotDeg }] }]}>
            <PointingHand size={86} color={C.white} hatch="rgba(0,0,0,0.22)" />
          </Animated.View>
          <Text style={s.dir}>{compass(bearing)} {st.distance}</Text>
        </View>
        <View style={[S.badge, (soon || arrived) && S.badgeSoon]}>
          <Text style={[S.badgeText, (soon || arrived) && S.badgeTextSoon]}>{arrived ? 'とまれ！' : `あと${st.mins}分`}</Text>
        </View>
      </View>
    </View>
  );
}

// チップ・バッジの共通の見た目（13・14 両方で使う）
export const S = StyleSheet.create({
  chipbase: { backgroundColor: C.surface, borderRadius: PILL, paddingHorizontal: 16, minHeight: 44, justifyContent: 'center' },
  chipOn: { backgroundColor: C.ink },
  chipText: { fontFamily: FONT, fontSize: 13, fontWeight: '800', color: C.ink },
  chipOnText: { color: C.white },
  badge: { position: 'absolute', right: 16, bottom: 12, backgroundColor: C.ink, borderRadius: PILL, paddingHorizontal: 12, height: 30, alignItems: 'center', justifyContent: 'center' },
  badgeSoon: { backgroundColor: C.yellow },
  badgeText: { fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 13 },
  badgeTextSoon: { color: C.ink },
  status: { position: 'absolute', left: 16, top: 16, backgroundColor: 'rgba(255,255,255,0.28)', borderRadius: PILL, paddingHorizontal: 12, height: 28, justifyContent: 'center' },
  statusText: { fontFamily: FONT, color: C.white, fontWeight: '800', fontSize: 12 },
});

const s = StyleSheet.create({
  chips: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  card: { borderRadius: RADIUS, minHeight: 190, padding: 20, paddingBottom: 48, flexDirection: 'row', gap: 16, overflow: 'hidden' },
  left: { flex: 1, minWidth: 0, paddingTop: 6 },
  title: { fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 30 },
  time: { fontFamily: FONT, color: 'rgba(255,255,255,0.92)', fontWeight: '700', fontSize: 14, marginTop: 4 },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  hostDot: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  hostDotText: { fontFamily: FONT, color: C.blue, fontWeight: '900', fontSize: 15 },
  message: { fontFamily: FONT, flex: 1, color: C.white, fontWeight: '800', fontSize: 13 },
  messageBig: { fontSize: 17, fontWeight: '900' },
  panel: { width: 122, height: 154, borderRadius: RADIUS, backgroundColor: 'rgba(255,255,255,0.30)', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  hand: { marginTop: -10 },
  dir: { position: 'absolute', bottom: 10, fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 13 },
});
