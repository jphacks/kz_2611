import { memo, useEffect, useRef, useState, type ComponentProps } from 'react';
import { Image, PanResponder, Platform, Pressable, StyleSheet, Text, View, type ViewStyle } from 'react-native';
import Svg, { Circle, G, Path, Rect, Text as SvgText } from 'react-native-svg';
import { useClock } from '../hooks/useClock';
import type { EventItem } from '../api';
import { Avatar } from '../ui/Avatar';
import { C, FONT, PILL } from '../ui/theme';
import { crossesCommit, fingerProgress, fingerTravel } from './board/fingerGesture';

export interface EventCardProps {
  event: EventItem;
  onOpen: (event: EventItem) => void;
  onJoin: (event: EventItem) => void;
  onLeave: (event: EventItem) => void;
  onDelete: (event: EventItem) => void;
  onPressMembers: (event: EventItem) => void;
  joining?: boolean;
  leaving?: boolean;
  deleting?: boolean;
}

// 見た目はプレビュー X6 のカードから。数値は X6 のコードのまま。
const CARD_RADIUS = 27;
const CARD_ASPECT = 660 / 580;
const FINGER_SHIFT = 64;
const LIME = '#E5FF56';
const TRACK = '#FFFFFF33';
const LIVE = '#B2B2B2';
const BIRDS = [
  require('./celebration/bird_black.png'),
  require('./celebration/bird_orange.png'),
  require('./celebration/bird_blue.png'),
  require('./celebration/bird_pink.png'),
];
const HAND_PATH = 'M-140 255 H64 V310 H-140 M88 239 H120 Q148 239 148 267 V295 Q148 323 120 323 H88 Q57 323 57 295 V267 Q57 239 88 239Z';

export const EventCard = memo(function EventCard({ event, onOpen, onJoin, onLeave, onDelete, onPressMembers, joining = false, leaving = false, deleting = false }: EventCardProps) {
  const now = Date.now();
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [progress, setProgress] = useState<number>(event.is_host || event.joined || joining ? 1 : 0);
  const dragging = useRef(false);
  const dragged = useRef(false);
  const start = useRef<0 | 1>(event.joined || joining ? 1 : 0);
  const travelled = fingerTravel(size.width);
  // SVG の演出と同じ比率で上部情報も幅に合わせ、2行タイトルを収める。
  const infoScale = (size.width || 358) / 358;
  // 参加・取り消し・削除の処理状態は親の props を正とし、失敗したら元の位置へ戻す。
  const touched = event.is_host ? !confirmDelete && !deleting : !leaving && (event.joined || joining);
  const canJoin = !event.joined && !event.is_host && !joining && !leaving && travelled > 0 && event.count < event.capacity && event.expires_at > now;
  const canLeave = event.joined && !event.is_host && !joining && !leaving && travelled > 0 && event.expires_at > now;
  const canDelete = event.is_host && !joining && !leaving && !deleting && !confirmDelete && travelled > 0 && event.expires_at > now;
  const latest = useRef({ canJoin, canLeave, canDelete, touched, width: size.width, event, onJoin, onLeave, onDelete, onOpen });
  latest.current = { canJoin, canLeave, canDelete, touched, width: size.width, event, onJoin, onLeave, onDelete, onOpen };
  useEffect(() => {
    if (deleting) setConfirmDelete(false);
    if (!dragging.current) setProgress(touched ? 1 : 0);
  }, [touched, deleting]);
  const responder = useRef(PanResponder.create({
    onStartShouldSetPanResponder: () => latest.current.canJoin || latest.current.canLeave || latest.current.canDelete,
    // 縦スクロールを邪魔せず、参加は右・取り消しは左の横移動だけを受け取る。
    onMoveShouldSetPanResponderCapture: (_, g) => shouldCapture(g, latest.current),
    onMoveShouldSetPanResponder: (_, g) => shouldCapture(g, latest.current),
    onPanResponderGrant: () => {
      dragged.current = true;
      dragging.current = true;
      start.current = latest.current.touched ? 1 : 0;
    },
    onPanResponderMove: (_, g) => {
      // 主催のカードは指を動かさない（左スワイプは離したときに確認を出す）。
      if (!latest.current.canJoin && !latest.current.canLeave) return;
      if (Math.abs(g.dx) < Math.abs(g.dy)) return;
      setProgress(fingerProgress(start.current, g.dx, latest.current.width));
    },
    onPanResponderRelease: (_, g) => {
      dragging.current = false;
      const horizontal = Math.abs(g.dx) > Math.abs(g.dy) * 1.5;
      const commit = horizontal && crossesCommit(g.dx, latest.current.width);
      const tap = Math.abs(g.dx) < 8 && Math.abs(g.dy) < 8;
      if (latest.current.canDelete) {
        if (commit && g.dx < 0) setConfirmDelete(true);
        else if (tap) latest.current.onOpen(latest.current.event);
        setProgress(latest.current.touched ? 1 : 0);
      } else if (latest.current.canJoin) {
        if (commit && g.dx > 0) {
          setProgress(1);
          latest.current.onJoin(latest.current.event);
        } else {
          setProgress(0);
          if (tap) latest.current.onOpen(latest.current.event);
        }
      } else if (latest.current.canLeave) {
        if (commit && g.dx < 0) {
          setProgress(0);
          latest.current.onLeave(latest.current.event);
        } else {
          setProgress(1);
          if (tap) latest.current.onOpen(latest.current.event);
        }
      } else if (tap) latest.current.onOpen(latest.current.event);
      // スワイプ直後にカードのタップとして扱わない。
      setTimeout(() => { dragged.current = false; }, 200);
    },
    onPanResponderTerminationRequest: () => true,
    onPanResponderTerminate: () => {
      dragging.current = false;
      setProgress(latest.current.touched ? 1 : 0);
      setTimeout(() => { dragged.current = false; }, 200);
    },
  })).current;
  const minimum = event.capacity_min;
  const capacity = minimum && minimum !== event.capacity ? `${minimum}〜${event.capacity}` : `${event.capacity}`;
  const remaining = Math.max(0, event.expires_at - now);
  const status = deleting || leaving ? '取り消し中…' : joining ? '参加中…' : !event.joined && !event.is_host && event.count >= event.capacity ? '満員' : !event.joined && !event.is_host && remaining === 0 ? '終了' : '';
  // 主催者は「参加済み」ではないので、参加後の演出（WELCOME・鳥・自分/主催者）は出さない。
  const joinedView = event.joined && !event.is_host;
  const badge = event.is_host ? '● HOST / 主催' : event.joined ? '● JOINED / 参加しました' : joining ? '● JOINING / 参加中…' : '● LIVE / 参加受付中';
  const instruction = event.is_host ? '← 左へスワイプで掲示を取り消し' : event.joined ? '← 左へ戻すと取り消し' : '指を右へスライド →';
  return (
    <EventCardSurface event={event} capacity={capacity}
      onPress={() => { if (!dragged.current) onOpen(event); }}
      onLayout={e => setSize(e.nativeEvent.layout)}
      style={({ pressed }) => [styles.card, { transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
      <EventExpiryGauge event={event} size={size} />
      <Svg width="100%" height="100%" viewBox="0 0 660 580" style={StyleSheet.absoluteFill} pointerEvents="none">
        <SvgLabel x={624} y={40} size={18} anchor="end" fill={event.is_host || event.joined ? LIME : LIVE}>{badge}</SvgLabel>
        {!event.joined && !event.is_host && progress > 0 && <G>
          <Circle cx={330} cy={368} r={12 + progress * 37} stroke={LIME} strokeWidth={2 + progress * 4} fill={LIME} fillOpacity={progress * 0.3} />
          {/* X6 は x242 y210。390px では人数の行に重なるので、X6 の見え方を保ったまま人数の下へずらす */}
          <SvgLabel x={242} y={240} size={22} fill={LIME}>{progress > 0.7 ? 'もうすぐ…！' : '近づいてる…'}</SvgLabel>
        </G>}
        {joinedView && <G opacity={0.17}>{[0, 1, 2, 3, 4, 5, 6, 7].map(i => <Path key={i} d="M330 280 L290 -100 L370 -100 Z" fill={C.white} transform={`rotate(${i * 45} 330 280)`} />)}</G>}
        {joinedView && <G>
          <SvgLabel x={330} y={300} size={52} fill={LIME} anchor="middle">WELCOME!!</SvgLabel>
          <SvgLabel x={330} y={332} size={22} anchor="middle">{event.count}人で集まりました</SvgLabel>
          <SvgLabel x={36} y={446} size={16}>自分</SvgLabel>
          <SvgLabel x={624} y={446} size={16} anchor="end">主催者</SvgLabel>
          <SvgLabel x={330} y={446} size={18} anchor="middle" fill={C.white}>♥</SvgLabel>
        </G>}
        <G transform="translate(0 103)">
          <Hand x={progress * FINGER_SHIFT + (progress > 0.7 && !event.joined ? Math.sin(progress * 160) * 3 : 0)} ghost={!touched} />
          <Hand x={-progress * FINGER_SHIFT} flip />
          {(event.joined || event.is_host) && <G stroke={LIME} strokeWidth={7}>
            <Circle cx={330} cy={265} r={14} fill={LIME} />
            <Path d="M330 220 V198 M330 310 V332 M288 235 L270 217 M372 235 L390 217 M288 295 L270 313 M372 295 L390 313" />
          </G>}
        </G>
        <Rect x={36} y={470} width={588} height={5} rx={3} fill={TRACK} />
        <Rect x={36} y={470} width={Math.max(5, 588 * progress)} height={5} rx={3} fill={LIME} />
        {!status && <SvgLabel x={36} y={520} size={20} fill={event.joined ? C.white : event.is_host ? C.white : C.red}>{instruction}</SvgLabel>}
        <EventTimeLabel event={event} />
      </Svg>
      <View pointerEvents="box-none" style={scaleInfo(styles.info, infoScale)}>
        <View style={scaleInfo(styles.hostCol, infoScale)}>
          <View style={scaleInfo(styles.hostWrap, infoScale)}>
            <Svg width={88 * infoScale} height={88 * infoScale} viewBox="0 0 100 100" style={StyleSheet.absoluteFill}>
              <Circle cx={50} cy={50} r={44} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={8} />
              <Path d="M 50 6 A 44 44 0 0 1 50 94 A 44 44 0 0 1 50 6" fill="none" stroke={C.white} strokeWidth={8} strokeLinecap="round" strokeDasharray={`${2 * Math.PI * 44 * Math.min(1, event.count / event.capacity)} ${2 * Math.PI * 44}`} />
            </Svg>
            <View style={scaleInfo(styles.hostPhoto, infoScale)}><Avatar user={event.host} size={76 * infoScale} /></View>
          </View>
          <Text numberOfLines={1} style={scaleInfo(styles.hostName, infoScale)}>{event.host.name}</Text>
        </View>
        <View style={scaleInfo(styles.details, infoScale)}>
          <Text numberOfLines={2} style={scaleInfo(styles.title, infoScale)}>{event.title}</Text>
          <Text numberOfLines={1} style={scaleInfo(styles.time, infoScale)}>{event.time_text || '時間は相談'}{event.place ? ` · ${event.place}` : ''}</Text>
          <Pressable accessibilityRole="button" accessibilityLabel={`${event.count}人の参加者を見る`} hitSlop={Math.max(8, (44 - 28 * infoScale) / 2)} onPress={e => { e.stopPropagation(); onPressMembers(event); }} style={scaleInfo(styles.members, infoScale)}>
            <View style={styles.avatarRow}>
              {event.members.slice(0, 3).map((u, i) => <View key={u.id} style={i ? styles.memberOverlap : undefined}><Avatar user={u} size={28 * infoScale} border={C.ink} /></View>)}
            </View>
            <Text style={scaleInfo(styles.count, infoScale)}>{event.count}<Text style={scaleInfo(styles.cap, infoScale)}> / {capacity}</Text></Text>
          </Pressable>
        </View>
      </View>
      {joinedView && <View pointerEvents="none" style={styles.birds}>
        {BIRDS.map((bird, i) => <Image key={i} source={bird} style={[styles.bird, { left: `${10 + i * 24}%`, transform: [{ scaleX: i % 2 ? -1 : 1 }] }]} />)}
      </View>}
      <View {...responder.panHandlers} style={[styles.gesture, Platform.OS === 'web' ? ({ touchAction: 'pan-y' } as ViewStyle) : undefined]}
        accessibilityLabel={`${event.host.name}のカード。${canJoin ? '右へスワイプで参加' : canLeave ? '左へスワイプで参加を取り消す' : canDelete ? '左へスワイプで掲示を取り消す' : status}`}>
      </View>
      {!!status && <View style={styles.status}><Text style={styles.statusText}>{status}</Text></View>}
      {confirmDelete && !deleting && <View accessibilityRole="alert" onStartShouldSetResponder={() => true} style={styles.confirm}>
        <Text style={styles.confirmTitle}>掲示を取り消しますか？</Text>
        <View style={styles.confirmActions}>
          <Pressable accessibilityRole="button" accessibilityLabel="掲示を取り消す" onPress={e => { e.stopPropagation(); onDelete(event); }} style={[styles.confirmButton, styles.confirmDanger]}><Text style={styles.confirmDangerText}>取り消す</Text></Pressable>
          <Pressable accessibilityRole="button" accessibilityLabel="掲示の取り消しをやめる" onPress={e => { e.stopPropagation(); setConfirmDelete(false); }} style={[styles.confirmButton, styles.confirmCancel]}><Text style={styles.confirmCancelText}>やめる</Text></Pressable>
        </View>
      </View>}
    </EventCardSurface>
  );
});

function shouldCapture(g: { dx: number; dy: number }, state: { canJoin: boolean; canLeave: boolean; canDelete: boolean }) {
  if (Math.abs(g.dx) <= Math.abs(g.dy) * 1.5) return false;
  if (state.canJoin && g.dx > 8) return true;
  if ((state.canLeave || state.canDelete) && g.dx < -8) return true;
  return false;
}

function Hand({ x = 0, flip = false, ghost = false }: { x?: number; flip?: boolean; ghost?: boolean }) {
  return (
    <G transform={`translate(${x} 0)${flip ? ' translate(660 0) scale(-1 1)' : ''}`} fill={C.ink} stroke={flip ? C.white : C.red} strokeWidth={5} strokeLinecap="round" strokeLinejoin="round" strokeDasharray={ghost ? '8 7' : undefined}>
      <Path d={HAND_PATH} />
      <Path d="M128 248 H250 A16 16 0 0 1 250 281 H111" />
      <Rect x={108} y={281} width={62} height={20} rx={10} />
      <Rect x={108} y={301} width={55} height={20} rx={10} />
      <Rect x={70} y={260} width={62} height={20} rx={10} />
    </G>
  );
}

function SvgLabel({ x, y, size = 22, fill = C.white, anchor, children }: { x: number; y: number; size?: number; fill?: string; anchor?: 'start' | 'middle' | 'end'; children: React.ReactNode }) {
  return <SvgText x={x} y={y} textAnchor={anchor} fontFamily={FONT} fontWeight="900" fontSize={size} fill={fill}>{children}</SvgText>;
}

// 読み上げ用の残り時間も局所更新し、静的な children は作り直さない。
function EventCardSurface({ event, capacity, ...props }: ComponentProps<typeof Pressable> & { event: EventItem; capacity: string }) {
  const now = useClock();
  const mins = Math.ceil(Math.max(0, event.expires_at - now) / 60_000);
  return <Pressable {...props} accessibilityRole="button" accessibilityLabel={`${event.title}、${event.count} / ${capacity}人、あと${mins}分。チャットを開く`} />;
}

function EventTimeLabel({ event }: { event: EventItem }) {
  const now = useClock();
  const remaining = Math.max(0, event.expires_at - now);
  const mins = Math.ceil(remaining / 60_000);
  return <G>
    <Rect x={478} y={495} width={146} height={40} rx={20} fill={C.ink} />
    <SvgLabel x={495} y={523} size={22}>あと{mins}分</SvgLabel>
  </G>;
}

function EventExpiryGauge({ event, size }: { event: EventItem; size: { width: number; height: number } }) {
  const now = useClock();
  const remaining = Math.max(0, event.expires_at - now);
  const fraction = Math.min(1, remaining / (event.duration_min * 60_000));
  const soon = remaining <= 600_000;
  const r = CARD_RADIUS - 2, sw = 6;
  const w = Math.max(0, size.width - sw), h = Math.max(0, size.height - sw);
  const perimeter = Math.max(0, 2 * (w + h) - 8 * r + 2 * Math.PI * r);
  // 上辺の中央から時計回りに減っていく残り時間のゲージ。X6 の黒いカードに合わせて黒で描き、締切が近いと黄になる。
  const gauge = w > 2 * r && h > 2 * r ? `M ${sw / 2 + w / 2} ${sw / 2} H ${sw / 2 + w - r} A ${r} ${r} 0 0 1 ${sw / 2 + w} ${sw / 2 + r} V ${sw / 2 + h - r} A ${r} ${r} 0 0 1 ${sw / 2 + w - r} ${sw / 2 + h} H ${sw / 2 + r} A ${r} ${r} 0 0 1 ${sw / 2} ${sw / 2 + h - r} V ${sw / 2 + r} A ${r} ${r} 0 0 1 ${sw / 2 + r} ${sw / 2} Z` : '';
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      <Svg width="100%" height="100%">
        <Rect x={sw / 2} y={sw / 2} width={w} height={h} rx={r} ry={r} fill="none" stroke="rgba(0,0,0,0.10)" strokeWidth={sw} />
        {!!gauge && <Path d={gauge} fill="none" stroke={soon ? C.yellow : C.ink} strokeWidth={sw} strokeLinecap="round" strokeDasharray={`${perimeter * fraction} ${perimeter}`} strokeDashoffset={-perimeter * (1 - fraction)} />}
      </Svg>
    </View>
  );
}

// flex は比率なので変えない。それ以外の数値はカード内の位置・大きさ。
function scaleInfo<T extends object>(style: T, scale: number): T {
  return Object.fromEntries(Object.entries(style).map(([key, value]) =>
    [key, typeof value === 'number' && key !== 'flex' ? value * scale : value])) as T;
}

const styles = StyleSheet.create({
  card: { borderRadius: CARD_RADIUS, marginBottom: 14, aspectRatio: CARD_ASPECT, backgroundColor: C.ink, overflow: 'hidden' },
  info: { position: 'absolute', top: 0, left: 0, right: 0, flexDirection: 'row', gap: 14, paddingHorizontal: 18, paddingTop: 16 },
  hostCol: { width: 88, alignItems: 'center' },
  hostWrap: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
  hostPhoto: { position: 'absolute', left: 6, top: 6 },
  hostName: { fontFamily: FONT, color: C.white, fontWeight: '800', fontSize: 12, marginTop: 5, maxWidth: 88, textAlign: 'center' },
  details: { flex: 1, minWidth: 0, paddingTop: 6 },
  title: { fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 22, lineHeight: 26, letterSpacing: -1 },
  time: { fontFamily: FONT, color: 'rgba(255,255,255,0.92)', fontWeight: '700', fontSize: 12, lineHeight: 16, marginTop: 4 },
  members: { flexDirection: 'row', alignItems: 'center', gap: 8, minHeight: 28, marginTop: 4, alignSelf: 'flex-start' },
  avatarRow: { flexDirection: 'row', alignItems: 'center' },
  memberOverlap: { marginLeft: -8 },
  count: { fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 22 },
  cap: { fontSize: 14, fontWeight: '800', color: 'rgba(255,255,255,0.85)' },
  birds: { position: 'absolute', left: 0, right: 0, bottom: 0, height: 29 },
  bird: { position: 'absolute', bottom: 0, width: 29, height: 29 },
  gesture: { position: 'absolute', top: '54%', height: '23%', left: 0, right: 0, zIndex: 2 },
  status: { position: 'absolute', left: 18, bottom: 10, backgroundColor: 'rgba(255,255,255,0.25)', borderRadius: PILL, paddingHorizontal: 12, height: 30, justifyContent: 'center', zIndex: 3 },
  statusText: { fontFamily: FONT, color: C.white, fontWeight: '800', fontSize: 12 },
  confirm: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, zIndex: 4, alignItems: 'center', justifyContent: 'center', padding: 20, gap: 12, backgroundColor: C.ink },
  confirmTitle: { fontFamily: FONT, color: C.white, fontWeight: '900', fontSize: 20, lineHeight: 26, textAlign: 'center' },
  confirmActions: { flexDirection: 'row', justifyContent: 'center', gap: 8 },
  confirmButton: { minWidth: 96, minHeight: 44, borderRadius: PILL, paddingHorizontal: 16, alignItems: 'center', justifyContent: 'center' },
  confirmDanger: { backgroundColor: C.red },
  confirmDangerText: { fontFamily: FONT, color: C.white, fontWeight: '800', fontSize: 15 },
  confirmCancel: { backgroundColor: 'rgba(255,255,255,0.22)' },
  confirmCancelText: { fontFamily: FONT, color: C.white, fontWeight: '800', fontSize: 15 },
});
