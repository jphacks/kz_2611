// デザイン案プレビュー（f4）: IDEA 12「『あと1人』タイポ」
// 数字の「1」が、立てた指になる。残り1人専用の“決め”の画面。API は呼ばない。
import { useEffect, useRef, useState } from 'react';
import { Animated, Easing, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Rect } from 'react-native-svg';
import { C, FONT, RADIUS } from '../../ui/theme';

// 橙色の立て指（「あと1人」の 1 になる）
 function RaisedFinger() {
  return (
    <Svg width={64} height={96} viewBox="0 0 64 96">
      <Rect x={18} y={0} width={24} height={58} rx={12} fill={C.red} />
      <Rect x={4} y={44} width={56} height={50} rx={16} fill={C.red} />
      {/* 白いスリット: 手作業の味（爪の折り目） */}
      <Rect x={4} y={62} width={12} height={6} rx={3} fill={C.white} />
      <Rect x={48} y={62} width={12} height={6} rx={3} fill={C.white} />
    </Svg>
  );
}

const ALL = ['あ', 'り', 'ゆ', 'わ', 'け'] as const;

export function LastOneCardF4() {
  const [full, setFull] = useState(false); // 満員になると指が下りて集合へ
  const drop = useRef(new Animated.Value(0)).current;  // 指が下りる演出
  const sway = useRef(new Animated.Value(0)).current;  // 「1」の指が揺れる

  // 残り1人の指が、手招きするように小さく揺れる
  useEffect(() => {
    if (full) { sway.setValue(0); return; }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(sway, { toValue: 1, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
      Animated.timing(sway, { toValue: 0, duration: 1300, easing: Easing.inOut(Easing.quad), useNativeDriver: false }),
    ]));
    loop.start();
    return () => { loop.stop(); sway.setValue(0); };
  }, [full]);
  // タップで満員に: 指が下りて、集合の表示へ
  useEffect(() => {
    Animated.timing(drop, { toValue: full ? 1 : 0, duration: 520, easing: full ? Easing.in(Easing.quad) : Easing.out(Easing.quad), useNativeDriver: false }).start();
  }, [full]);

  const swayDeg = sway.interpolate({ inputRange: [0, 1], outputRange: ['-5deg', '5deg'] });
  const lastOpacity = drop.interpolate({ inputRange: [0, 0.6, 1], outputRange: [1, 1, 0] });
  const rowDrop = drop.interpolate({ inputRange: [0, 1], outputRange: [0, 36] });
  const fullOpacity = drop.interpolate({ inputRange: [0, 0.45, 0.8], outputRange: [0, 0, 1] });
  const fullRise = drop.interpolate({ inputRange: [0, 1], outputRange: [14, 0] });

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={full ? '満員。タップで残り1人の表示に戻す' : '残り1人。タップで満員の表示にする'}
      onPress={() => setFull(f => !f)}
      style={styles.card}
    >
      <Text style={styles.meta}>カラオケ · 今日 18:30 · 駅前</Text>

      {/* 参加前: 「あと1人」の 1 が、立てた指になる */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center, { opacity: lastOpacity }]}>
        <Animated.View style={[styles.row, { transform: [{ translateY: rowDrop }] }]}>
          <Text style={styles.big}>あと</Text>
          <Animated.View style={{ transform: [{ rotate: swayDeg }] }}>
            <Animated.View style={{ transform: [{ translateY: drop.interpolate({ inputRange: [0, 1], outputRange: [0, 44] }) }], opacity: drop }}>
              <RaisedFinger />
            </Animated.View>
          </Animated.View>
          <Text style={styles.big}>人</Text>
        </Animated.View>
        <View style={styles.footRow}>
          <Text style={styles.tagline}>このゆび、とまれ。 — 最後の1席</Text>
          <View style={styles.badge}><Text style={styles.badgeText}>あと6分</Text></View>
        </View>
      </Animated.View>

      {/* 参加後: 満員！ ＋ 全員の顔が並ぶ（指が下りて、集合へ） */}
      <Animated.View pointerEvents="none" style={[StyleSheet.absoluteFill, styles.center, { opacity: fullOpacity, transform: [{ translateY: fullRise }] }]}>
        <Text style={styles.mannin}>満員！</Text>
        <View style={styles.faces}>
          {ALL.map(m => (
            <View key={m} style={[styles.face, m === 'わ' && { backgroundColor: C.red }]}>
              <Text style={[styles.faceText, m === 'わ' && { color: C.white }]}>{m}</Text>
            </View>
          ))}
          <Text style={styles.caption}>指が下りて、集合へ</Text>
        </View>
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS, backgroundColor: C.ink, height: 224, overflow: 'hidden' },
  meta: { fontFamily: FONT, color: C.white, fontWeight: '700', fontSize: 13, opacity: 0.95, position: 'absolute', left: 20, top: 18 },
  center: { alignItems: 'center', justifyContent: 'center', paddingHorizontal: 20 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 44 },
  big: { fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 56, lineHeight: 62 },
  footRow: { position: 'absolute', left: 20, right: 16, bottom: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  tagline: { fontFamily: FONT, color: C.red, fontWeight: '800', fontSize: 13 },
  badge: { backgroundColor: C.white, borderRadius: 999, paddingHorizontal: 12, height: 28, justifyContent: 'center' },
  badgeText: { fontFamily: FONT, color: C.ink, fontWeight: '900', fontSize: 13 },
  mannin: { fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 46, lineHeight: 54 },
  faces: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 14 },
  face: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.white, alignItems: 'center', justifyContent: 'center' },
  faceText: { fontFamily: FONT, color: C.ink, fontWeight: '900', fontSize: 14 },
  caption: { fontFamily: FONT, color: 'rgba(255,255,255,0.6)', fontWeight: '700', fontSize: 12, marginLeft: 8 },
});
