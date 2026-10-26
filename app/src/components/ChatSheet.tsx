import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { api, type EventItem, type Me, type Message } from '../api';
import { errMsg, usePolling } from '../lib/util';
import { Avatar } from '../ui/Avatar';
import { Sheet } from '../ui/Sheet';
import { C, S, T, tint } from '../ui/theme';
import { ParticipantsSheet } from './ParticipantsSheet';
import { JoinCelebration } from './celebration/JoinCelebration';
import { preloadBirdImages } from './celebration/birds';
import { prepareCelebrationSound, startJoinHaptic } from './celebration/feedback';
import { useCelebrateSettings } from './celebration/settings';
import { canJoin, mergeMessages } from './chat/messages';

export interface ChatSheetProps {
  eventId: number | null;
  me: Me;
  onClose: () => void;
  onChanged: (e: EventItem | null) => void;
  onEdit: (eventId: number) => void;
}
export function ChatSheet({ eventId, ...props }: ChatSheetProps) {
  // イベント変更で未送信文・取得中の結果・参加者シートを必ず分離する。
  return eventId === null ? null : <ChatSession key={eventId} eventId={eventId} {...props} />;
}
function ChatSession({ eventId, me, onClose, onChanged, onEdit }: Omit<ChatSheetProps, 'eventId'> & { eventId: number }) {
  const [event, setEvent] = useState<EventItem | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [body, setBody] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [participants, setParticipants] = useState(false);
  const [celebration, setCelebration] = useState(false);
  const celebrate = useCelebrateSettings();
  const alive = useRef(true);
  const lock = useRef(false);
  const cursor = useRef(0);
  const scroll = useRef<React.ComponentRef<typeof ScrollView>>(null);
  const nearBottom = useRef(true);
  const stopHaptic = useRef<() => void>(() => {});
  const member = !!event && (event.joined || event.is_host);
  useEffect(() => {
    alive.current = true;
    // トーク画面から開いたときも、参加の演出の鳥を先に読み込んでおく（#98）
    preloadBirdImages();
    return () => { alive.current = false; stopHaptic.current(); };
  }, []);
  async function loadEvent() {
    setLoading(true);
    try {
      const data = await api<{ event: EventItem }>(`/events/${eventId}`);
      if (alive.current) { setEvent(data.event); setError(''); }
    } catch (e) { if (alive.current) setError(errMsg(e)); }
    finally { if (alive.current) setLoading(false); }
  }
  useEffect(() => { void loadEvent(); }, [eventId]);
  usePolling(async () => {
    try {
      const data = await api<{ messages: Message[] }>(`/events/${eventId}/messages?after=${cursor.current}`);
      if (!alive.current) return;
      cursor.current = Math.max(cursor.current, ...data.messages.map(m => m.id));
      setMessages(old => mergeMessages(old, data.messages));
      setError('');
    } catch (e) { if (alive.current) setError(errMsg(e)); throw e; }
  }, 3000, member);
  async function action(kind: 'join' | 'leave' | 'delete' | 'send') {
    if (lock.current) return;
    const text = body.trim();
    if (kind === 'send' && (!text || text.length > 500)) return;
    lock.current = true; setBusy(true); setError('');
    // Safari でも鳴らせるように、ボタンを押した操作の中で音の準備だけしておく（掲示板のスワイプと同じ）
    // 振動も掲示板と同じく、API の応答を待たずこの同期処理で開始する（#160）
    if (kind === 'join') {
      stopHaptic.current = startJoinHaptic(celebrate.ready && celebrate.vibrate);
      prepareCelebrationSound(celebrate.sound);
    }
    try {
      if (kind === 'send') {
        const data = await api<{ message: Message }>(`/events/${eventId}/messages`, { body: { body: text } });
        if (!alive.current) return;
        nearBottom.current = true;
        // cursor は取得済み連続範囲だけを表す。送信IDに進めると同時着信を飛ばす。
        setMessages(old => mergeMessages(old, [data.message])); setBody('');
      } else if (kind === 'delete') {
        await api(`/events/${eventId}`, { method: 'DELETE' });
        if (alive.current) { onChanged(null); onClose(); }
      } else {
        const data = await api<{ event: EventItem }>(`/events/${eventId}/join`, { method: kind === 'join' ? 'POST' : 'DELETE' });
        if (!alive.current) return;
        setEvent(data.event); setMenu(false); setParticipants(false);
        setMessages([]); cursor.current = 0; onChanged(data.event);
        // 参加が成功したときだけ、掲示板のスワイプと同じ演出を流す（#151）
        if (kind === 'join' && data.event.joined) setCelebration(true);
      }
    } catch (e) {
      // 失敗した参加操作で開始した振動だけを止める
      if (kind === 'join') stopHaptic.current();
      if (alive.current) setError(errMsg(e));
    }
    finally { lock.current = false; if (alive.current) setBusy(false); }
  }
  return <>
    <Sheet visible onClose={onClose}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 10, borderBottomWidth: 1, borderColor: C.line }}>
          {event && <Pressable onPress={() => setParticipants(true)} accessibilityRole="button" accessibilityLabel="参加者を見る" style={{ flexDirection: 'row', alignItems: 'center', minHeight: 44 }}>
            {[event.host, ...event.members].slice(0, 4).map((u, i) => <View key={u.id} style={{ marginLeft: i ? -7 : 0 }}><Avatar user={u} size={28} /></View>)}
          </Pressable>}
          <Text numberOfLines={1} style={[T.h2, { flex: 1 }]}>{event?.title ?? 'トーク'}</Text>
          {member && <Pressable accessibilityRole="button" accessibilityLabel="イベントのメニュー" onPress={() => { setMenu(!menu); setConfirmDelete(false); }} style={{ padding: 10 }}><Text style={T.h2}>⋯</Text></Pressable>}
          <Pressable accessibilityRole="button" accessibilityLabel="チャットを閉じる" onPress={onClose} style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: C.surface, alignItems: 'center', justifyContent: 'center' }}><Text style={[T.h2, { color: C.muted, fontSize: 16 }]}>×</Text></Pressable>
        </View>
        {menu && event && <View style={{ padding: 16, gap: 10, borderBottomWidth: 1, borderColor: C.line }}>
          {event.is_host ? <>
            <Pressable style={S.btnGhost} disabled={busy} onPress={() => { setMenu(false); onEdit(eventId); }}><Text style={S.btnGhostText}>編集する</Text></Pressable>
            <Pressable style={S.btnGhost} disabled={busy} onPress={() => setConfirmDelete(!confirmDelete)}><Text style={[S.btnGhostText, { color: C.red }]}>イベントを削除</Text></Pressable>
            {confirmDelete && <><Text style={T.sub}>参加者とメッセージも削除されます。取り消せません。</Text><Pressable style={S.btnRed} disabled={busy} onPress={() => void action('delete')}><Text style={S.btnText}>削除を確定する</Text></Pressable></>}
          </> : <Pressable disabled={busy} style={S.btnGhost} onPress={() => void action('leave')}><Text style={S.btnGhostText}>参加をやめる</Text></Pressable>}
        </View>}
        {!!error && <View style={{ padding: 12, gap: 8 }}><Text accessibilityRole="alert" style={S.error}>{error}</Text>{!event && !loading && <Pressable onPress={() => void loadEvent()}><Text style={T.body}>再読み込み</Text></Pressable>}</View>}
        {loading && <ActivityIndicator color={C.ink} style={{ padding: 16 }} accessibilityLabel="読み込み中" />}
        {member ? <>
          <ScrollView ref={scroll} style={{ flex: 1 }} contentContainerStyle={{ padding: 16, gap: 14, flexGrow: 1 }} keyboardShouldPersistTaps="handled"
            onScroll={e => { const { contentOffset, contentSize, layoutMeasurement } = e.nativeEvent; nearBottom.current = contentSize.height - contentOffset.y - layoutMeasurement.height < 80; }} scrollEventThrottle={100}
            onContentSizeChange={() => { if (nearBottom.current) scroll.current?.scrollToEnd({ animated: false }); }}>
            {messages.length === 0 && <Text style={[T.sub, { textAlign: 'center', paddingTop: 20 }]}>まだメッセージはありません</Text>}
            {messages.map(m => m.kind === 'system' ? <Text key={m.id} style={[T.small, { alignSelf: 'center', textAlign: 'center', backgroundColor: C.surface, borderRadius: 999, overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 5 }]}>{m.body}</Text> : <View key={m.id} style={{ flexDirection: 'row', gap: 8, alignSelf: m.user?.id === me.id ? 'flex-end' : 'flex-start', maxWidth: '88%', alignItems: 'flex-end' }}>
              {m.user && m.user.id !== me.id && <Avatar user={m.user} size={26} />}
              <View style={{ flexShrink: 1, gap: 4 }}>
                {m.user?.id !== me.id && <Text style={T.small}>{m.user?.name ?? '参加者'}</Text>}
                <View style={{ backgroundColor: m.user?.id === me.id ? C.blue : tint(m.user?.id ?? 0), borderRadius: 20, borderBottomRightRadius: m.user?.id === me.id ? 6 : 20, borderBottomLeftRadius: m.user?.id === me.id ? 20 : 6, paddingHorizontal: 14, paddingVertical: 10 }}><Text style={[T.body, { color: m.user?.id === me.id ? C.white : C.ink, fontWeight: '600' }]}>{m.body}</Text></View>
              </View>
            </View>)}
          </ScrollView>
          <View style={{ flexDirection: 'row', alignItems: 'flex-end', padding: 14, gap: 8 }}>
            <TextInput accessibilityLabel="メッセージ" placeholder="メッセージ" placeholderTextColor={C.muted} multiline maxLength={500} value={body} onChangeText={setBody} editable={!busy} style={[S.input, { flex: 1, maxHeight: 120, borderRadius: 24 }]} />
            <Pressable accessibilityRole="button" accessibilityLabel="送信" accessibilityState={{ disabled: busy || !body.trim() }} disabled={busy || !body.trim()} onPress={() => void action('send')} style={{ backgroundColor: C.red, width: 48, height: 48, borderRadius: 24, alignItems: 'center', justifyContent: 'center', opacity: busy || !body.trim() ? 0.5 : 1 }}>
              <Svg width={22} height={22} viewBox="0 0 24 24"><Path d="M4 11 L20 4 L14 20 L11 13 Z M11 13 L20 4" stroke={C.white} strokeWidth={1.5} fill="none" /></Svg>
            </Pressable>
          </View>
        </> : <View style={{ flex: 1, justifyContent: 'center', padding: 24, gap: 20 }}>
          {event && <><Text style={[T.sub, { textAlign: 'center' }]}>参加するとイベント内のトークを読めます。</Text>
            <Pressable disabled={busy || !canJoin(event, Date.now())} onPress={() => void action('join')} style={[S.btnRed, { opacity: busy || !canJoin(event, Date.now()) ? 0.5 : 1 }]}><Text style={S.btnText}>{event.expires_at <= Date.now() ? '募集は終了しました' : event.count >= event.capacity ? '満員です' : '参加する'}</Text></Pressable></>}
        </View>}
      </KeyboardAvoidingView>
    </Sheet>
    <ParticipantsSheet me={me} event={participants ? event : null} onClose={() => setParticipants(false)} />
    {/* チャットのシートより手前に出すため、演出は別の Modal に載せる */}
    <Modal visible={celebration} transparent animationType="none" onRequestClose={() => setCelebration(false)}>
      <JoinCelebration visible={celebration} onDone={() => setCelebration(false)} sound={celebrate.sound} vibrate={celebrate.vibrate} />
    </Modal>
  </>;
}
