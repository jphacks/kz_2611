import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { EventItem } from '../api';
import { Avatar } from '../ui/Avatar';
import { C, FONT, RADIUS, popColor } from '../ui/theme';

export interface EventCardProps {
  event: EventItem;
  now: number;
  onOpen: () => void;
  onJoin: () => void;
  onPressMembers: () => void;
  joining?: boolean;
}

export function EventCard({ event, now, onOpen, onJoin, onPressMembers, joining = false }: EventCardProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const offset = useRef(new Animated.Value(0)).current;
  const dragged = useRef(false);
  const dragging = useRef(false);
  const swapped = !event.is_host && (event.joined || joining);
  const travel = Math.max(0, size.width - 40 - 100);
  const swap = useRef(new Animated.Value(swapped ? 1 : 0)).current;
  const canJoin = !event.joined && !event.is_host && !joining && travel > 0 && event.count < event.capacity && event.expires_at > now;
  const latest = useRef({ canJoin, onJoin, onOpen, travel, swapped });
  latest.current = { canJoin, onJoin, onOpen, travel, swapped };
  const settle = (right: boolean) => {
    Animated.spring(offset, { toValue: right ? latest.current.travel : 0, useNativeDriver: false, overshootClamping: true }).start();
    Animated.timing(swap, { toValue: right ? 1 : 0, duration: 240, useNativeDriver: false }).start();
  };
  // 参加結果は親の props を正とし、失敗時は左へ戻す。処理中は右端を保つ。
  useEffect(() => {
    if (!dragging.current) settle(swapped);
  }, [swapped, travel, event]);
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => latest.current.canJoin,
    onMoveShouldSetPanResponder: (_, g) => latest.current.canJoin && g.dx > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderGrant: () => { dragged.current = true; dragging.current = true; offset.stopAnimation(); },
    onPanResponderMove: (_, g) => offset.setValue(Math.max(0, Math.min(g.dx, latest.current.travel))),
    onPanResponderRelease: (_, g) => {
      dragging.current = false;
      const join = g.dx > latest.current.travel / 2 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5 && latest.current.canJoin;
      settle(join || latest.current.swapped);
      if (join) {
        latest.current.onJoin();
        // joining を返さない親でも、次の描画で参加結果に合わせる。
        requestAnimationFrame(() => { if (!latest.current.swapped) settle(false); });
      } else if (Math.abs(g.dx) < 8 && Math.abs(g.dy) < 8) latest.current.onOpen();
      // スワイプ直後にカードのタップとして扱わない。
      setTimeout(() => { dragged.current = false; }, 200);
    },
    onPanResponderTerminationRequest: () => true,
    onPanResponderTerminate: () => {
      dragging.current = false;
      settle(latest.current.swapped);
      setTimeout(() => { dragged.current = false; }, 200);
    },
  })).current;

  const remaining = Math.max(0, event.expires_at - now);
  const fraction = Math.min(1, remaining / (event.duration_min * 60_000));
  const soon = remaining <= 600_000;
  const bg = popColor(event.title);
  const r = RADIUS - 2, sw = 6;
  const w = Math.max(0, size.width - sw), h = Math.max(0, size.height - sw);
  const perimeter = Math.max(0, 2 * (w + h) - 8 * r + 2 * Math.PI * r);
  // 上辺の中央から時計回りに減っていく残り時間のゲージ
  const gauge = w > 2 * r && h > 2 * r ? `M ${sw / 2 + w / 2} ${sw / 2} H ${sw / 2 + w - r} A ${r} ${r} 0 0 1 ${sw / 2 + w} ${sw / 2 + r} V ${sw / 2 + h - r} A ${r} ${r} 0 0 1 ${sw / 2 + w - r} ${sw / 2 + h} H ${sw / 2 + r} A ${r} ${r} 0 0 1 ${sw / 2} ${sw / 2 + h - r} V ${sw / 2 + r} A ${r} ${r} 0 0 1 ${sw / 2 + r} ${sw / 2} Z` : '';
  const ringR = 44, ring = 2 * Math.PI * ringR;
  const minimum = event.capacity_min;
  const capacity = minimum && minimum !== event.capacity ? `${minimum}〜${event.capacity}` : `${event.capacity}`;
  const mins = Math.ceil(remaining / 60_000);
  const status = joining ? '参加中…' : event.is_host ? '主催' : event.joined ? '参加中' : event.count >= event.capacity ? '満員' : remaining === 0 ? '終了' : '';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${event.title}、${event.count} / ${capacity}人、あと${mins}分。チャットを開く`}
      onPress={() => { if (!dragged.current) onOpen(); }}
      onLayout={e => {
        const layout = e.nativeEvent.layout;
        if (!size.width) offset.setValue(swapped ? Math.max(0, layout.width - 140) : 0);
        setSize(layout);
      }} style={({ pressed }) => [styles.card, { backgroundColor: bg, transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Rect x={sw / 2} y={sw / 2} width={w} height={h} rx={r} ry={r} fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth={sw} />
          {!!gauge && <Path d={gauge} fill="none" stroke={soon ? C.yellow : C.white} strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${perimeter * fraction} ${perimeter}`} strokeDashoffset={-perimeter * (1 - fraction)} />}
        </Svg>
      </View>
      <Animated.View style={[styles.left, { transform: [{ translateX: offset }], zIndex: 1 }]}>
        <View {...responder.panHandlers} accessibilityLabel={`${event.host.name}のアイコン。${canJoin ? '右へスワイプで参加' : status}`}>
          <View style={styles.host}>
            <Svg width={100} height={100} style={StyleSheet.absoluteFill} viewBox="0 0 100 100">
              <Circle cx={50} cy={50} r={ringR} fill="none" stroke="rgba(0,0,0,0.18)" strokeWidth={8} />
              <Path d="M 50 6 A 44 44 0 0 1 50 94 A 44 44 0 0 1 50 6" fill="none" stroke={C.white} strokeWidth={8} strokeLinecap="round" strokeDasharray={`${ring * Math.min(1, event.count / event.capacity)} ${ring}`} />
            </Svg>
            <Avatar user={event.host} size={76} />
          </View>
        </View>
        <Text numberOfLines={1} style={styles.hostName}>{event.host.name}</Text>
      </Animated.View>
      <Animated.View style={[styles.details, { transform: [{ translateX: swap.interpolate({ inputRange: [0, 1], outputRange: [0, -116] }) }] }]}>
        <Text numberOfLines={2} style={styles.title}>{event.title}</Text>
        <Text numberOfLines={1} style={styles.time}>{event.time_text || '時間は相談'}{event.place ? ` · ${event.place}` : ''}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`${event.count}人の参加者を見る`} hitSlop={8} onPress={e => { e.stopPropagation(); onPressMembers(); }} style={styles.members}>
          <View style={{ flexDirection: 'row' }}>
            {event.members.slice(0, 3).map((u, i) => <View key={u.id} style={{ marginLeft: i ? -8 : 0 }}><Avatar user={u} size={28} border={bg} /></View>)}
          </View>
          <Text style={styles.count}>{event.count}<Text style={styles.cap}> / {capacity}</Text></Text>
        </Pressable>
      </Animated.View>
      {!!status && <View style={styles.status}><Text style={styles.statusText}>{status}</Text></View>}
      {canJoin && <Text style={styles.hint}>→ スワイプで参加</Text>}
      <View style={[styles.badge, soon && { backgroundColor: C.yellow }]}>
        <Svg width={12} height={12} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={9} stroke={soon ? C.ink : C.white} strokeWidth={2.5} fill="none" /><Path d="M12 7 V12 L15 14" stroke={soon ? C.ink : C.white} strokeWidth={2.5} fill="none" /></Svg>
        <Text style={[styles.badgeText, soon && { color: C.ink }]}>あと{mins}分</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: RADIUS, marginBottom: 14, minHeight: 176, padding: 20, paddingBottom: 48, flexDirection: 'row', gap: 16, overflow: 'hidden' },
  left: { width: 100, alignItems: 'center' },
  host: { width: 100, height: 100, alignItems: 'center', justifyContent: 'center' },
  hostName: { fontFamily: FONT, color: C.white, fontWeight: '800', fontSize: 12, marginTop: 6 },
  details: { flex: 1, minWidth: 0, paddingTop: 8 },
  title: { fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 28, lineHeight: 34 },
  time: { fontFamily: FONT, color: 'rgba(255,255,255,0.92)', fontWeight: '700', fontSize: 14, marginTop: 4 },
  members: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 44, alignSelf: 'flex-start', marginTop: 6 },
  count: { fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 22 },
  cap: { fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.85)' },
  badge: { position: 'absolute', right: 16, bottom: 14, flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: C.ink, borderRadius: 999, paddingHorizontal: 12, height: 30 },
  badgeText: { fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 13 },
  status: { position: 'absolute', left: 16, bottom: 14, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: 999, paddingHorizontal: 12, height: 30, justifyContent: 'center' },
  statusText: { fontFamily: FONT, color: C.white, fontWeight: '800', fontSize: 12 },
  hint: { position: 'absolute', left: 20, bottom: 20, fontFamily: FONT, color: 'rgba(255,255,255,0.85)', fontWeight: '800', fontSize: 11 },
});
