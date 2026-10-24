import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, Text, View } from 'react-native';
import { api, type Me, type User } from '../api';
import { errMsg } from '../lib/util';
import { Avatar } from '../ui/Avatar';
import { Sheet } from '../ui/Sheet';
import { C, S, T } from '../ui/theme';

export function UserProfileSheet({ userId, onClose }: { userId: number; onClose: () => void }) {
  const [profile, setProfile] = useState<{ user: User; is_friend: boolean } | null>(null);
  const [self, setSelf] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const submitting = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);
  useEffect(() => {
    let active = true;
    setLoading(true); setError('');
    Promise.all([api<{ user: User; is_friend: boolean }>(`/users/${userId}`), api<{ user: Me }>('/me')])
      .then(([result, me]) => { if (active) { setProfile(result); setSelf(me.user.id === userId); } })
      .catch(e => { if (active) setError(errMsg(e)); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId, retry]);
  async function addFriend() {
    if (!profile || submitting.current) return;
    submitting.current = true; setBusy(true); setError('');
    try {
      await api('/friends', { method: 'POST', body: { handle: profile.user.handle } });
      const result = await api<{ user: User; is_friend: boolean }>(`/users/${userId}`);
      if (mounted.current) setProfile(result);
    } catch (e) { if (mounted.current) setError(errMsg(e)); }
    finally { submitting.current = false; if (mounted.current) setBusy(false); }
  }
  return <Sheet visible onClose={onClose} height="70%">
    <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center' }}>
      <Text style={[T.h2, { flex: 1 }]}>プロフィール</Text>
      <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="プロフィールを閉じる" style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}><Text style={T.h1}>×</Text></Pressable>
    </View>
    <ScrollView contentContainerStyle={{ padding: 24, gap: 20, alignItems: 'center' }}>
      {loading ? <ActivityIndicator color={C.red} accessibilityLabel="プロフィールを読み込み中" /> : profile && <>
        <Avatar user={profile.user} size={144} />
        <View style={{ alignItems: 'center', gap: 8 }}><Text style={[T.h1, { textAlign: 'center' }]}>{profile.user.name}</Text><Text style={T.sub}>@{profile.user.handle}</Text></View>
        {!self && (profile.is_friend ? <View style={[S.btnGhost, { width: '100%' }]}><Text style={[S.btnGhostText, { color: C.green }]}>友達です</Text></View> :
          <Pressable onPress={addFriend} disabled={busy} accessibilityRole="button" accessibilityState={{ disabled: busy, busy }} style={[S.btnRed, { width: '100%', opacity: busy ? 0.6 : 1 }]}><Text style={S.btnText}>{busy ? '追加中…' : '友達に追加'}</Text></Pressable>)}
      </>}
      {!!error && <Text accessibilityRole="alert" style={S.error}>{error}</Text>}
      {!loading && !profile && <Pressable onPress={() => setRetry(n => n + 1)} accessibilityRole="button" style={S.btnGhost}><Text style={S.btnGhostText}>再読み込み</Text></Pressable>}
    </ScrollView>
  </Sheet>;
}
