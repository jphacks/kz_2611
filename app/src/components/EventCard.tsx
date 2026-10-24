import { useRef, useState } from 'react';
import { Animated, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Circle, Rect } from 'react-native-svg';
import type { EventItem } from '../api';
import { Avatar } from '../ui/Avatar';
import { C, T } from '../ui/theme';

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
  const canJoin = !event.joined && !event.is_host && !joining && event.count < event.capacity && event.expires_at > now;
  const latest = useRef({ canJoin, onJoin, onOpen });
  latest.current = { canJoin, onJoin, onOpen };
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => latest.current.canJoin,
    onMoveShouldSetPanResponder: (_, g) => latest.current.canJoin && g.dx > 8 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5,
    onPanResponderGrant: () => { dragged.current = true; },
    onPanResponderMove: (_, g) => offset.setValue(Math.max(0, Math.min(g.dx, 100))),
    onPanResponderRelease: (_, g) => {
      if (g.dx >= 64 && Math.abs(g.dx) > Math.abs(g.dy) * 1.5 && latest.current.canJoin) latest.current.onJoin();
      else if (Math.abs(g.dx) < 8 && Math.abs(g.dy) < 8) latest.current.onOpen();
      Animated.spring(offset, { toValue: 0, useNativeDriver: false }).start();
      // スワイプ直後にカードのタップとして扱わない。
      setTimeout(() => { dragged.current = false; }, 200);
    },
    onPanResponderTerminate: () => {
      offset.setValue(0);
      dragged.current = false;
    },
  })).current;
  const remaining = Math.max(0, event.expires_at - now);
  const fraction = Math.min(1, remaining / (event.duration_min * 60_000));
  const perimeter = Math.max(0, 2 * (size.width + size.height - 6));
  const ring = 2 * Math.PI * 43;
  const status = joining ? '参加中…' : event.is_host ? '主催しています' : event.joined ? '参加済み' : event.count >= event.capacity ? '満員' : remaining === 0 ? '募集終了' : '右へスワイプで参加';
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`${event.title}、${event.count}/${event.capacity}人、あと${Math.ceil(remaining / 60_000)}分。チャットを開く`}
      onPress={() => { if (!dragged.current) onOpen(); }}
      onLayout={e => setSize(e.nativeEvent.layout)} style={styles.card}>
      <View pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Svg width="100%" height="100%">
          <Rect x={1.5} y={1.5} width={Math.max(0, size.width - 3)} height={Math.max(0, size.height - 3)} fill="none" stroke={C.line} strokeWidth={3} />
          <Rect x={1.5} y={1.5} width={Math.max(0, size.width - 3)} height={Math.max(0, size.height - 3)} fill="none" stroke={remaining <= 600_000 ? C.red : C.ink} strokeWidth={3} strokeDasharray={`${perimeter * fraction} ${perimeter}`} />
        </Svg>
      </View>
      <View style={styles.left}>
        <Animated.View {...responder.panHandlers} style={{ transform: [{ translateX: offset }] }} accessibilityLabel={`${event.host.name}のアイコン。${status}`}>
          <View style={styles.host}>
            <Svg width={94} height={94} style={StyleSheet.absoluteFill} viewBox="0 0 94 94">
              <Circle cx={47} cy={47} r={43} fill="none" stroke={C.line} strokeWidth={6} />
              <Circle cx={47} cy={47} r={43} fill="none" stroke={C.red} strokeWidth={6} strokeLinecap="round" strokeDasharray={`${ring * Math.min(1, event.count / event.capacity)} ${ring}`} rotation={-90} origin="47,47" />
            </Svg>
            <Avatar user={event.host} size={76} />
          </View>
        </Animated.View>
        <Text numberOfLines={1} style={[T.small, { color: C.ink, marginTop: 5 }]}>{event.host.name}</Text>
      </View>
      <View style={styles.details}>
        <Text numberOfLines={2} style={[T.h1, { fontSize: 26, lineHeight: 32 }]}>{event.title}</Text>
        <Text numberOfLines={1} style={[T.sub, { marginTop: 3 }]}>{event.time_text || '時間は相談'}{event.place ? ` · ${event.place}` : ''}</Text>
        <Pressable accessibilityRole="button" accessibilityLabel={`${event.count}人の参加者を見る`} onPress={e => { e.stopPropagation(); onPressMembers(); }} style={styles.members}>
          <View style={{ flexDirection: 'row' }}>
            {event.members.slice(0, 3).map((u, i) => <View key={u.id} style={{ marginLeft: i ? -5 : 0 }}><Avatar user={u} size={25} border={C.surface} /></View>)}
          </View>
          <Text style={[T.body, { fontWeight: '900' }]}>{event.count}<Text style={T.small}>/{event.capacity}</Text></Text>
        </Pressable>
        <View style={styles.time}><Text style={T.small}>あと</Text><Text style={[T.huge, { lineHeight: 58 }]}>{Math.ceil(remaining / 60_000)}</Text><Text style={[T.small, { marginBottom: 5 }]}>分</Text></View>
      </View>
      <Text style={[T.small, styles.hint]}>{status}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { backgroundColor: C.surface, marginBottom: 12, minHeight: 208, padding: 18, paddingBottom: 25, flexDirection: 'row', gap: 16, overflow: 'hidden' },
  left: { width: 94, alignItems: 'center', justifyContent: 'center' },
  host: { width: 94, height: 94, alignItems: 'center', justifyContent: 'center' },
  details: { flex: 1, minWidth: 0 },
  members: { flexDirection: 'row', alignItems: 'center', gap: 7, minHeight: 36, alignSelf: 'flex-start', paddingVertical: 4 },
  time: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'baseline', gap: 3 },
  hint: { position: 'absolute', bottom: 9, left: 18, fontSize: 10 },
});
