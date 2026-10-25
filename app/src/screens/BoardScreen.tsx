import { useCallback, useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { useSocialData } from '../hooks/useSocialData';
import { useEventDeadline } from '../hooks/useEventDeadline';
import { api, EventItem } from '../api';
import { ChatSheet } from '../components/ChatSheet';
import { EventCard } from '../components/EventCard';
import { compareBoardEvents } from '../components/board/eventOrder';
import { JoinCelebration } from '../components/celebration/JoinCelebration';
import { preloadBirdImages } from '../components/celebration/birds';
import { prepareCelebrationSound } from '../components/celebration/feedback';
import { useCelebrateSettings } from '../components/celebration/settings';
import { ParticipantsSheet } from '../components/ParticipantsSheet';
import { errMsg, usePolling } from '../lib/util';
import type { ScreenProps } from '../Main';
import { Chip } from '../ui/Chip';
import { Header } from '../ui/Header';
import { C, S, T } from '../ui/theme';

export function BoardScreen(p: ScreenProps) {
  const { groups, friends, loading: socialLoading, error: metaError, refresh: refreshMeta } = useSocialData(p.me);
  const friendCount = socialLoading ? null : friends.length;
  const [group, setGroup] = useState('all');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const now = useEventDeadline(events);
  const [chatId, setChatId] = useState<number | null>(null);
  const [members, setMembers] = useState<EventItem | null>(null);
  const [joining, setJoining] = useState<number | null>(null);
  const [leaving, setLeaving] = useState<number | null>(null);
  const [deleting, setDeleting] = useState<number | null>(null);
  const [celebration, setCelebration] = useState(false);
  const celebrate = useCelebrateSettings();
  const joiningRef = useRef(false);
  const deletingRef = useRef(false);
  const active = useRef(true);
  const selected = useRef(group);
  selected.current = group;
  const request = useRef(0);
  useEffect(() => {
    active.current = true;
    // 参加の演出で使う鳥の画像を、参加する前に読み込んでおく（#98）
    preloadBirdImages();
    return () => { active.current = false; };
  }, []);
  useEffect(() => {
    if (p.openEventId !== undefined) { setChatId(p.openEventId); p.clearNav(); }
  }, [p.openEventId, p.clearNav]);

  async function refresh() {
    const id = ++request.current;
    const current = selected.current;
    try {
      const data = await api<{ events: EventItem[] }>(`/events?group=${current}`);
      if (active.current && id === request.current && current === selected.current) {
        setEvents(data.events); setError(''); setLoading(false);
        setMembers(old => old ? data.events.find(e => e.id === old.id) || null : null);
      }
    } catch (e) {
      if (active.current && id === request.current) { setError(errMsg(e)); setLoading(false); }
      throw e;
    }
  }
  usePolling(refresh, 10_000);
  useEffect(() => {
    if (group !== 'all' && !groups.some(g => String(g.id) === group)) select('all');
  }, [groups]);
  function select(value: string) {
    if (value === selected.current) return;
    selected.current = value; setGroup(value); setEvents([]); setLoading(true); setError('');
    void refresh().catch(() => {});
  }
  const join = useCallback(async (event: EventItem) => {
    if (joiningRef.current) return;
    joiningRef.current = true; setJoining(event.id); setActionError('');
    // Safari でも鳴らせるように、スワイプの操作の中で音の準備だけしておく
    prepareCelebrationSound(celebrate.sound);
    try {
      const result = await api<{ event: EventItem }>(`/events/${event.id}/join`, { method: 'POST' });
      if (active.current) {
        // 参加前に開始した一覧取得で参加済みの表示を巻き戻さない。
        request.current++;
        setEvents(old => old.map(e => e.id === result.event.id ? result.event : e));
        // 参加が成功したときだけ演出を流す（失敗・取り消し・主催者では出さない）
        setCelebration(true);
      }
    } catch (e) {
      if (active.current) setActionError(errMsg(e));
      void refresh().catch(() => {});
    } finally { joiningRef.current = false; if (active.current) setJoining(null); }
  }, [celebrate.sound]);
  const leave = useCallback(async (event: EventItem) => {
    if (joiningRef.current || event.is_host || !event.joined) return;
    joiningRef.current = true; setLeaving(event.id); setActionError('');
    try {
      const result = await api<{ event: EventItem }>(`/events/${event.id}/join`, { method: 'DELETE' });
      if (active.current) {
        request.current++;
        setEvents(old => old.map(e => e.id === result.event.id ? result.event : e));
      }
      void refresh().catch(() => {});
    } catch (e) {
      if (active.current) setActionError(errMsg(e));
    } finally { joiningRef.current = false; if (active.current) setLeaving(null); }
  }, []);
  const remove = useCallback(async (event: EventItem) => {
    if (deletingRef.current || !event.is_host) return;
    deletingRef.current = true; setDeleting(event.id); setActionError('');
    try {
      await api<{ ok: boolean }>(`/events/${event.id}`, { method: 'DELETE' });
      if (active.current) {
        // 削除前に開始した一覧取得で掲示を復活させない。
        request.current++;
        setEvents(old => old.filter(e => e.id !== event.id));
        setChatId(old => old === event.id ? null : old);
        setMembers(old => old?.id === event.id ? null : old);
      }
    } catch (e) {
      if (active.current) setActionError(errMsg(e));
    } finally { deletingRef.current = false; if (active.current) setDeleting(null); }
  }, []);
  const open = useCallback((event: EventItem) => setChatId(event.id), []);
  const showMembers = useCallback((event: EventItem) => setMembers(event), []);
  // 満員の募集は、参加していない人には表示しない（#33）。主催者・参加者には残す
  const visible = events.filter(e => e.expires_at > now && (e.joined || e.is_host || e.count < e.capacity)).sort(compareBoardEvents);
  return (
    <View style={S.screen}>
      <View style={{ flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' }}>
        <Header title="このゆびとまれ" />
        <View><ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 12, gap: 8 }}>
          <Chip label="全体" on={group === 'all'} onPress={() => select('all')} />
          {groups.map(g => <Chip key={g.id} label={g.name} on={group === String(g.id)} onPress={() => select(String(g.id))} />)}
        </ScrollView></View>
        <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
          {!!(actionError || error || metaError) && <View accessibilityRole="alert" style={{ paddingVertical: 12, gap: 8 }}>
            <Text style={S.error}>{actionError || error || metaError}</Text>
            <Pressable accessibilityRole="button" onPress={() => { setActionError(''); void refresh().catch(() => {}); void refreshMeta().catch(() => {}); }}><Text style={[T.body, { fontWeight: '800' }]}>再読み込み</Text></Pressable>
          </View>}
          {loading ? <View style={{ padding: 40 }}><ActivityIndicator color={C.ink} accessibilityLabel="募集を読み込み中" /></View> : visible.length ? visible.map(event =>
            <EventCard key={event.id} event={event} joining={joining === event.id} leaving={leaving === event.id} deleting={deleting === event.id} onLeave={leave} onDelete={remove} onOpen={open} onJoin={join} onPressMembers={showMembers} />
          ) : !error && <View style={{ backgroundColor: C.surface, borderRadius: 22, padding: 24, gap: 16 }}>
            <Text style={T.h1}>募集中の遊びは{'\n'}まだありません</Text>
            <Text style={T.sub}>{friendCount === 0 ? 'まずは友達を追加して、一緒に遊ぶ仲間を見つけましょう。' : group === 'all' ? '最初のひと声を、あなたから。友達を誘ってみましょう。' : 'このグループで、最初の募集をしてみましょう。'}</Text>
            <Pressable accessibilityRole="button" style={S.btn} onPress={() => p.go(friendCount === 0 ? 'follow' : 'create')}><Text style={S.btnText}>{friendCount === 0 ? '友達を追加する' : '遊びに誘う'}</Text></Pressable>
          </View>}
        </ScrollView>
      </View>
      <ChatSheet eventId={chatId} me={p.me} onClose={() => setChatId(null)} onEdit={id => { setChatId(null); p.go('create', { editEventId: id }); }} onChanged={event => {
        request.current++;
        if (!event) setChatId(null);
        else setEvents(old => old.map(e => e.id === event.id ? event : e));
        void refresh().catch(() => {});
      }} />
      <ParticipantsSheet me={p.me} event={members} onClose={() => setMembers(null)} />
      <JoinCelebration
        visible={celebration}
        onDone={() => setCelebration(false)}
        sound={celebrate.sound}
        vibrate={celebrate.vibrate}
      />
    </View>
  );
}
