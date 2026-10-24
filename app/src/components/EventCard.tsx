import { useEffect, useRef, useState } from 'react';
import { Animated, PanResponder, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import type { EventItem } from '../api';
import { Avatar } from '../ui/Avatar';
import { C, FONT, PILL, RADIUS, popColor } from '../ui/theme';

export interface EventCardProps {
  event: EventItem;
  now: number;
  onOpen: () => void;
  onJoin: () => void;
  onLeave: () => void;
  onDelete: () => void;
  onPressMembers: () => void;
  joining?: boolean;
  leaving?: boolean;
  deleting?: boolean;
}

export function EventCard({ event, now, onOpen, onJoin, onLeave, onDelete, onPressMembers, joining = false, leaving = false, deleting = false }: EventCardProps) {
  const [size, setSize] = useState({ width: 0, height: 0 });
  const offset = useRef(new Animated.Value(0)).current;
  const wobble = useRef(new Animated.Value(0)).current;
  const dragged = useRef(false);
  const dragging = useRef(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const swapped = event.is_host ? !confirmDelete && !deleting : !leaving && (event.joined || joining);
  const travel = Math.max(0, size.width - 40 - 100);
  const swap = useRef(new Animated.Value(swapped ? 1 : 0)).current;
  const canJoin = !event.joined && !event.is_host && !joining && !leaving && travel > 0 && event.count < event.capacity && event.expires_at > now;
  const canLeave = event.joined && !event.is_host && !joining && !leaving && travel > 0 && event.expires_at > now;
  const canDelete = event.is_host && !joining && !leaving && !deleting && !confirmDelete && travel > 0 && event.expires_at > now;
  const latest = useRef({ canJoin, canLeave, canDelete, onJoin, onLeave, onDelete, onOpen, travel, swapped });
  latest.current = { canJoin, canLeave, canDelete, onJoin, onLeave, onDelete, onOpen, travel, swapped };
  const settle = (right: boolean) => {
    Animated.spring(offset, { toValue: right ? latest.current.travel : 0, useNativeDriver: false, overshootClamping: true }).start();
    Animated.timing(swap, { toValue: right ? 1 : 0, duration: 240, useNativeDriver: false }).start();
  };
  // 参加・削除の処理状態は親の props を正とし、失敗時は元の位置へ戻す。
  useEffect(() => {
    if (deleting) setConfirmDelete(false);
    if (!dragging.current) settle(swapped);
  }, [swapped, travel, event, deleting]);
  // 参加できるカードのアイコンをゆらゆらさせて、スワイプで参加できることを伝える。
  // 左へ戻る（取り消し方向）は速く、右へ行く（参加方向）は遅く動く非対称の揺れ。
  useEffect(() => {
    if (!canJoin) { wobble.setValue(0); return; }
    if (typeof Animated.loop !== 'function' || typeof Animated.sequence !== 'function') {
      wobble.setValue(0);
      return;
    }
    const loop = Animated.loop(Animated.sequence([
      Animated.timing(wobble, { toValue: 1, duration: 900, useNativeDriver: true }),
      Animated.timing(wobble, { toValue: 0, duration: 250, useNativeDriver: true }),
    ]));
    loop.start();
    return () => { loop.stop(); wobble.setValue(0); };
  }, [canJoin]);
  const responder = useRef(PanResponder.create({
    // アイコン上の操作だけを受け取り、縦方向はスクロールへ譲る。
    onStartShouldSetPanResponder: () => latest.current.canJoin || latest.current.canLeave || latest.current.canDelete,
    onMoveShouldSetPanResponderCapture: (_, g) => ((latest.current.canJoin && g.dx > 8) || ((latest.current.canLeave || latest.current.canDelete) && g.dx < -8)) && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onMoveShouldSetPanResponder: (_, g) => ((latest.current.canJoin && g.dx > 8) || ((latest.current.canLeave || latest.current.canDelete) && g.dx < -8)) && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderGrant: () => { dragged.current = true; dragging.current = true; offset.stopAnimation(); },
    onPanResponderMove: (_, g) => offset.setValue(Math.max(0, Math.min((latest.current.canLeave || latest.current.canDelete ? latest.current.travel : 0) + g.dx, latest.current.travel))),
    onPanResponderRelease: (_, g) => {
      dragging.current = false;
      const horizontal = Math.abs(g.dx) > Math.abs(g.dy) * 1.5;
      const join = g.dx > latest.current.travel / 2 && horizontal && latest.current.canJoin;
      const leave = -g.dx > latest.current.travel / 2 && horizontal && latest.current.canLeave;
      const del = -g.dx > latest.current.travel / 2 && horizontal && latest.current.canDelete;
      settle(leave || del ? false : join || latest.current.swapped);
      if (del) setConfirmDelete(true);
      else if (join || leave) {
        if (leave) latest.current.onLeave(); else latest.current.onJoin();
        // 親から返る処理中・結果の props を正とする。
        requestAnimationFrame(() => settle(latest.current.swapped));
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
  const status = deleting || leaving ? '取り消し中…' : joining ? '参加中…' : event.is_host ? '主催' : event.joined ? '参加中' : event.count >= event.capacity ? '満員' : remaining === 0 ? '終了' : '';
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
          {!!gauge && <Path d={gauge} fill="none" stroke={soon ? C.yellow : C.ink} strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${perimeter * fraction} ${perimeter}`} strokeDashoffset={-perimeter * (1 - fraction)} />}
        </Svg>
      </View>
      <Animated.View style={[styles.left, { transform: [{ translateX: offset }], zIndex: 1 }]}>
        <View {...responder.panHandlers} style={Platform.OS === 'web' ? { touchAction: 'pan-y' } as ViewStyle : undefined} accessibilityLabel={`${event.host.name}のアイコン。${canJoin ? '右へスワイプで参加' : canLeave ? '左へスワイプで参加を取り消す' : canDelete ? '左へスワイプで掲示を取り消す' : status}`}>
          <Animated.View style={[styles.host, { transform: [{ translateX: wobble.interpolate({ inputRange: [0, 1], outputRange: [0, 14] }) }] }]}>
            <Svg width={100} height={100} style={StyleSheet.absoluteFill} viewBox="0 0 100 100">
              <Circle cx={50} cy={50} r={ringR} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={8} />
              <Path d="M 50 6 A 44 44 0 0 1 50 94 A 44 44 0 0 1 50 6" fill="none" stroke={C.white} strokeWidth={8} strokeLinecap="round" strokeDasharray={`${ring * Math.min(1, event.count / event.capacity)} ${ring}`} />
            </Svg>
            <Avatar user={event.host} size={76} />
          </Animated.View>
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
      <View style={[styles.badge, soon && { backgroundColor: C.yellow }]}>
        <Svg width={12} height={12} viewBox="0 0 24 24"><Circle cx={12} cy={12} r={9} stroke={soon ? C.ink : C.white} strokeWidth={2.5} fill="none" /><Path d="M12 7 V12 L15 14" stroke={soon ? C.ink : C.white} strokeWidth={2.5} fill="none" /></Svg>
        <Text style={[styles.badgeText, soon && { color: C.ink }]}>あと{mins}分</Text>
      </View>
      {confirmDelete && !deleting && <View accessibilityRole="alert" style={[styles.confirm, { backgroundColor: bg }]}>
        <Text style={styles.confirmTitle}>掲示を取り消しますか？</Text>
        <View style={styles.confirmActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="掲示を取り消す" onPress={e => { e.stopPropagation(); onDelete(); }} style={[styles.confirmButton, styles.confirmDanger]}><Text style={styles.confirmDangerText}>取り消す</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="掲示の取り消しをやめる" onPress={e => { e.stopPropagation(); setConfirmDelete(false); }} style={[styles.confirmButton, styles.confirmCancel]}><Text style={styles.confirmCancelText}>やめる</Text></Pressable>
        </View>
      </View>}
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
  status: { position: 'absolute', left: 16, bottom: 14, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: PILL, paddingHorizontal: 12, height: 30, justifyContent: 'center' },
  statusText: { fontFamily: FONT, color: C.white, fontWeight: '800', fontSize: 12 },
  confirm: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 3, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 12 },
  confirmTitle: { fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 20, lineHeight: 26, textAlign: 'center' },
  confirmActions: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  confirmButton: { minWidth: 96, minHeight: 44, borderRadius: PILL, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  confirmDanger: { backgroundColor: C.ink },
  confirmDangerText: { fontFamily: FONT, color: C.white, fontWeight: '800', fontSize: 15 },
  confirmCancel: { backgroundColor: C.white },
  confirmCancelText: { fontFamily: FONT, color: C.ink, fontWeight: '800', fontSize: 15 },
});
