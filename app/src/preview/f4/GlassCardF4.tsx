// デザイン案プレビュー（f4）: IDEA 11「すりガラス×ぷっくり指」
// 透明感のある質感。背景のにじみは静止画（すりガラス化は半透明で代用）。API は呼ばない。
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Ellipse, RadialGradient, Rect, Stop } from 'react-native-svg';
import { C, FONT, RADIUS } from '../../ui/theme';

function Blobs({ night }: { night: boolean }) {
  return (
    <Svg width="100%" height="100%" style={StyleSheet.absoluteFill}>
      <Defs>
        <RadialGradient id="f4-blob-red" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={C.red} stopOpacity={night ? 0.4 : 0.95} />
          <Stop offset="100%" stopColor={C.red} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="f4-blob-pink" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={C.pink} stopOpacity={night ? 0.45 : 0.85} />
          <Stop offset="100%" stopColor={C.pink} stopOpacity={0} />
        </RadialGradient>
        <RadialGradient id="f4-blob-blue" cx="50%" cy="50%" r="50%">
          <Stop offset="0%" stopColor={C.blue} stopOpacity={night ? 0.95 : 0.7} />
          <Stop offset="100%" stopColor={C.blue} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      {/* すりガラスの下のオレンジ・青・ピンクのにじみ（朝はオレンジ、夜は青が強い） */}
      <Rect width="100%" height="100%" fill="#F3F1FA" />
      <Ellipse cx={night ? '14%' : '24%'} cy="28%" rx="64%" ry="78%" fill="url(#f4-blob-red)" />
      <Ellipse cx="86%" cy="10%" rx="46%" ry="54%" fill="url(#f4-blob-pink)" opacity={night ? 0.4 : 0.85} />
      <Ellipse cx="88%" cy="96%" rx="56%" ry="66%" fill="url(#f4-blob-blue)" />
    </Svg>
  );
}

// 主催者の指: ぷっくりした立体（クレイ／3D絵文字風）の立て指
function PuffyFinger() {
  return (
    <Svg width={88} height={168} viewBox="0 0 88 168">
      {/* 手のひら */}
      <Rect x={10} y={92} width={68} height={76} rx={32} fill="#F4F1FB" />
      <Rect x={46} y={96} width={32} height={72} rx={16} fill="#DCD4EE" opacity={0.7} />
      <Ellipse cx={38} cy={112} rx={18} ry={11} fill="#FFFFFF" opacity={0.9} />
      {/* 立てた指 */}
      <Rect x={20} y={8} width={40} height={100} rx={20} fill="#F8F5FD" />
      <Rect x={46} y={14} width={12} height={92} rx={6} fill="#E4DDF2" opacity={0.85} />
      <Ellipse cx={33} cy={24} rx={9} ry={8} fill="#FFFFFF" />
    </Svg>
  );
}

const MEMBERS = ['り', 'ゆ'] as const;

export function GlassCardF4() {
  const [night, setNight] = useState(false);
  const [joined, setJoined] = useState(false); // 参加すると満員（あ+り+ゆ+わ=4/4）
  const cloud = useRef(new Animated.Value(0)).current; // 満員でガラスが曇る
  const ring1 = useRef(new Animated.Value(0)).current;
  const ring2 = useRef(new Animated.Value(0)).current;

  // 参加すると指先から波紋が2重に広がる（参加中はゆっくり繰り返す）
  useEffect(() => {
    if (!joined) { ring1.setValue(0); ring2.setValue(0); return; }
    const a = Animated.loop(Animated.timing(ring1, { toValue: 1, duration: 1700, easing: Easing.out(Easing.quad), useNativeDriver: false }));
    const b = Animated.loop(Animated.sequence([
      Animated.delay(850),
      Animated.timing(ring2, { toValue: 1, duration: 1700, easing: Easing.out(Easing.quad), useNativeDriver: false }),
    ]));
    a.start(); b.start();
    return () => { a.stop(); b.stop(); };
  }, [joined]);
  useEffect(() => {
    Animated.timing(cloud, { toValue: joined ? 1 : 0, duration: 600, useNativeDriver: false }).start();
  }, [joined]);

  // 波紋の中心＝指先（主催者の丸）
  const ring = (v: Animated.Value) => ({
    position: 'absolute' as const,
    left: 72 - 80, top: 68 - 80, width: 160, height: 160, borderRadius: 80,
    borderWidth: 2.5, borderColor: C.white,
    transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.35, 2.6] }) }],
    opacity: v.interpolate({ inputRange: [0, 0.12, 1], outputRange: [0, 0.8, 0] }),
  });

  return (
    <View style={styles.wrap}>
      <View style={styles.panel}>
        <Blobs night={night} />
        {/* すりガラスのカード */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={joined ? '満員。タップで取り消しのデモ' : 'タップで参加'}
          onPress={() => setJoined(j => !j)}
          style={styles.glass}
        >
          <View style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.55)', borderWidth: 2, borderColor: 'rgba(255,255,255,0.9)', borderRadius: 26 }]} />
          {/* 満員はガラスが少し曇る */}
          <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: 'rgba(255,255,255,0.5)', borderRadius: 26, opacity: cloud }]} />
          <View style={styles.glassInner}>
            <Text style={styles.title}>カフェ</Text>
            <Text style={styles.time}>今日 15:00 · 駅ナカ</Text>
            <View style={styles.chips}>
              {MEMBERS.map(m => (
                <View key={m} style={styles.chip}><Text style={styles.chipText}>{m}</Text></View>
              ))}
              {joined ? (
                <View style={[styles.chip, { backgroundColor: C.pink }]}><Text style={[styles.chipText, { color: C.white }]}>わ</Text></View>
              ) : (
                <View style={styles.chipEmpty} />
              )}
            </View>
          </View>
          {!!joined && <View style={styles.fullBadge}><Text style={styles.fullText}>満員</Text></View>}
          <View pointerEvents="none" style={styles.badge}><Text style={styles.badgeText}>あと24分</Text></View>
        </Pressable>
        {/* ぷっくり指（ガラスの下にも、指先の丸は上にも） */}
        <View pointerEvents="none" style={styles.finger}>
          <PuffyFinger />
        </View>
        {/* 主催者の丸: 指先にオレンジの丸（太い白リング） */}
        <View pointerEvents="none" style={styles.host}>
          <Text style={styles.hostText}>あ</Text>
        </View>
        {/* 指先からの波紋（2重） */}
        {joined && [
          <Animated.View key="r1" pointerEvents="none" style={ring(ring1)} />,
          <Animated.View key="r2" pointerEvents="none" style={ring(ring2)} />,
        ]}
      </View>
      {/* 背景色は時間帯で変化（朝＝オレンジ／夜＝青） */}
      <View style={styles.toggles}>
        <Pressable accessibilityRole="button" accessibilityLabel="朝の背景" onPress={() => setNight(false)} style={[styles.toggle, !night && styles.toggleOn]}>
          <Text style={[styles.toggleText, !night && styles.toggleTextOn]}>朝（オレンジ）</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="夜の背景" onPress={() => setNight(true)} style={[styles.toggle, night && styles.toggleOn]}>
          <Text style={[styles.toggleText, night && styles.toggleTextOn]}>夜（青）</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { marginTop: 4 },
  panel: { height: 250, borderRadius: RADIUS, overflow: 'hidden' },
  glass: { position: 'absolute', left: 16, top: 16, right: 16, bottom: 52 },
  glassInner: { flex: 1, paddingLeft: 104, paddingTop: 24 },
  title: { fontFamily: FONT, color: C.ink, fontWeight: '900', fontSize: 30, lineHeight: 36 },
  time: { fontFamily: FONT, color: '#5A5A66', fontWeight: '700', fontSize: 13, marginTop: 6 },
  chips: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 16 },
  chip: { width: 34, height: 34, borderRadius: 17, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  chipText: { fontFamily: FONT, color: C.ink, fontWeight: '800', fontSize: 15 },
  chipEmpty: { width: 34, height: 34, borderRadius: 17, borderWidth: 2, borderColor: 'rgba(17,17,17,0.35)', borderStyle: 'dashed' },
  finger: { position: 'absolute', left: 28, top: 44, width: 88, height: 168 },
  host: { position: 'absolute', left: 48, top: 44, width: 48, height: 48, borderRadius: 24, backgroundColor: C.red, alignItems: 'center', justifyContent: 'center', borderWidth: 4, borderColor: C.white },
  hostText: { fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 19 },
  fullBadge: { position: 'absolute', left: 104, bottom: 14, backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 12, height: 26, justifyContent: 'center' },
  fullText: { fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 12 },
  badge: { position: 'absolute', right: 14, bottom: 14, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: 999, paddingHorizontal: 12, height: 30, justifyContent: 'center' },
  badgeText: { fontFamily: FONT, color: C.ink, fontWeight: '900', fontSize: 13 },
  toggles: { flexDirection: 'row', gap: 8, marginTop: 10, alignItems: 'center' },
  toggle: { backgroundColor: C.white, borderRadius: 999, minHeight: 36, paddingHorizontal: 14, justifyContent: 'center' },
  toggleOn: { backgroundColor: C.ink },
  toggleText: { fontFamily: FONT, color: C.ink, fontWeight: '800', fontSize: 13 },
  toggleTextOn: { color: C.white },
});
