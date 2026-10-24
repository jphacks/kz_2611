import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';
import { Avatar } from '../../ui/Avatar';
import { C, FONT, PILL, RADIUS, T } from '../../ui/theme';

type U = { id: number; name: string; avatar: string | null };
const HOST: U = { id: 1, name: 'あ', avatar: null };
const P1: U = { id: 2, name: 'り', avatar: null };
const P2: U = { id: 3, name: 'ゆ', avatar: null };
const ME: U = { id: 4, name: 'わ', avatar: null };

function Section({ num, name, children }: { num: string; name: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{num}  {name}</Text>
      {children}
    </View>
  );
}

// ---------------- Idea 01: 指の節ゲージ ----------------
function Idea01() {
  const [joined, setJoined] = useState(false);
  const count = joined ? 3 : 2;
  const capacity = 5;
  const full = count >= capacity;
  const bend = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(bend, { toValue: full ? 1 : 0, duration: 400, useNativeDriver: true }).start();
  }, [full]);
  const rotate = bend.interpolate({ inputRange: [0, 1], outputRange: ['0deg', '8deg'] });
  const members = joined ? [P1, P2, ME] : [P1, P2];
  const fingerH = 150;
  const segH = fingerH / capacity;
  return (
    <View style={[styles.card, { backgroundColor: C.red }]}>
      <View style={styles.row}>
        <View style={styles.fingerArea}>
          <Animated.View style={[styles.fingerWrap, { transform: [{ rotate }] }]}>
            <Svg width={56} height={fingerH} viewBox={`0 0 56 ${fingerH}`}>
              <Rect x={2} y={2} width={52} height={fingerH - 4} rx={26} fill="rgba(0,0,0,0.35)" />
              {Array.from({ length: capacity }).map((_, i) => {
                const y = fingerH - (i + 1) * segH;
                const filled = i < count;
                return (
                  <Rect key={i} x={4} y={y + 2} width={48} height={segH - 4} rx={6}
                    fill={filled ? '#FFFFFF' : 'transparent'} opacity={filled ? 1 : 0} />
                );
              })}
              {Array.from({ length: capacity - 1 }).map((_, i) => {
                const y = fingerH - (i + 1) * segH;
                return <Line key={i} x1={6} y1={y} x2={50} y2={y} stroke="rgba(255,255,255,0.25)" strokeWidth={1} />;
              })}
            </Svg>
            <View style={styles.hostOnFinger}>
              <Avatar user={HOST} size={40} border={C.red} />
            </View>
          </Animated.View>
          <Text style={styles.fingerLabel}>主催 あ</Text>
        </View>
        <View style={styles.details}>
          <Text numberOfLines={1} style={styles.title}>カラオケ</Text>
          <Text style={styles.time}>今日 18:30 · 駅前</Text>
          <Pressable style={styles.members} onPress={() => {}}>
            <View style={{ flexDirection: 'row' }}>
              {members.map((u, i) => <View key={u.id} style={{ marginLeft: i ? -8 : 0 }}><Avatar user={u} size={26} border={C.red} /></View>)}
            </View>
            <Text style={styles.count}>{count}<Text style={styles.cap}> / {capacity}</Text></Text>
          </Pressable>
          {joined && <Text style={styles.note}>あなたが3つ目の節に</Text>}
          {full && <Text style={styles.note}>満員・締め切り</Text>}
        </View>
      </View>
      <View style={styles.badge}><Text style={styles.badgeText}>あと24分</Text></View>
      <Pressable style={styles.actionBtn} onPress={() => setJoined(v => !v)}>
        <Text style={styles.actionText}>{joined ? '参加を取り消す' : '参加する'}</Text>
      </Pressable>
    </View>
  );
}

// ---------------- Idea 02: とまり木 ----------------
function Idea02() {
  const [joined, setJoined] = useState(false);
  const capacity = 4;
  const participants = joined ? [P1, P2, ME] : [P1, P2];
  const emptyCount = capacity - participants.length;
  const branchBounce = useRef(new Animated.Value(0)).current;
  const fly = useRef(new Animated.Value(0)).current;
  const prevJoined = useRef(joined);
  useEffect(() => {
    if (joined && !prevJoined.current) {
      fly.setValue(0);
      Animated.spring(fly, { toValue: 1, useNativeDriver: true, speed: 12, bounciness: 8 }).start();
      branchBounce.setValue(0);
      Animated.sequence([
        Animated.timing(branchBounce, { toValue: 1, duration: 80, useNativeDriver: true }),
        Animated.spring(branchBounce, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 12 }),
      ]).start();
    }
    prevJoined.current = joined;
  }, [joined]);
  const branchY = branchBounce.interpolate({ inputRange: [0, 1], outputRange: [0, -6] });
  const flyY = fly.interpolate({ inputRange: [0, 1], outputRange: [40, 0] });
  const flyOpacity = fly.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] });
  const flyScale = fly.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] });
  const slotX = (i: number) => 40 + i * 52;
  return (
    <View style={[styles.card, { backgroundColor: C.blue }]}>
      <Text numberOfLines={1} style={styles.title}>ラーメン</Text>
      <Text style={styles.time}>今日 18:30 · 駅前</Text>
      <View style={styles.branchArea}>
        <Animated.View style={[styles.branch, { transform: [{ translateY: branchY }] }]}>
          <Svg width={260} height={24} viewBox="0 0 260 24">
            <Rect x={28} y={10} width={220} height={6} rx={3} fill="rgba(255,255,255,0.85)" />
          </Svg>
          <View style={styles.hostOnBranch}>
            <Avatar user={HOST} size={30} border={C.blue} />
          </View>
          {participants.map((u, i) => {
            const isNew = joined && u.id === ME.id && i === participants.length - 1;
            const avatar = <Avatar user={u} size={30} border={C.blue} />;
            return (
              <View key={u.id} style={[styles.birdSlot, { left: slotX(i) }]}>
                {isNew ? (
                  <Animated.View style={{ transform: [{ translateY: flyY }, { scale: flyScale }], opacity: flyOpacity }}>
                    {avatar}
                  </Animated.View>
                ) : avatar}
              </View>
            );
          })}
          {Array.from({ length: emptyCount }).map((_, i) => (
            <Pressable key={'e' + i} style={[styles.birdSlot, { left: slotX(participants.length + i) }]} onPress={() => setJoined(true)}>
              <View style={styles.emptySlot} />
            </Pressable>
          ))}
        </Animated.View>
      </View>
      {joined && <Text style={styles.note}>着地！ あなたがとまりました</Text>}
      <View style={styles.badge}><Text style={styles.badgeText}>あと24分</Text></View>
      <Pressable style={styles.actionBtn} onPress={() => setJoined(v => !v)}>
        <Text style={styles.actionText}>{joined ? '飛び立つ（取り消す）' : '空席をタップで参加'}</Text>
      </Pressable>
    </View>
  );
}

// ---------------- Idea 03: 指先タッチ ----------------
function Idea03() {
  const [joined, setJoined] = useState(false);
  const joinedRef = useRef(false);
  const max = 150;
  const threshold = max - 24;
  const pos = useRef(new Animated.Value(0)).current;
  const spark = useRef(new Animated.Value(0)).current;
  const posVal = useRef(0);
  useEffect(() => {
    const id = pos.addListener(({ value }) => { posVal.current = value; });
    return () => pos.removeListener(id);
  }, []);
  const triggerSpark = () => {
    spark.setValue(0);
    Animated.timing(spark, { toValue: 1, duration: 320, useNativeDriver: true }).start(() => spark.setValue(0));
  };
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => { pos.stopAnimation(); },
    onPanResponderMove: (_, g) => {
      const v = Math.max(0, Math.min(max, g.dx));
      pos.setValue(v);
      const nowJoined = v >= threshold;
      if (nowJoined !== joinedRef.current) {
        joinedRef.current = nowJoined;
        setJoined(nowJoined);
        if (nowJoined) triggerSpark();
      }
    },
    onPanResponderRelease: (_, g) => {
      const v = Math.max(0, Math.min(max, g.dx));
      if (v >= threshold) {
        Animated.spring(pos, { toValue: max, useNativeDriver: false, speed: 18, bounciness: 6 }).start();
        joinedRef.current = true;
        setJoined(true);
      } else {
        Animated.spring(pos, { toValue: 0, useNativeDriver: false, speed: 18, bounciness: 6 }).start();
        joinedRef.current = false;
        setJoined(false);
      }
    },
  })).current;
  const sparkScale = spark.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0.4, 1.6, 0.4] });
  const sparkOpacity = spark.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0, 1, 0] });
  return (
    <View style={[styles.card, { backgroundColor: '#111111' }]}>
      <Text numberOfLines={1} style={[styles.title, { color: '#FFFFFF' }]}>夜ドライブ</Text>
      <Text style={[styles.time, { color: 'rgba(255,255,255,0.85)' }]}>{joined ? '参加しました · 今日 21:00' : '今日 21:00 · 駅前'}</Text>
      <View style={styles.touchArea}>
        <View style={styles.fingerRight}>
          <Svg width={90} height={120} viewBox="0 0 90 120">
            <Path d="M 70 10 C 60 10 50 20 50 40 L 50 95 C 50 105 55 112 62 112 C 70 112 76 105 76 95 L 76 40 C 76 20 70 10 70 10 Z" stroke="#FFFFFF" strokeWidth={2} fill="none" />
            <Circle cx={63} cy={14} r={10} stroke="#FFFFFF" strokeWidth={2} fill="none" />
          </Svg>
          <Text style={styles.fingerTag}>あ</Text>
        </View>
        <Animated.View style={[styles.spark, { transform: [{ scale: sparkScale }], opacity: sparkOpacity }]}>
          <Svg width={40} height={40} viewBox="0 0 40 40">
            <Path d="M20 2 L23 14 L36 14 L26 22 L30 36 L20 28 L10 36 L14 22 L4 14 L17 14 Z" fill={C.red} />
          </Svg>
        </Animated.View>
        <Animated.View {...responder.panHandlers} style={[styles.fingerLeft, { transform: [{ translateX: pos }] }]}>
          <Svg width={90} height={120} viewBox="0 0 90 120">
            <Path d="M 20 10 C 30 10 40 20 40 40 L 40 95 C 40 105 35 112 28 112 C 20 112 14 105 14 95 L 14 40 C 14 20 20 10 20 10 Z" stroke="#FFFFFF" strokeWidth={2} strokeDasharray="4 3" fill="none" />
            <Circle cx={27} cy={14} r={10} stroke="#FFFFFF" strokeWidth={2} strokeDasharray="4 3" fill="none" />
          </Svg>
          <Text style={styles.fingerTag}>わ</Text>
        </Animated.View>
      </View>
      <Text style={[styles.sub, { color: 'rgba(255,255,255,0.7)' }]}>{joined ? 'ふれて参加しました' : '右へドラッグして指先をふれる'}</Text>
      <View style={styles.badge}><Text style={styles.badgeText}>あと24分</Text></View>
    </View>
  );
}

export default function PreviewF1() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={T.h1}>デザイン案プレビュー f1</Text>
      <Text style={T.sub}>触って動かせます。API は呼びません。</Text>
      <Section num="01" name="指の節ゲージ">
        <Idea01 />
      </Section>
      <Section num="02" name="とまり木">
        <Idea02 />
      </Section>
      <Section num="03" name="指先タッチ">
        <Idea03 />
      </Section>
    </ScrollView>
  );
}

export { PreviewF1 };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 40, gap: 20 },
  section: { gap: 10 },
  sectionTitle: { fontFamily: FONT, fontSize: 20, fontWeight: '900', color: C.ink },
  card: { borderRadius: RADIUS, padding: 20, paddingBottom: 48, minHeight: 200, overflow: 'hidden', position: 'relative' },
  row: { flexDirection: 'row', gap: 16, alignItems: 'flex-end' },
  fingerArea: { width: 70, alignItems: 'center', justifyContent: 'flex-end' },
  fingerWrap: { alignItems: 'center' },
  hostOnFinger: { position: 'absolute', top: -20, alignSelf: 'center' },
  fingerLabel: { fontFamily: FONT, color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '800', marginTop: 4 },
  details: { flex: 1, minWidth: 0, paddingTop: 8, gap: 4 },
  title: { fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 26, lineHeight: 30 },
  time: { fontFamily: FONT, color: 'rgba(255,255,255,0.92)', fontWeight: '700', fontSize: 13 },
  members: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 36, alignSelf: 'flex-start', marginTop: 4 },
  count: { fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 20 },
  cap: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.85)' },
  note: { fontFamily: FONT, color: 'rgba(255,255,255,0.95)', fontWeight: '800', fontSize: 12, marginTop: 4 },
  badge: { position: 'absolute', right: 16, bottom: 14, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 12, height: 30, justifyContent: 'center' },
  badgeText: { fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 13 },
  actionBtn: { marginTop: 12, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: PILL, minHeight: 40, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  actionText: { fontFamily: FONT, color: C.white, fontWeight: '800', fontSize: 13 },
  branchArea: { marginTop: 12, height: 60, justifyContent: 'center' },
  branch: { position: 'relative', height: 60 },
  hostOnBranch: { position: 'absolute', left: 0, top: 14 },
  birdSlot: { position: 'absolute', top: 4 },
  emptySlot: { width: 30, height: 30, borderRadius: 15, borderWidth: 2, borderColor: 'rgba(255,255,255,0.6)', borderStyle: 'dashed' },
  touchArea: { marginTop: 16, height: 130, position: 'relative' },
  fingerRight: { position: 'absolute', right: 0, top: 0, alignItems: 'center' },
  fingerLeft: { position: 'absolute', left: 0, top: 0, alignItems: 'center' },
  fingerTag: { fontFamily: FONT, color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '800', marginTop: 2 },
  spark: { position: 'absolute', left: 120, top: 40 },
  sub: { fontFamily: FONT, fontSize: 13, marginTop: 8 },
});