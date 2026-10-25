import { useCallback, useEffect, useRef, useState, type ComponentRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { C, FONT, PILL, S, T } from '../ui/theme';
import { JoinCelebration } from '../components/celebration/JoinCelebration';
import { prepareCelebrationSound } from '../components/celebration/feedback';
import { useCelebrateSettings } from '../components/celebration/settings';
import { BoardDemo, ChatDemo, IntroDemo, InviteDemo, SlideDemo, useReducedMotion } from '../components/onboarding/Demos';
import { celebrationSoundEnabled } from '../components/onboarding/state';

const PAGES = [
  { title: '今から遊ぶ人、\nこの指とまれ', sub: '「遊びたい」を、気軽に。', Demo: IntroDemo },
  { title: '誘う', sub: 'やりたいことを、募集にしよう。', Demo: InviteDemo },
  { title: '友達の掲示板に\n並ぶ', sub: '個別に誘わなくても、届く。', Demo: BoardDemo },
  { title: '指をスライドして\n参加', sub: '右へスッ。友達の指にタッチ。', Demo: SlideDemo },
  { title: '人数がそろうと\n「とまった!!」', sub: 'あとは参加者だけでチャット。', Demo: ChatDemo },
];

/** 参加が成立した瞬間に出す本番の演出。'slide' は4枚目、'chat' は5枚目 */
type Celebration = 'slide' | 'chat';

export function OnboardingScreen({ onDone }: { onDone: () => Promise<void> }) {
  const celebrate = useCelebrateSettings();
  const [page, setPage] = useState(0);
  const [width, setWidth] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [interacted, setInteracted] = useState(false);
  const [celebration, setCelebration] = useState<Celebration | null>(null);
  const scroll = useRef<ComponentRef<typeof ScrollView>>(null);
  const reduced = useReducedMotion();
  const interactedRef = useRef(false);
  const chatCelebrated = useRef(false);
  // 自動デモで勝手に音を鳴らさない（最初のタップ・スワイプの後だけ）
  const sound = celebrationSoundEnabled(celebrate.sound, interacted);

  // 最初のタップ・スワイプで、Safari でも鳴らせるように音の準備だけしておく
  const interact = useCallback(() => {
    if (interactedRef.current) return;
    interactedRef.current = true;
    prepareCelebrationSound(celebrate.sound);
    setInteracted(true);
  }, [celebrate.sound]);

  const go = (index: number) => { interact(); setPage(index); scroll.current?.scrollTo({ x: width * index, animated: !reduced }); };
  const finish = async () => {
    if (busy) return;
    interact();
    setBusy(true); setError('');
    try { await onDone(); } catch { setError('保存できませんでした。もう一度お試しください。'); setBusy(false); }
  };

  // 5枚目に入ったら、本番と同じ「とまった!!」を一度だけ流してからチャットを見せる
  useEffect(() => {
    if (page !== PAGES.length - 1 || chatCelebrated.current) return;
    chatCelebrated.current = true;
    setCelebration('chat');
  }, [page]);

  return <View style={S.screen} onTouchStart={interact} onLayout={event => {
    const nextWidth = event.nativeEvent.layout.width;
    setWidth(nextWidth);
    scroll.current?.scrollTo({ x: nextWidth * page, animated: false });
  }}>
    <View style={s.body} accessibilityElementsHidden={!!celebration} importantForAccessibility={celebration ? 'no-hide-descendants' : 'auto'}>
      <View style={s.header}><Text style={T.date}>このゆびとまれ / GUIDE</Text><Pressable accessibilityRole="button" disabled={busy} onPress={finish} style={s.skip}><Text style={T.body}>スキップ</Text></Pressable></View>
      {width > 0 && <ScrollView ref={scroll} horizontal pagingEnabled showsHorizontalScrollIndicator={false} style={{ flex: 1 }} onScrollBeginDrag={interact} onScroll={event => setPage(Math.max(0, Math.min(PAGES.length - 1, Math.round(event.nativeEvent.contentOffset.x / width))))} scrollEventThrottle={100}>
        {PAGES.map(({ title, sub, Demo }, index) => <ScrollView key={title} style={{ width }} contentContainerStyle={s.page} showsVerticalScrollIndicator={false} accessibilityElementsHidden={page !== index} importantForAccessibility={page === index ? 'auto' : 'no-hide-descendants'}>
          <Text style={s.number}>{`0${index + 1} / 05`}</Text><Text accessibilityRole="header" style={s.title}>{title}</Text><Text style={[T.body, { marginTop: 12 }]}>{sub}</Text>
          <View style={s.demo}><Demo active={page === index} reduced={reduced} paused={celebration === 'slide'} onTouch={() => setCelebration('slide')} /></View>
        </ScrollView>)}
      </ScrollView>}
      <View style={s.footer}><View style={s.dots} accessibilityLabel={`${page + 1} / 5ページ`}>{PAGES.map((_, index) => <Pressable key={index} accessibilityRole="button" accessibilityLabel={`${index + 1}ページへ`} accessibilityState={{ selected: page === index }} onPress={() => go(index)} style={s.dotTarget}><View style={{ height: 8, width: page === index ? 26 : 8, borderRadius: PILL, backgroundColor: page === index ? C.red : C.line }} /></Pressable>)}</View>
        {!!error && <Text accessibilityRole="alert" style={S.error}>{error}</Text>}
        <Pressable accessibilityRole="button" disabled={busy} onPress={page === PAGES.length - 1 ? finish : () => go(page + 1)} style={[S.btnRed, busy && { opacity: .5 }]}><Text style={S.btnText}>{page === PAGES.length - 1 ? 'はじめる' : '次へ →'}</Text></Pressable>
      </View>
    </View>
    <JoinCelebration visible={!!celebration} onDone={() => setCelebration(null)} sound={sound} vibrate={celebrate.vibrate} />
  </View>;
}

const s = StyleSheet.create({
  body: { flex: 1 },
  header: { paddingLeft: 24, paddingRight: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', minHeight: 60 },
  skip: { paddingHorizontal: 12, minHeight: 44, justifyContent: 'center' },
  page: { padding: 24, paddingTop: 16, flexGrow: 1 },
  number: { fontFamily: FONT, fontSize: 12, fontWeight: '800', color: C.red, letterSpacing: 2, marginBottom: 14 },
  title: { ...T.screenTitle, fontSize: 32, lineHeight: 44 },
  demo: { flex: 1, minHeight: 340, justifyContent: 'center', backgroundColor: C.surface, borderRadius: 22, padding: 18, marginTop: 28, marginBottom: 4 },
  footer: { paddingHorizontal: 24, paddingBottom: 20, gap: 6 },
  dots: { flexDirection: 'row', justifyContent: 'center' },
  dotTarget: { minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' },
});
