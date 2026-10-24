import { useState } from "react";
import { Animated, Pressable, Text, View, StyleSheet } from "react-native";
import Svg, { Circle, Path } from "react-native-svg";
import { FONT, PILL, RADIUS } from "../../ui/theme";
import { Avatar } from "../../ui/Avatar";

const CREAM = "rgb(255,248,238)";
const ORANGE = "rgb(255,90,54)";
const INK = "rgb(17,17,17)";
const MUTED = "rgb(138,138,138)";
const WHITE = "rgb(255,255,255)";

export function Idea07() {
  const [joined, setJoined] = useState(false);
  const scale = useState(() => new Animated.Value(1))[0];

  const onTap = () => {
    setJoined((v) => !v);
    Animated.sequence([
      Animated.spring(scale, { toValue: 1.25, useNativeDriver: true, friction: 4 }),
      Animated.spring(scale, { toValue: 1, useNativeDriver: true, friction: 5 }),
    ]).start();
  };

  const participants = joined ? "りん・ゆうき・あなた" : "りん・ゆうき";
  const sub = joined ? "指先にとまりました" : "指先の ○ にとまる";

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 320 180" preserveAspectRatio="none">
          <Path d="M 22 2 H 298 A 20 20 0 0 1 318 22 V 158 A 20 20 0 0 1 298 178 H 22 A 20 20 0 0 1 2 158 V 22 A 20 20 0 0 1 22 2 Z"
            fill="none" stroke="rgba(255,90,54,0.18)" strokeWidth={6} strokeLinecap="round" />
          <Path d="M 22 2 H 298 A 20 20 0 0 1 318 22 V 158 A 20 20 0 0 1 298 178 H 22 A 20 20 0 0 1 2 158 V 22 A 20 20 0 0 1 22 2 Z"
            fill="none" stroke={ORANGE} strokeWidth={6} strokeLinecap="round"
            strokeDasharray="360 540" />
        </Svg>

        <View style={styles.handArea}>
          <Svg width={90} height={110} viewBox="0 0 90 110">
            <Path d="M 10 100 C 12 70, 20 55, 30 50 C 38 46, 40 55, 38 62 C 36 70, 30 72, 28 68 C 26 62, 32 55, 40 52 C 50 48, 52 30, 50 12"
              fill="none" stroke={ORANGE} strokeWidth={3} strokeLinecap="round" strokeLinejoin="round" />
            <Circle cx={50} cy={10} r={11} fill={joined ? ORANGE : "transparent"} stroke={ORANGE} strokeWidth={2.5} />
          </Svg>
          {joined && (
            <Animated.View style={[styles.faceOnFinger, { transform: [{ scale }] }]}>
              <Avatar user={{ name: "わ", avatar: null }} size={20} />
            </Animated.View>
          )}
        </View>

        <View style={styles.body}>
          <Text style={styles.title}>朝ラン</Text>
          <Text style={styles.time}>明日 7:00 · 川沿い</Text>
          <Text style={styles.people}>{participants}</Text>
          <Text style={styles.sub}>{sub}</Text>
        </View>

        <View style={styles.badge}>
          <Text style={styles.badgeText}>あと24分</Text>
        </View>
      </View>

      <Pressable onPress={onTap} style={styles.btn}>
        <Text style={styles.btnText}>{joined ? "参加済み（タップで戻す）" : "指先の ○ をタップして参加"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  card: {
    backgroundColor: CREAM, borderRadius: RADIUS, padding: 20, paddingBottom: 48,
    minHeight: 180, flexDirection: "row", gap: 12, overflow: "hidden", position: "relative",
  },
  handArea: { width: 90, alignItems: "center", justifyContent: "flex-start", paddingTop: 10, position: "relative" },
  faceOnFinger: { position: "absolute", top: 0, left: 35 },
  body: { flex: 1, paddingTop: 8, gap: 4 },
  title: { fontFamily: FONT, color: INK, fontWeight: "900", fontSize: 26 },
  time: { fontFamily: FONT, color: MUTED, fontWeight: "700", fontSize: 14 },
  people: { fontFamily: FONT, color: INK, fontWeight: "800", fontSize: 13, marginTop: 6 },
  sub: { fontFamily: FONT, color: ORANGE, fontWeight: "800", fontSize: 13, marginTop: 4 },
  badge: { position: "absolute", right: 16, bottom: 14, backgroundColor: INK, borderRadius: PILL, paddingHorizontal: 12, height: 30, justifyContent: "center" },
  badgeText: { fontFamily: FONT, color: WHITE, fontWeight: "900", fontSize: 13 },
  btn: { backgroundColor: ORANGE, borderRadius: PILL, minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  btnText: { fontFamily: FONT, color: WHITE, fontWeight: "800", fontSize: 14 },
});