// デザイン案プレビュー（f4）: IDEA 10「指印スタンプ」
// 参加の確定は、指でポンと押す。API は呼ばず、画面内の状態だけで動く。
import { useEffect, useRef, useState } from 'react';
import { Animated, Platform, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { C, FONT, RADIUS } from '../../ui/theme';

const PINK = '#FF3EA5';

// Webでのみ、押した瞬間に軽い振動（端末が対応しているときだけ）
function buzz() {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined') return;
  try { (navigator as Navigator & { vibrate?: (p: number) => boolean }).vibrate?.(25); } catch { /* 無視 */ }
}

// 指紋のスタンプ（同心円に手作業の味＝スキマ）
function FingerprintStamp({ opacity }: { opacity: number }) {
  const rings = [
    { r: 47, dash: '34 7 26 6 40 9' },
    { r: 39, dash: '26 6 40 7 30 8' },
    { r: 31, dash: '30 8 22 6 30 7' },
    { r: 23, dash: '24 7 34 6 26 8' },
    { r: 15, dash: '20 7 26 8 24 7' },
  ] as const;
  return (
    <Svg width={116} height={116} viewBox="0 0 120 120">
      {rings.map((ring, i) => (
        <Circle key={i} cx={60} cy={60} r={ring.r} fill="none" stroke={C.ink} strokeWidth={4.5} strokeLinecap="round" strokeDasharray={ring.dash} opacity={opacity} />
      ))}
      <Circle cx={60} cy={60} r={7} fill={C.ink} opacity={opacity} />
    </Svg>
  );
}

export function StampCardF4() {
  const [joined, setJoined] = useState(false); // 参加したか（スタンプが押されているか）
  const [hint, setHint] = useState(true);      // 初回だけの「長押しで参加」ヒント
  const [progress, setProgress] = useState(0); // 長押しのゲージ（ joined 後は「かすれ」の進み）
  const joinedRef = useRef(false); joinedRef.current = joined;
  const held = useRef(false);        // 今押している最中か
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pop = useRef(new Animated.Value(0)).current; // スタンプがポンと押される演出

  useEffect(() => () => { if (timer.current) clearInterval(timer.current); }, []);

  // 長押しを始める: 円ゲージがたまり、たまりきった瞬間に押す／消す
  const pressIn = () => {
    if (held.current) return;
    held.current = true;
    setProgress(0);
    const total = joinedRef.current ? 750 : 1100;
    const start = Date.now();
    if (timer.current) clearInterval(timer.current);
    timer.current = setInterval(() => {
      if (!held.current) { if (timer.current) clearInterval(timer.current); return; }
      const p = Math.min(1, (Date.now() - start) / total);
      setProgress(p);
      if (p >= 1) {
        held.current = false;
        if (timer.current) clearInterval(timer.current);
        if (joinedRef.current) {
          // かすれて消える ＝ 取り消し
          setJoined(false);
        } else {
          // 振動 ＋ 指紋のスタンプがポンと押される
          setJoined(true);
          setHint(false);
          buzz();
          pop.setValue(0.55);
          Animated.spring(pop, { toValue: 1, useNativeDriver: false, friction: 5, tension: 180 }).start();
        }
        setProgress(0);
      }
    }, 34);
  };

  // 離した: ゲージはもどり、スタンプのかすれももとに戻る
  const pressOut = () => {
    if (!held.current) return;
    held.current = false;
    if (timer.current) clearInterval(timer.current);
    setProgress(0);
  };

  const scale = pop.interpolate({ inputRange: [0, 1], outputRange: [0.55, 1] });
  const tilt = pop.interpolate({ inputRange: [0, 1], outputRange: [0, -10] });
  // スタンプが押されたあとに長押し中は、スタンプがかすれて消えていく
  const stampOpacity = joined ? 1 - progress * 0.9 : 1;
  const stampTilt = -progress * 8;
  const gauge = 2 * Math.PI * 38 * progress;

  return (
    <View style={[styles.card, { backgroundColor: PINK }]}>
      <View style={{ position: 'absolute', left: 20, top: 18 }}>
        <Text style={styles.title}>ドライブ</Text>
        <Text style={styles.time}>今日 18:30 · 駅前</Text>
      </View>
      {/* 主催者の丸（黒い円 ＋ 白文字） */}
      <View style={styles.host}>
        <View style={styles.hostAvatar}><Text style={styles.hostInitial}>あ</Text></View>
        <Text style={styles.hostText}>主催 あおい · <Text style={{ fontWeight: '900' }}>2/5</Text></Text>
      </View>
      {/* 右のかたち: 点線の円（長押し）⇔ 指印スタンプ */}
      <View style={styles.stampWrap}>
        {joined ? (
          <View accessibilityLabel="参加。長押しで取り消す" style={styles.stampBox}>
            {/* 外側: 押された瞬間のポン（scale・傾き） 内側: 長押し中のかすれ（回転・薄まり） */}
            <Animated.View style={{ transform: [{ scale }, { rotate: `${tilt}deg` }] }}>
              <View style={{ transform: [{ rotate: `${stampTilt}deg` }] }}>
                <FingerprintStamp opacity={stampOpacity} />
                <Text style={styles.stampLabel}>参加</Text>
              </View>
            </Animated.View>
          </View>
        ) : (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="参加ボタン。長押しで参加"
            onPressIn={pressIn}
            onPressOut={pressOut}
            style={[styles.circlePress, { transform: [{ scale: 1 + progress * 0.06 }] }]}
          >
            <Svg width={88} height={88} viewBox="0 0 88 88">
              <Circle cx={44} cy={44} r={38} fill="none" stroke="rgba(255,255,255,0.85)" strokeWidth={4} strokeDasharray="3 9" strokeLinecap="round" />
            </Svg>
            <Svg width={88} height={88} style={StyleSheet.absoluteFill} viewBox="0 0 88 88">
              <Circle cx={44} cy={44} r={38} fill="none" stroke={C.ink} strokeWidth={6} strokeLinecap="round" strokeDasharray={`${gauge} ${2 * Math.PI * 38}`} />
            </Svg>
            <Text style={styles.circleLabel}>長押し</Text>
          </Pressable>
        )}
        {!joined && hint && <View style={styles.hint}><Text style={styles.hintText}>長押しで参加</Text></View>}
      </View>
      {/* 右下の黒いピル: 残り時間 */}
      <View style={styles.badge}><Text style={styles.badgeText}>あと24分</Text></View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS, height: 208, overflow: 'hidden' },
  title: { fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 32, lineHeight: 38 },
  time: { fontFamily: FONT, color: 'rgba(255,255,255,0.95)', fontWeight: '700', fontSize: 14, marginTop: 4 },
  host: { position: 'absolute', left: 20, bottom: 16, flexDirection: 'row', alignItems: 'center', gap: 8 },
  hostAvatar: { width: 40, height: 40, borderRadius: 20, backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center', borderWidth: 3, borderColor: C.white },
  hostInitial: { fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 17 },
  hostText: { fontFamily: FONT, color: C.white, fontWeight: '700', fontSize: 13 },
  stampWrap: { position: 'absolute', right: 16, top: 46, width: 116, height: 116, alignItems: 'center', justifyContent: 'center' },
  stampBox: { width: 116, height: 116, alignItems: 'center', justifyContent: 'center' },
  stampLabel: { position: 'absolute', fontFamily: FONT, color: C.ink, fontWeight: '900', fontSize: 19 },
  circlePress: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
  circleLabel: { position: 'absolute', fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 14 },
  hint: { position: 'absolute', right: 4, top: -28, backgroundColor: C.white, borderRadius: 999, paddingHorizontal: 12, height: 26, justifyContent: 'center' },
  hintText: { fontFamily: FONT, color: PINK, fontWeight: '900', fontSize: 12 },
  badge: { position: 'absolute', right: 16, bottom: 14, backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 12, height: 30, justifyContent: 'center' },
  badgeText: { fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 13 },
});
