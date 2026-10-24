// 参加したイベントのトーク。終了した募集もここから読み返せる。
import { useRef, useState, useEffect } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { api, type Talk } from '../api';
import { ChatSheet } from '../components/ChatSheet';
import { errMsg, usePolling } from '../lib/util';
import { Avatar } from '../ui/Avatar';
import { Header } from '../ui/Header';
import { C, RADIUS, S, T, popColor } from '../ui/theme';
import type { ScreenProps } from '../Main';

export function TalkScreen(p: ScreenProps) {
  const [talks, setTalks] = useState<Talk[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [eventId, setEventId] = useState<number | null>(null);
  const mounted = useRef(true);
  const pending = useRef<Promise<void> | null>(null);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  const refresh = (): Promise<void> => {
    if (pending.current) return pending.current;
    const task = (async () => {
      try {
        const data = await api<{ talks: Talk[] }>('/talks');
        if (mounted.current) { setTalks(data.talks); setError(''); }
      } catch (e) {
        if (mounted.current) setError(errMsg(e));
        throw e;
      } finally {
        if (mounted.current) setLoading(false);
        pending.current = null;
      }
    })();
    pending.current = task;
    return task;
  };
  usePolling(refresh, 3000);

  const sections = [
    { title: '参加中', items: talks.filter(t => t.active) },
    { title: '終了', items: talks.filter(t => !t.active) },
  ];
  return (
    <View style={S.screen}>
      <Header title="トーク" />
      <ScrollView contentContainerStyle={styles.content}>
        {error ? (
          <View style={styles.notice}>
            <Text accessibilityRole="alert" style={S.error}>{error}</Text>
            <Pressable accessibilityRole="button" onPress={() => { void refresh().catch(() => {}); }} style={S.btnGhost}>
              <Text style={S.btnGhostText}>再読み込み</Text>
            </Pressable>
          </View>
        ) : null}
        {loading ? <ActivityIndicator color={C.ink} accessibilityLabel="トークを読み込み中" /> : null}
        {!loading && !error && talks.length === 0 ? (
          <View style={styles.empty}>
            <Text style={T.h2}>まだトークがありません</Text>
            <Text style={T.sub}>イベントを作成・参加すると、ここにトークが表示されます。</Text>
            <Pressable accessibilityRole="button" style={S.btn} onPress={() => p.go('board')}>
              <Text style={S.btnText}>掲示板を見る</Text>
            </Pressable>
          </View>
        ) : null}
        {sections.map(section => (
          <View key={section.title}>
            <View style={styles.sectionHeader}>
              <Text accessibilityRole="header" style={T.h2}>{section.title}</Text>
              <Text style={[T.h1, section.title === '参加中' && { color: C.red }]}>{section.items.length}</Text>
            </View>
            {section.items.length === 0 && !loading && talks.length > 0 ? <Text style={[T.sub, styles.sectionEmpty]}>{section.title}のトークはありません</Text> : null}
            {section.items.map(talk => {
              const { event, last } = talk;
              const people = [event.host, ...event.members];
              const date = last ? new Date(last.created_at) : null;
              return (
                <Pressable key={event.id} accessibilityRole="button" accessibilityLabel={`${event.title}のトークを開く`} onPress={() => setEventId(event.id)} style={({ pressed }) => [styles.row, { backgroundColor: talk.active ? popColor(event.title) : C.surface, transform: [{ scale: pressed ? 0.985 : 1 }] }]}>
                  <View style={styles.rowTop}>
                    <Text numberOfLines={1} style={[T.h1, styles.grow, { fontSize: 22 }, talk.active && { color: C.white }]}>{event.title}</Text>
                    {date ? <Text style={[T.small, talk.active && { color: 'rgba(255,255,255,0.85)' }]}>{date.toLocaleDateString('ja-JP', { month: 'numeric', day: 'numeric' })} {date.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })}</Text> : null}
                  </View>
                  <Text numberOfLines={1} style={[T.body, { fontWeight: '600' }, talk.active ? { color: C.white } : { color: C.muted }]}>{last?.body ?? 'まだメッセージはありません'}</Text>
                  <View style={styles.avatars}>
                    {people.slice(0, 5).map((user, i) => <View key={user.id} style={{ marginLeft: i ? -8 : 0 }}><Avatar user={user} size={28} border={talk.active ? popColor(event.title) : C.surface} /></View>)}
                    {people.length > 5 ? <Text style={T.small}>+{people.length - 5}</Text> : null}
                  </View>
                </Pressable>
              );
            })}
          </View>
        ))}
      </ScrollView>
      <ChatSheet eventId={eventId} me={p.me} onClose={() => setEventId(null)} onChanged={event => {
        if (!event) setEventId(null);
        void refresh().catch(() => {});
      }} onEdit={id => { setEventId(null); p.go('create', { editEventId: id }); }} />
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 32 },
  notice: { gap: 12, marginBottom: 20 },
  empty: { backgroundColor: C.surface, borderRadius: RADIUS, padding: 20, gap: 16, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 16, paddingBottom: 10 },
  sectionEmpty: { paddingVertical: 20 },
  row: { borderRadius: RADIUS, padding: 18, marginBottom: 12, gap: 8 },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grow: { flex: 1 },
  avatars: { flexDirection: 'row', alignItems: 'center', gap: 4 },
});
