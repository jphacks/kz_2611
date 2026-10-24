import { useEffect, useRef, useState } from 'react';
import { Animated, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
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

// ---------------- Idea 04: つかまるタワー ----------------
function Idea04() {
  const CAPACITY = 3;
  const [joined, setJoined] = useState(false);
  const [pressing, setPressing] = useState(false);
  const [progressPct, setProgressPct] = useState(0);
  const progress = useRef(new Animated.Value(0)).current;
  const slide = useRef(new Animated.Value(0)).current;
  const prevJoined = useRef(joined);

  useEffect(() => {
    const id = progress.addListener(({ value }) => setProgressPct(value));
    return () => progress.removeListener(id);
  }, []);

  useEffect(() => {
    if (joined && !prevJoined.current) {
      slide.setValue(0);
      Animated.spring(slide, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 8 }).start();
    } else if (!joined) {
      slide.setValue(0);
    }
    prevJoined.current = joined;
  }, [joined]);

  const participants = joined ? [P1, P2, ME] : [P1, P2];
  const full = participants.length >= CAPACITY;
  const emptyCount = Math.max(0, CAPACITY - participants.length);

  const completedRef = useRef(false);
  const startPress = () => {
    if (joined || full) return;
    setPressing(true);
    completedRef.current = false;
    progress.setValue(0);
    Animated.timing(progress, { toValue: 1, duration: 500, useNativeDriver: false }).start(({ finished }) => {
      if (finished) {
        completedRef.current = true;
        setJoined(true);
      }
    });
  };
  const endPress = () => {
    setPressing(false);
    progress.stopAnimation();
    if (!completedRef.current) {
      Animated.timing(progress, { toValue: 0, duration: 150, useNativeDriver: false }).start();
    } else {
      progress.setValue(1);
      setTimeout(() => progress.setValue(0), 300);
    }
  };

  const slideY = slide.interpolate({ inputRange: [0, 1], outputRange: [24, 0] });
  const slideOpacity = slide.interpolate({ inputRange: [0, 0.2, 1], outputRange: [0, 1, 1] });
  const slideScale = slide.interpolate({ inputRange: [0, 1], outputRange: [0.9, 1] });

  return (
    <View style={[styles.card, { backgroundColor: C.red }]}>
      <Text numberOfLines={1} style={styles.title}>カラオケ</Text>
      <Text style={styles.time}>今日 18:30 · 駅前</Text>

      <View style={styles.towerWrap}>
        {/* host finger at top */}
        <View style={styles.hostRow}>
          <View style={styles.hostFinger}>
            <Avatar user={HOST} size={44} border={C.white} />
          </View>
          <View style={styles.hostInfo}>
            <Text style={styles.hostName}>あ</Text>
            <Text style={styles.hostSub}>主催</Text>
          </View>
        </View>

        {/* vertical connector */}
        <View style={styles.connector} />

        {/* participant rows */}
        {participants.map((u, i) => {
          const isNew = joined && u.id === ME.id && i === participants.length - 1;
          const row = (
            <View style={styles.participantRow}>
              <View style={styles.handPill}>
                <Avatar user={u} size={28} border={C.red} />
                <Text style={styles.handName}>{u.name}</Text>
                <Text style={styles.handTag}>つかまった</Text>
              </View>
            </View>
          );
          if (isNew) {
            return (
              <Animated.View key={u.id} style={{ transform: [{ translateY: slideY }, { scale: slideScale }], opacity: slideOpacity }}>
                <View style={styles.connector} />
                {row}
              </Animated.View>
            );
          }
          return (
            <View key={u.id}>
              <View style={styles.connector} />
              {row}
            </View>
          );
        })}

        {/* empty slots */}
        {Array.from({ length: emptyCount }).map((_, i) => (
          <View key={'e' + i}>
            <View style={styles.connectorDashed} />
            <View style={styles.emptySlotRow}>
              <View style={styles.emptyPill}>
                <Text style={styles.emptyText}>空き</Text>
              </View>
            </View>
          </View>
        ))}

        {/* shimekiri hand when full */}
        {full && (
          <View>
            <View style={styles.connector} />
            <View style={styles.shimekiriRow}>
              <View style={styles.shimekiriHand}>
                <Text style={styles.shimekiriText}>しめきり</Text>
              </View>
            </View>
          </View>
        )}
      </View>

      {joined && <Text style={styles.note}>つかまりました</Text>}
      {full && joined && <Text style={styles.note}>満員・締め切り</Text>}

      <View style={styles.badge}><Text style={styles.badgeText}>あと24分</Text></View>

      {!full && (
        <Pressable
          style={styles.longPressBtn}
          onPressIn={startPress}
          onPressOut={endPress}
          disabled={joined}
        >
          <View style={styles.longPressFill} pointerEvents="none">
            <View style={[styles.longPressFillInner, { width: `${progressPct * 100}%` }]} />
          </View>
          <Text style={styles.longPressText}>
            {joined ? 'つかまっています' : pressing ? 'ギュッ…' : '長押しでつかまる'}
          </Text>
        </Pressable>
      )}
      {joined && (
        <Pressable style={styles.actionBtn} onPress={() => setJoined(false)}>
          <Text style={styles.actionText}>手を離す（取り消す）</Text>
        </Pressable>
      )}
    </View>
  );
}

// ---------------- Idea 05: 指紋リング ----------------
function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const x1 = cx + r * Math.cos(toRad(startDeg));
  const y1 = cy + r * Math.sin(toRad(startDeg));
  const x2 = cx + r * Math.cos(toRad(endDeg));
  const y2 = cy + r * Math.sin(toRad(endDeg));
  const large = endDeg - startDeg > 180 ? 1 : 0;
  return `M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`;
}

function Idea05() {
  const CAPACITY = 3;
  const [joined, setJoined] = useState(false);
  const [demoFull, setDemoFull] = useState(false);
  const count = demoFull ? CAPACITY : (joined ? 3 : 2);
  const full = count >= CAPACITY;
  const K = CAPACITY;
  const segAngle = 360 / K;
  const gap = 10;
  const span = segAngle - gap;
  const cx = 90, cy = 90, r = 62;

  const yourIndex = joined && !demoFull ? 2 : (demoFull ? 2 : -1);

  return (
    <View style={[styles.card, { backgroundColor: C.surface }]}>
      <Text numberOfLines={1} style={[styles.title, { color: C.ink }]}>カラオケ</Text>
      <Text style={[styles.time, { color: C.muted }]}>今日 18:30 · 駅前</Text>

      <View style={styles.ringWrap}>
        <Svg width={180} height={180} viewBox="0 0 180 180">
          {/* base swirl guide */}
          {Array.from({ length: K }).map((_, i) => {
            const start = i * segAngle - 90;
            const end = start + span;
            const filled = i < count;
            return (
              <Path
                key={i}
                d={arcPath(cx, cy, r, start, end)}
                fill="none"
                stroke={filled ? C.red : 'rgba(0,0,0,0.12)'}
                strokeWidth={filled ? 9 : 5}
                strokeLinecap="round"
              />
            );
          })}
          {/* inner second round hint when many */}
          <Circle cx={cx} cy={cy} r={r - 18} fill="none" stroke="rgba(0,0,0,0.06)" strokeWidth={2} strokeDasharray="3 4" />
          {/* your dot */}
          {yourIndex >= 0 && (() => {
            const start = yourIndex * segAngle - 90;
            const end = start + span;
            const toRad = (d: number) => (d * Math.PI) / 180;
            const x = cx + r * Math.cos(toRad(end));
            const y = cy + r * Math.sin(toRad(end));
            return <Circle cx={x} cy={y} r={5} fill={C.ink} />;
          })()}
          {/* center mark */}
          <Circle cx={cx} cy={cy} r={6} fill={full ? C.red : C.ink} opacity={0.9} />
        </Svg>
        <Text style={styles.ringCaption}>{full ? '指紋が1つのしるしに' : `${count} / ${CAPACITY} 本`}</Text>
      </View>

      {joined && !demoFull && <Text style={[styles.note, { color: C.ink }]}>あなたの線が1本ふえた</Text>}
      {demoFull && <Text style={[styles.note, { color: C.ink }]}>満員で渦が完成</Text>}

      <View style={styles.badgeDark}><Text style={styles.badgeDarkText}>あと24分</Text></View>

      <View style={styles.actionRow}>
        <Pressable style={styles.actionBtnLight} onPress={() => setJoined(v => !v)}>
          <Text style={styles.actionTextDark}>{joined ? '取り消す' : '参加する'}</Text>
        </Pressable>
        <Pressable style={styles.actionBtnLight} onPress={() => setDemoFull(v => !v)}>
          <Text style={styles.actionTextDark}>{demoFull ? '通常に戻す' : '満員デモ'}</Text>
        </Pressable>
      </View>
    </View>
  );
}

// ---------------- Idea 06: 指タブカード ----------------
function Idea06() {
  const [joined, setJoined] = useState(false);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const members = joined ? [P1, P2, ME] : [P1, P2];
  const count = members.length;
  const fingerH = 110 + count * 22;
  const animH = useRef(new Animated.Value(110 + 2 * 22)).current;
  const prevCount = useRef(count);
  useEffect(() => {
    Animated.spring(animH, { toValue: fingerH, useNativeDriver: false, speed: 12, bounciness: 6 }).start();
    prevCount.current = count;
  }, [count]);

  const [animHVal, setAnimHVal] = useState(110 + 2 * 22);
  useEffect(() => {
    const id = animH.addListener(({ value }) => setAnimHVal(value));
    return () => animH.removeListener(id);
  }, []);

  const remainingFrac = 0.62;

  return (
    <View style={styles.fingerCardWrap} onLayout={e => setSize(e.nativeEvent.layout)}>
      {/* outer gauge */}
      <View style={StyleSheet.absoluteFill} pointerEvents="none">
        <Svg width="100%" height="100%">
          {size.width > 0 && size.height > 0 && (() => {
            const sw = 6;
            const r = RADIUS - 2;
            const w = Math.max(0, size.width - sw);
            const h = Math.max(0, size.height - sw);
            const perimeter = Math.max(0, 2 * (w + h) - 8 * r + 2 * Math.PI * r);
            const gauge = w > 2 * r && h > 2 * r ? `M ${sw / 2 + w / 2} ${sw / 2} H ${sw / 2 + w - r} A ${r} ${r} 0 0 1 ${sw / 2 + w} ${sw / 2 + r} V ${sw / 2 + h - r} A ${r} ${r} 0 0 1 ${sw / 2 + w - r} ${sw / 2 + h} H ${sw / 2 + r} A ${r} ${r} 0 0 1 ${sw / 2} ${sw / 2 + h - r} V ${sw / 2 + r} A ${r} ${r} 0 0 1 ${sw / 2 + r} ${sw / 2} Z` : '';
            return (
              <>
                <Rect x={sw / 2} y={sw / 2} width={w} height={h} rx={r} ry={r} fill="none" stroke="rgba(255,255,255,0.25)" strokeWidth={sw} />
                {!!gauge && <Path d={gauge} fill="none" stroke={C.white} strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${perimeter * remainingFrac} ${perimeter}`} strokeDashoffset={-perimeter * (1 - remainingFrac)} />}
              </>
            );
          })()}
        </Svg>
      </View>

      <Animated.View style={[styles.finger, { height: animHVal }]}>
        <Avatar user={HOST} size={44} border={C.white} />
        <Text style={styles.fingerName}>あ</Text>
      </Animated.View>

      <View style={styles.fingerBody}>
        <Text numberOfLines={1} style={styles.title}>夜ドライブ</Text>
        <Text style={styles.time}>{joined ? '参加しました · 今日 21:00' : '今日 21:00 · 駅前'}</Text>
        <View style={styles.membersRow}>
          {members.map((u, i) => (
            <View key={u.id} style={{ marginLeft: i ? -8 : 0 }}>
              <Avatar user={u} size={28} border={C.pink} />
            </View>
          ))}
          <Text style={styles.countSmall}>{count}<Text style={styles.capSmall}> / 5</Text></Text>
        </View>
        <Text style={styles.note}>{joined ? '人が集まるほど指が伸びる' : '参加者'}</Text>
      </View>

      <View style={styles.badge}><Text style={styles.badgeText}>あと24分</Text></View>

      <Pressable
        style={styles.actionBtn}
        onPress={() => setJoined(v => !v)}
      >
        <Text style={styles.actionText}>{joined ? '飛び立つ（取り消す）' : '参加する'}</Text>
      </Pressable>
    </View>
  );
}

export default function PreviewF2() {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <Text style={T.h1}>デザイン案プレビュー f2</Text>
      <Text style={T.sub}>触って動かせます。API は呼びません。</Text>
      <Section num="04" name="つかまるタワー">
        <Idea04 />
      </Section>
      <Section num="05" name="指紋リング">
        <Idea05 />
      </Section>
      <Section num="06" name="指タブカード">
        <Idea06 />
      </Section>
    </ScrollView>
  );
}

export { PreviewF2 };

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: C.bg },
  content: { padding: 16, paddingBottom: 40, gap: 20 },
  section: { gap: 10 },
  sectionTitle: { fontFamily: FONT, fontSize: 20, fontWeight: '900', color: C.ink },
  card: { borderRadius: RADIUS, padding: 20, paddingBottom: 48, minHeight: 200, overflow: 'hidden', position: 'relative' },
  title: { fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 26, lineHeight: 30 },
  time: { fontFamily: FONT, color: 'rgba(255,255,255,0.92)', fontWeight: '700', fontSize: 13 },
  badge: { position: 'absolute', right: 16, bottom: 14, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 12, height: 30, justifyContent: 'center' },
  badgeText: { fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 13 },
  note: { fontFamily: FONT, color: 'rgba(255,255,255,0.95)', fontWeight: '800', fontSize: 12, marginTop: 6 },
  actionBtn: { marginTop: 12, backgroundColor: 'rgba(255,255,255,0.2)', borderRadius: PILL, minHeight: 40, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start' },
  actionText: { fontFamily: FONT, color: C.white, fontWeight: '800', fontSize: 13 },
  // tower
  towerWrap: { marginTop: 14, gap: 0 },
  hostRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  hostFinger: { width: 52, height: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.25)', alignItems: 'center', justifyContent: 'center' },
  hostInfo: { gap: 0 },
  hostName: { fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 18 },
  hostSub: { fontFamily: FONT, color: 'rgba(255,255,255,0.8)', fontWeight: '700', fontSize: 11 },
  connector: { width: 2, height: 14, backgroundColor: 'rgba(255,255,255,0.7)', marginLeft: 25, marginVertical: 2 },
  connectorDashed: { width: 2, height: 14, borderLeftWidth: 2, borderLeftColor: 'rgba(255,255,255,0.4)', borderStyle: 'dashed', marginLeft: 25, marginVertical: 2 },
  participantRow: { marginLeft: 0 },
  handPill: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: 'rgba(255,255,255,0.92)', borderRadius: PILL, paddingHorizontal: 12, paddingVertical: 8, alignSelf: 'flex-start' },
  handName: { fontFamily: FONT, color: C.ink, fontWeight: '800', fontSize: 14 },
  handTag: { fontFamily: FONT, color: C.muted, fontWeight: '700', fontSize: 11 },
  emptySlotRow: { marginLeft: 0 },
  emptyPill: { borderWidth: 2, borderStyle: 'dashed', borderColor: 'rgba(255,255,255,0.6)', borderRadius: PILL, paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'flex-start' },
  emptyText: { fontFamily: FONT, color: 'rgba(255,255,255,0.7)', fontWeight: '800', fontSize: 12 },
  shimekiriRow: { marginLeft: 0 },
  shimekiriHand: { backgroundColor: C.ink, borderRadius: PILL, paddingHorizontal: 16, paddingVertical: 8, alignSelf: 'flex-start' },
  shimekiriText: { fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 13 },
  longPressBtn: { marginTop: 12, backgroundColor: 'rgba(255,255,255,0.18)', borderRadius: PILL, minHeight: 44, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative', alignSelf: 'flex-start', minWidth: 180 },
  longPressFill: { position: 'absolute', left: 0, top: 0, bottom: 0, width: '100%' },
  longPressFillInner: { height: '100%', backgroundColor: 'rgba(255,255,255,0.35)' },
  longPressText: { fontFamily: FONT, color: C.white, fontWeight: '800', fontSize: 13, zIndex: 1 },
  // ring
  ringWrap: { alignItems: 'center', marginTop: 12, gap: 6 },
  ringCaption: { fontFamily: FONT, color: C.ink, fontWeight: '800', fontSize: 13 },
  actionRow: { flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' },
  actionBtnLight: { backgroundColor: C.ink, borderRadius: PILL, minHeight: 40, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  actionTextDark: { fontFamily: FONT, color: C.white, fontWeight: '800', fontSize: 13 },
  badgeDark: { position: 'absolute', right: 16, bottom: 14, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 12, height: 30, justifyContent: 'center' },
  badgeDarkText: { fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 13 },
  // finger tab card
  fingerCardWrap: { position: 'relative', minHeight: 220, borderRadius: RADIUS, overflow: 'hidden', backgroundColor: C.pink, padding: 16, paddingLeft: 76 },
  finger: { position: 'absolute', left: 12, top: 8, width: 52, borderRadius: 26, backgroundColor: 'rgba(255,255,255,0.22)', alignItems: 'center', paddingTop: 10, gap: 4 },
  fingerName: { fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 14 },
  fingerBody: { gap: 6, paddingTop: 8 },
  membersRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  countSmall: { fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 18, marginLeft: 8 },
  capSmall: { fontSize: 12, fontWeight: '800', color: 'rgba(255,255,255,0.85)' },
});