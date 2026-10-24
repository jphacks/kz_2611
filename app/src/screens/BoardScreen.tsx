import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { api, EventItem, Group, User } from '../api';
import { ChatSheet } from '../components/ChatSheet';
import { EventCard } from '../components/EventCard';
import { ParticipantsSheet } from '../components/ParticipantsSheet';
import { errMsg, usePolling } from '../lib/util';
import type { ScreenProps } from '../Main';
import { Chip } from '../ui/Chip';
import { Header } from '../ui/Header';
import { C, S, T } from '../ui/theme';

export function BoardScreen(p: ScreenProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [friendCount, setFriendCount] = useState<number | null>(null);
  const [group, setGroup] = useState('all');
  const [events, setEvents] = useState<EventItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [metaError, setMetaError] = useState('');
  const [actionError, setActionError] = useState('');
  const [now, setNow] = useState(Date.now());
  const [chatId, setChatId] = useState<number | null>(null);
  const [members, setMembers] = useState<EventItem | null>(null);
  const [joining, setJoining] = useState<number | null>(null);
  const joiningRef = useRef(false);
  const active = useRef(true);
  const selected = useRef(group);
  selected.current = group;
  const request = useRef(0);
  useEffect(() => {
    active.current = true;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => { active.current = false; clearInterval(timer); };
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
  async function refreshMeta() {
    try {
      const [g, f] = await Promise.all([api<{ groups: Group[] }>('/groups'), api<{ friends: User[] }>('/friends')]);
      if (!active.current) return;
      setGroups(g.groups); setFriendCount(f.friends.length); setMetaError('');
      if (selected.current !== 'all' && !g.groups.some(x => String(x.id) === selected.current)) {
        selected.current = 'all'; setGroup('all'); setEvents([]); setLoading(true); void refresh().catch(() => {});
      }
    } catch (e) { if (active.current) setMetaError(errMsg(e)); throw e; }
  }
  usePolling(refresh, 10_000);
  usePolling(refreshMeta, 10_000);
  function select(value: string) {
    if (value === selected.current) return;
    selected.current = value; setGroup(value); setEvents([]); setLoading(true); setError('');
    void refresh().catch(() => {});
  }
  async function join(event: EventItem) {
    if (joiningRef.current) return;
    joiningRef.current = true; setJoining(event.id); setActionError('');
    try {
      const result = await api<{ event: EventItem }>(`/events/${event.id}/join`, { method: 'POST' });
      if (active.current) {
        // 参加前に開始した一覧取得で参加済みの表示を巻き戻さない。
        request.current++;
        setEvents(old => old.map(e => e.id === result.event.id ? result.event : e));
        setChatId(result.event.id);
      }
    } catch (e) {
      if (active.current) setActionError(errMsg(e));
      void refresh().catch(() => {});
    } finally { joiningRef.current = false; if (active.current) setJoining(null); }
  }
  const visible = events.filter(e => e.expires_at > now).sort((a, b) => a.expires_at - b.expires_at);
  return (
    <View style={S.screen}>
      <View style={{ flex: 1, width: '100%', maxWidth: 680, alignSelf: 'center' }}>
        <Header title="掲示板" />
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
            <EventCard key={event.id} event={event} now={now} joining={joining === event.id} onOpen={() => setChatId(event.id)} onJoin={() => { void join(event); }} onPressMembers={() => setMembers(event)} />
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
      <ParticipantsSheet event={members} onClose={() => setMembers(null)} />
    </View>
  );
}
