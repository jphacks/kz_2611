import { useRef, useState } from "react";
import { Animated, Pressable, Text, View, StyleSheet } from "react-native";
import Svg, { Circle, Line, Rect } from "react-native-svg";
import { FONT, PILL, RADIUS } from "../../ui/theme";
import { Avatar } from "../../ui/Avatar";

const INK = "rgb(17,17,17)";
const MUTED = "rgb(138,138,138)";
const WHITE = "rgb(255,255,255)";
const BLUE = "rgb(61,90,254)";
const ORANGE = "rgb(255,90,54)";
const PINK = "rgb(255,62,165)";
const GREEN = "rgb(0,179,126)";

type Pin = { id: number; x: number; y: number; name: string; color: string; title: string };

const INITIAL: Pin[] = [
  { id: 1, x: 30, y: 40, name: "あ", color: BLUE, title: "ボドゲ会" },
  { id: 2, x: 62, y: 25, name: "り", color: ORANGE, title: "朝ラン" },
  { id: 3, x: 50, y: 70, name: "ゆ", color: GREEN, title: "カラオケ" },
];

export function Idea09() {
  const [pins, setPins] = useState<Pin[]>(INITIAL);
  const [selected, setSelected] = useState<number | null>(null);
  const [joined, setJoined] = useState<Set<number>>(new Set());
  const nextId = useRef(4);

  const onAdd = () => {
    const id = nextId.current++;
    const newPin: Pin = {
      id,
      x: 20 + Math.random() * 60,
      y: 20 + Math.random() * 60,
      name: "け",
      color: PINK,
      title: "新着募集",
    };
    setPins((p) => [...p, newPin]);
  };

  const onJoin = (id: number) => {
    setJoined((prev) => {
      const n = new Set(prev);
      n.add(id);
      return n;
    });
    setSelected(null);
  };

  const selPin = pins.find((p) => p.id === selected);

  return (
    <View style={styles.wrap}>
      <View style={styles.map}>
        <Svg style={StyleSheet.absoluteFill} viewBox="0 0 100 100" preserveAspectRatio="none">
          <Rect x={0} y={0} width={100} height={100} fill="rgb(242,242,242)" />
          <Line x1={0} y1={33} x2={100} y2={33} stroke="rgb(220,220,220)" strokeWidth={1} />
          <Line x1={0} y1={66} x2={100} y2={66} stroke="rgb(220,220,220)" strokeWidth={1} />
          <Line x1={33} y1={0} x2={33} y2={100} stroke="rgb(220,220,220)" strokeWidth={1} />
          <Line x1={66} y1={0} x2={66} y2={100} stroke="rgb(220,220,220)" strokeWidth={1} />
        </Svg>

        {pins.map((pin) => {
          const isJoined = joined.has(pin.id);
          return (
            <Pressable
              key={pin.id}
              onPress={() => setSelected(pin.id)}
              style={[styles.pin, { left: `${pin.x}%`, top: `${pin.y}%` }]}
            >
              <View style={styles.pinFinger}>
                <Avatar user={{ name: pin.name, avatar: null }} size={26} />
                <View style={[styles.fingerLine, { backgroundColor: pin.color }]} />
                <View style={[styles.dot, { backgroundColor: pin.color }]} />
              </View>
              {isJoined && (
                <View style={[styles.ring, { borderColor: ORANGE }]} />
              )}
            </Pressable>
          );
        })}

        {selPin && (
          <View style={styles.bubble}>
            <Text style={styles.bubbleTitle}>{selPin.title}</Text>
            <Text style={styles.bubbleSub}>今から · 徒歩4分</Text>
            <Pressable onPress={() => onJoin(selPin.id)} style={styles.bubbleBtn}>
              <Text style={styles.bubbleBtnText}>とまる →</Text>
            </Pressable>
          </View>
        )}
      </View>

      <Pressable onPress={onAdd} style={styles.btn}>
        <Text style={styles.btnText}>新着ピンを追加</Text>
      </Pressable>
      <Text style={styles.hint}>ピンをタップすると吹き出し。参加すると色の輪が付きます。</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: 12 },
  map: {
    height: 260, borderRadius: RADIUS, overflow: "hidden", position: "relative",
    backgroundColor: "rgb(242,242,242)",
  },
  pin: { position: "absolute", alignItems: "center", transform: [{ translateX: -13 }, { translateY: -13 }] },
  pinFinger: { alignItems: "center" },
  fingerLine: { width: 4, height: 18, borderRadius: 2, marginTop: 2 },
  dot: { width: 8, height: 8, borderRadius: 4, marginTop: 2 },
  ring: { position: "absolute", top: -4, width: 34, height: 34, borderRadius: 17, borderWidth: 3 },
  bubble: {
    position: "absolute", bottom: 12, left: 12, right: 12,
    backgroundColor: WHITE, borderRadius: RADIUS, padding: 12, gap: 4,
    shadowColor: "#000", shadowOpacity: 0.1, shadowRadius: 8,
  },
  bubbleTitle: { fontFamily: FONT, color: INK, fontWeight: "900", fontSize: 18 },
  bubbleSub: { fontFamily: FONT, color: MUTED, fontWeight: "700", fontSize: 12 },
  bubbleBtn: { backgroundColor: ORANGE, borderRadius: PILL, minHeight: 40, alignItems: "center", justifyContent: "center", marginTop: 4 },
  bubbleBtnText: { fontFamily: FONT, color: WHITE, fontWeight: "800", fontSize: 14 },
  btn: { backgroundColor: ORANGE, borderRadius: PILL, minHeight: 48, alignItems: "center", justifyContent: "center", paddingHorizontal: 20 },
  btnText: { fontFamily: FONT, color: WHITE, fontWeight: "800", fontSize: 14 },
  hint: { fontFamily: FONT, color: MUTED, fontSize: 12 },
});