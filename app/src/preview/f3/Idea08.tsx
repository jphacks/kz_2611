import { useEffect, useRef, useState } from "react";
import { Animated, Pressable, Text, View, StyleSheet } from "react-native";
import { FONT, PILL, RADIUS } from "../../ui/theme";
import { Avatar } from "../../ui/Avatar";

const INK = "rgb(17,17,17)";
const MUTED = "rgb(138,138,138)";
const WHITE = "rgb(255,255,255)";
const BLUE = "rgb(61,90,254)";
const ORANGE = "rgb(255,90,54)";
const PINK = "rgb(255,62,165)";

const NAMES = ["あ", "り", "ゆ", "わ", "も"];
const CAPACITY = 5;

export function Idea08() {
  const [count, setCount] = useState(2);
  const [joined, setJoined] = useState(false);
  const pops = useRef(NAMES.map(() => new Animated.Value(0))).current;

  useEffect(() => {
    NAMES.forEach((_, i) => {
      const target = i < count ? 1 : 0;
      if (target === 1) {
        pops[i].setValue(0);
        Animated.spring(pops[i], { toValue: 1, useNativeDriver: true, friction: 4, tension: 80 }).start();
      } else {
        pops[i].setValue(0);
      }
    });
  }, [count]);

  const onJoin = () => {
    if (joined) return;
    if (count >= CAPACITY) return;
    setJoined(true);
    setCount((c) => c + 1);
  };
  const onLeave = () => {
    if (!joined) return;
    setJoined(false);
    setCount((c) => Math.max(2, c - 1));
  };
  const onAdd = () => {
    if (count >= CAPACITY) return;
    setCount((c) => c + 1);
  };
  const onReset = () => {
    setJoined(false);
    setCount(2);
  };

  return (
    <View style={styles.wrap}>
      <View style={styles.card}>
        <Text style={styles.title}>ボウリング</Text>
        <Text style={styles.time}>今日 18:30 · 駅前</Text>

        <View style={styles.hand}>
          <View style={styles.fingers}>
            {NAMES.map((name, i) => {
              const active = i < count;
              return (
                <View key={i} style={styles.fingerCol}>
                  <Animated.View style={{ transform: [{ scaleY: pops[i] }], opacity: pops[i] }}>
                    {active ? (
                      <View style={styles.avatarWrap}>
                        <Avatar user={{ name, avatar: null }} size={34} />
                      </View>
                    ) : (
                      <View style={styles.avatarPlaceholder} />
                    )}
                  </Animated.View>
                  <Animated.View
                    style={[
                      styles.finger,
                      {
                        height: active ? 56 : 16,
                        backgroundColor: active ? BLUE : "rgb(220,220,220)",
                        transform: [{ scaleY: pops[i] }],
                      },
                    ]}
                  />
                </View>
              );
            })}
          </View>
          <View style={styles.palm} />
        </View>

        <Text style={styles.note}>
          {count === CAPACITY ? "5人そろってパー！満員" : `${count}本目の指が立った`}
        </Text>
        <Text style={styles.sub}>立っている指＝集まった人</Text>
      </View>

      <View style={styles.row}>
        <Pressable onPress={joined ? onLeave : onJoin} style={styles.btn}>
          <Text style={styles.btnText}>{joined ? "参加を取り消す" : "参加する"}</Text>
        </Pressable>
        <Pressable onPress={onAdd} style={styles.btnGhost}>
          <Text style={styles.btnGhostText}>＋参加者</Text>
        </Pressable>
      </View>
      <Pressable onPress={onReset} style={styles.reset}>
        <Text style={styles.resetText}>リセット</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  card: {
    backgroundColor: "rgb(255,255,255)", borderRadius: RADIUS, padding: 20, paddingBottom: 40,
    minHeight: 260, gap: 10, borderWidth: 0,
  },
  title: { fontFamily: FONT, color: INK, fontWeight: "900", fontSize: 26 },
  time: { fontFamily: FONT, color: MUTED, fontWeight: "700", fontSize: 14 },
  hand: { alignItems: "center", marginTop: 12, gap: 4 },
  fingers: { flexDirection: "row", alignItems: "flex-end", gap: 10, height: 120 },
  fingerCol: { alignItems: "center", gap: 4, width: 46 },
  avatarWrap: { height: 38, justifyContent: "flex-end" },
  avatarPlaceholder: { height: 38 },
  finger: { width: 22, borderRadius: 11, backgroundColor: BLUE },
  palm: { width: 260, height: 18, borderRadius: 9, backgroundColor: "rgb(230,230,230)", marginTop: 6 },
  note: { fontFamily: FONT, color: INK, fontWeight: "800", fontSize: 14, marginTop: 8 },
  sub: { fontFamily: FONT, color: MUTED, fontWeight: "700", fontSize: 12 },
  row: { flexDirection: "row", gap: 8 },
  btn: { flex: 1, backgroundColor: BLUE, borderRadius: PILL, minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  btnText: { fontFamily: FONT, color: WHITE, fontWeight: "800", fontSize: 14 },
  btnGhost: { flex: 1, backgroundColor: "rgb(242,242,242)", borderRadius: PILL, minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  btnGhostText: { fontFamily: FONT, color: INK, fontWeight: "800", fontSize: 14 },
  reset: { alignSelf: "center", padding: 8 },
  resetText: { fontFamily: FONT, color: MUTED, fontSize: 12 },
});