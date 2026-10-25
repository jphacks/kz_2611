import { useCallback, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Easing, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import type { EventItem } from '../../api';
import { EventCard } from '../EventCard';
import { Avatar } from '../../ui/Avatar';
import { Chip } from '../../ui/Chip';
import { TimeWheel } from '../create/TimeWheel';
import { C, FONT, PILL, RADIUS, S, T, tint } from '../../ui/theme';

export interface DemoProps {
  active: boolean;
  reduced: boolean;
  /** 本番の演出（JoinCelebration）を出している間はデモを止める */
  paused?: boolean;
  /** 指先が相手に触れた（参加が成立した）ときに呼ぶ */
  onTouch?: () => void;
}

export function useReducedMotion() {
  // 設定が分かるまでは動かさない。
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    let active = true;
    void AccessibilityInfo.isReduceMotionEnabled().then(value => { if (active) setReduced(value); });
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduced);
    return () => { active = false; subscription.remove(); };
  }, []);
  return reduced;
}

function useDemoProgress(active: boolean, reduced: boolean) {
  const value = useRef(new Animated.Value(1)).current;
  useEffect(() => {
    if (!active || reduced) { value.setValue(1); return; }
    value.setValue(0);
    const loop = Animated.loop(Animated.sequence([
      Animated.delay(450),
      Animated.timing(value, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      Animated.delay(1800),
      Animated.timing(value, { toValue: 0, duration: 350, useNativeDriver: false }),
    ]));
    loop.start();
    return () => loop.stop();
  }, [active, reduced, value]);
  return value;
}

const noop = () => {};
const HOST = { id: 1, handle: 'aki', name: 'あき', avatar: null };
const FRIEND = { id: 2, handle: 'rina', name: 'りな', avatar: null };

/** API に接続せず、本番カード全体を説明枠に合わせて縮小する。 */
function DemoCard({ title = 'カラオケ', joined = false, onJoin }: { title?: string; joined?: boolean; onJoin?: () => void }) {
  const [width, setWidth] = useState(0);
  const [created] = useState(() => Date.now() - 6 * 60_000);
  const event: EventItem = { id: -1, title, place: '駅前', time_text: '19:00〜',
    capacity: 3, capacity_min: 0, duration_min: 30, created_at: created,
    expires_at: created + 30 * 60_000, group_id: null, group_name: null,
    host: HOST, members: [FRIEND], count: 2, joined, is_host: false };
  return <View onLayout={e => setWidth(e.nativeEvent.layout.width)} style={{ width: '100%', height: width * 580 / 660 }}>
    {width > 0 && <View pointerEvents={onJoin ? 'auto' : 'none'} accessibilityElementsHidden={!onJoin} importantForAccessibility={onJoin ? 'auto' : 'no-hide-descendants'} style={{ width: 360, transformOrigin: 'top left', transform: [{ scale: width / 360 }] }}>
      <EventCard event={event} onOpen={onJoin ?? noop} onJoin={onJoin ?? noop} onLeave={noop} onDelete={noop} onPressMembers={noop} />
    </View>}
  </View>;
}

export function IntroDemo({ active, reduced }: DemoProps) {
  const p = useDemoProgress(active, reduced);
  return <View style={s.center}><Animated.View style={{ transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [6, -6] }) }] }}><Image source={require('../../../public/icons/icon-512.png')} accessibilityLabel="このゆびとまれの鳥" style={s.logo} /></Animated.View><Text style={[T.h1, { marginTop: 22 }]}>このゆびとまれ</Text><View style={s.tags}>{['誘う', '集まる', '遊ぶ'].map((word, i) => <View key={word} style={[s.tag, { backgroundColor: [C.red, C.blue, C.pink][i] }]}><Text style={s.white}>{word}</Text></View>)}</View></View>;
}

export function InviteDemo({ active, reduced }: DemoProps) {
  const p = useDemoProgress(active, reduced);
  // CreateScreen は API 取得があるのでマウントせず、テーマと表示部品を流用する。
  return <Animated.View style={{ width: '100%', gap: 10, opacity: p.interpolate({ inputRange: [0, 1], outputRange: [.6, 1] }) }}>
    <View pointerEvents="none" style={{ gap: 10, backgroundColor: C.white, borderRadius: RADIUS, padding: 14 }}>
      <Text style={T.h2}>やること</Text><Text style={[S.input, { fontSize: 22, fontWeight: '800' }]}>カラオケ</Text>
      <Text style={T.h2}>場所<Text style={T.sub}>　任意</Text></Text><Text style={S.input}>駅前</Text>
      <Text style={T.h2}>時間</Text><TimeWheel value={{ hour: 19, minute: 0 }} onChange={noop} />
      <Text style={T.h2}>人数<Text style={T.sub}>　あなたを含めて</Text></Text><Text style={T.h2}>2〜3人</Text>
      {[2, 3].map((n, i) => <View key={n} style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: C.surface, borderRadius: RADIUS, paddingHorizontal: 16, paddingVertical: 8 }}><Text style={T.body}>{i ? '上限' : '下限'}</Text><View style={s.step}><Text style={T.h1}>−</Text></View><Text style={T.h1}>{n}人</Text><View style={s.step}><Text style={T.h1}>＋</Text></View></View>)}
      <Text style={T.h2}>表示時間</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>{[15, 30, 60, 120].map(m => <Chip key={m} label={`${m}分`} on={m === 30} onPress={noop} />)}</View>
      <Text style={T.h2}>公開先</Text><View style={s.row}><Chip label="全体" on onPress={noop} /></View>
      <View style={S.btnRed}><Text style={S.btnText}>公開する</Text></View>
    </View>
  </Animated.View>;
}

export function BoardDemo({ active, reduced }: DemoProps) {
  const p = useDemoProgress(active, reduced);
  return <View style={{ width: '100%', gap: 12 }}><View style={[s.row, { justifyContent: 'space-between' }]}><Text style={T.h1}>掲示板</Text><Text style={T.sub}>友達の募集</Text></View><View pointerEvents="none" style={s.row}><Chip label="全体" on onPress={noop} /></View>{['カラオケ', 'ラーメン', '夜ドライブ'].map((title, i) => <Animated.View key={title} style={{ opacity: p.interpolate({ inputRange: [0, .25 + i * .2, 1], outputRange: [0, .55, 1] }), transform: [{ translateY: p.interpolate({ inputRange: [0, 1], outputRange: [45 + i * 20, 0] }) }] }}><DemoCard title={title} /></Animated.View>)}</View>;
}

const SLIDE_TOUCH = 0.94;

export function SlideDemo({ active, reduced, paused = false, onTouch }: DemoProps) {
  const value = useRef(new Animated.Value(0)).current;
  const [shown, setShown] = useState(0);
  const [dragging, setDragging] = useState(false);
  const touched = useRef(false);
  const loop = useRef<Animated.CompositeAnimation | null>(null);
  // 親が毎回新しい関数を渡しても、自動デモからは最新の通知先を呼ぶ
  const touchRef = useRef(onTouch);
  touchRef.current = onTouch;

  useEffect(() => {
    const id = value.addListener(({ value: next }) => setShown(next));
    return () => value.removeListener(id);
  }, [value]);

  // 指先が相手に触れた瞬間。本番の演出は親（OnboardingScreen）が出す
  const hit = useCallback(() => {
    if (touched.current) return;
    touched.current = true;
    loop.current?.stop();
    value.setValue(1);
    touchRef.current?.();
  }, [value]);
  const hitRef = useRef(hit);
  hitRef.current = hit;

  // 自動デモ。演出中（paused）と指で動かしている間は止め、終わったら最初から流す
  useEffect(() => {
    if (!active || reduced || paused || dragging) {
      if (reduced) value.setValue(1);
      return;
    }
    touched.current = false;
    value.setValue(0);
    const sequence = Animated.loop(Animated.sequence([
      Animated.delay(450),
      Animated.timing(value, { toValue: 1, duration: 1600, easing: Easing.inOut(Easing.cubic), useNativeDriver: false }),
      Animated.delay(1800),
      Animated.timing(value, { toValue: 0, duration: 350, useNativeDriver: false }),
    ]));
    loop.current = sequence;
    sequence.start();
    const id = value.addListener(({ value: next }) => { if (next > SLIDE_TOUCH) hitRef.current(); });
    return () => { value.removeListener(id); sequence.stop(); loop.current = null; };
  }, [active, reduced, paused, dragging, value]);

  return <View style={{ width: '100%', gap: 20 }}>
    <Text style={[T.small, { color: C.red }]}>参加のデモ</Text>
    <Pressable accessibilityRole="button" accessibilityLabel="左の指を右へスライドして参加（タップでも参加できます）" onPress={hit}>
      <View onTouchStart={() => setDragging(true)} onTouchEnd={() => setDragging(false)} onTouchCancel={() => setDragging(false)}><DemoCard joined={shown > SLIDE_TOUCH} onJoin={hit} /></View>
    </Pressable>
    <View style={s.tag}><Text style={[T.h2, { color: C.blue }]}>{shown > .95 ? 'タッチ！ 参加できた' : 'あなたの指 → 友達の指'}</Text></View>
  </View>;
}

export function ChatDemo({ active, reduced }: DemoProps) {
  const p = useDemoProgress(active, reduced);
  // ChatSheet はポーリングを持つため、同じテーマ・Avatar・吹き出しで表示だけ行う。
  return <View style={{ width: '100%', gap: 16 }}>
    <Text style={[T.sub, { textAlign: 'center' }]}>参加者だけのチャット</Text>
    <View style={{ backgroundColor: C.white, borderRadius: RADIUS, overflow: 'hidden' }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderColor: C.line }}>
        <View style={{ flexDirection: 'row' }}>{[HOST, FRIEND].map((user, i) => <View key={user.id} style={{ marginLeft: i ? -7 : 0 }}><Avatar user={user} size={28} /></View>)}</View>
        <Text numberOfLines={1} style={[T.h2, { flex: 1 }]}>カラオケ</Text><Text style={T.h2}>⋯</Text><View style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}><Text style={[T.h2, { color: C.muted, fontSize: 16 }]}>×</Text></View>
      </View>
      <View style={{ padding: 16, gap: 14 }}>
        {['駅前で集合しよう！', '今から行くね！', '楽しみ！'].map((body, i) => {
          const mine = i === 1;
          return <Animated.View key={body} style={{ flexDirection: 'row', gap: 8, alignSelf: mine ? 'flex-end' : 'flex-start', maxWidth: '88%', alignItems: 'flex-end', opacity: mine ? p.interpolate({ inputRange: [0, 1], outputRange: [.3, 1] }) : 1 }}>
            {!mine && <Avatar user={i ? FRIEND : HOST} size={26} />}
            <View style={{ flexShrink: 1, gap: 4 }}>{!mine && <Text style={T.small}>{i ? FRIEND.name : HOST.name}</Text>}
              <View style={{ backgroundColor: mine ? C.blue : tint(i ? FRIEND.id : HOST.id), borderRadius: 20, borderBottomRightRadius: mine ? 6 : 20, borderBottomLeftRadius: mine ? 20 : 6, paddingHorizontal: 14, paddingVertical: 10 }}><Text style={[T.body, { color: mine ? C.white : C.ink, fontWeight: '600' }]}>{body}</Text></View>
            </View>
          </Animated.View>;
        })}
      </View>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', padding: 14, gap: 8 }}><Text style={[S.input, { flex: 1, borderRadius: 24, color: C.muted }]}>メッセージ</Text><View style={{ backgroundColor: C.red, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', opacity: .5 }}><Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M4 11 L20 4 L14 20 L11 13 Z M11 13 L20 4" stroke={C.white} strokeWidth={1.5} fill="none" /></Svg></View></View>
    </View>
  </View>;
}

const s = StyleSheet.create({
  step: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center', backgroundColor: C.white },
  white: { fontFamily: FONT, fontSize: 14, fontWeight: '700', color: C.white },
  center: { alignItems: 'center', justifyContent: 'center', width: '100%' },
  logo: { width: 176, height: 176, borderRadius: 44 },
  tags: { flexDirection: 'row', gap: 8, marginTop: 20 },
  tag: { borderRadius: PILL, paddingHorizontal: 16, paddingVertical: 10, alignItems: 'center', justifyContent: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
