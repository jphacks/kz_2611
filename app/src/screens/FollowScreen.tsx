import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, type Group, type User } from '../api';
import { Header } from '../ui/Header';
import { Avatar } from '../ui/Avatar';
import { Sheet } from '../ui/Sheet';
import { C, S, T } from '../ui/theme';
import { useSocialData } from '../hooks/useSocialData';
import { useFriendRequests } from '../hooks/useFriendRequests';
import { errMsg } from '../lib/util';
import { GroupEditSheet } from '../components/follow/GroupEditSheet';
import { InviteQr } from '../components/follow/InviteQr';
import { inviteFromUrl, inviteLink } from '../components/follow/invite';
import type { ScreenProps } from '../Main';

function Button({ label, onPress, disabled = false, ghost = false }: { label: string; onPress: () => void; disabled?: boolean; ghost?: boolean }) {
  return <Pressable accessibilityRole="button" accessibilityState={{ disabled }} disabled={disabled} onPress={onPress} style={[ghost ? S.btnGhost : S.btn, { opacity: disabled ? 0.4 : 1, paddingHorizontal: 16 }]}><Text style={ghost ? S.btnGhostText : S.btnText}>{label}</Text></Pressable>;
}

export function FollowScreen({ me }: ScreenProps) {
  const { friends, groups, loading, error: socialError, refresh: reload } = useSocialData(me);
  const { received, sent, error: requestError, refresh: reloadRequests } = useFriendRequests();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [handle, setHandle] = useState('');
  const [sheet, setSheet] = useState<'invite' | 'group' | null>(null);
  const [remove, setRemove] = useState<User | null>(null);
  const [invite, setInvite] = useState<{ code: string; user: User } | null>(null);
  const [name, setName] = useState('');
  const [profile, setProfile] = useState('');
  const [selected, setSelected] = useState<number[]>([]);
  const [groupError, setGroupError] = useState('');
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);
  const editingGroup = groups.find(group => group.id === editingGroupId);
  const link = inviteLink(me.invite_code);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const code = inviteFromUrl(window.location.href);
    if (!code) return;
    let active = true;
    api<{ user: User }>('/invite/' + encodeURIComponent(code)).then(({ user }) => {
      if (!active) return;
      if (user.id === me.id) { setNotice('これは自分の招待リンクです。友達に共有しましょう。'); clearInvite(); }
      else setInvite({ code, user });
    }).catch(e => { if (active) setError('招待を確認できませんでした: ' + errMsg(e)); });
    return () => { active = false; };
  }, [me.id]);

  function clearInvite() {
    if (Platform.OS !== 'web') return;
    const url = new URL(window.location.href); url.searchParams.delete('invite');
    window.history.replaceState(window.history.state, '', url.toString());
  }
  async function addFriend(body: { handle: string } | { invite_code: string }) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await api<{ status?: 'requested' | 'friends'; friend?: User }>('/friends', { body });
      await Promise.all([reload(), reloadRequests()]);
      setHandle(''); setInvite(null);
      if ('invite_code' in body) clearInvite();
      // IDでの追加は申請。相手からも申請が届いていたときだけすぐ友達になる
      setNotice(result.friend ? `${result.friend.name}さんと友達になりました` : 'handle' in body ? `@${body.handle}さんに友達申請しました。承認されると友達になります` : '');
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  }
  async function respond(user: User, action: 'accept' | 'reject' | 'cancel') {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      if (action === 'accept') await api('/friend-requests/' + user.id + '/accept', { method: 'POST' });
      else await api('/friend-requests/' + user.id, { method: 'DELETE' });
      await Promise.all([reload(), reloadRequests()]);
      setNotice(action === 'accept' ? `${user.name}さんと友達になりました` : action === 'reject' ? `${user.name}さんの申請を断りました` : `${user.name}さんへの申請を取り消しました`);
    } catch (e) { setError(errMsg(e)); void reloadRequests(); } finally { setBusy(false); }
  }
  async function deleteFriend() {
    if (!remove || busy) return;
    setBusy(true); setError('');
    try {
      await api('/friends/' + remove.id, { method: 'DELETE' });
      await reload();
      setSelected(current => current.filter(id => id !== remove.id));
      setNotice(`${remove.name}さんを友達から削除しました`); setRemove(null);
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  }
  async function createGroup() {
    if (!name.trim() || busy) return;
    setBusy(true); setGroupError('');
    try {
      await api<{ group: Group }>('/groups', { body: { name: name.trim(), profile: profile.trim(), member_ids: selected } });
      await reload(); setSheet(null); setName(''); setProfile(''); setSelected([]);
      setNotice('グループを作成しました');
    } catch (e) { setGroupError(errMsg(e)); } finally { setBusy(false); }
  }
  const close = () => { if (!busy) { setSheet(null); setRemove(null); if (invite) { clearInvite(); setInvite(null); } } };

  return <View style={S.screen}>
    <Header title="フォロー" />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      {!!(error || socialError || requestError) && <View accessibilityRole="alert" style={styles.panel}><Text style={S.error}>{error || socialError || requestError}</Text><Button label="再読み込み" ghost onPress={() => { setError(''); void reload(); void reloadRequests(); }} disabled={busy || loading} /></View>}
      {!!notice && <Text accessibilityLiveRegion="polite" style={T.body}>{notice}</Text>}
      {!!received.length && <View style={styles.panel}>
        <Text style={T.h2}>届いた友達申請 · {received.length}</Text>
        {received.map(user => <View key={user.id} style={styles.request}>
          <View style={styles.requestUser}><Avatar user={user} size={44} /><View style={styles.grow}><Text style={T.h2}>{user.name}</Text><Text style={T.sub}>@{user.handle}</Text></View></View>
          <View style={styles.requestActions}><View style={styles.grow}><Button label="承認する" disabled={busy} onPress={() => void respond(user, 'accept')} /></View><View style={styles.grow}><Button label="拒否する" ghost disabled={busy} onPress={() => void respond(user, 'reject')} /></View></View>
        </View>)}
      </View>}
      {!!sent.length && <View style={styles.panel}>
        <Text style={T.h2}>送った友達申請 · {sent.length}</Text>
        {sent.map(user => <View key={user.id} style={styles.requestUser}><Avatar user={user} size={44} /><View style={styles.grow}><Text style={T.h2}>{user.name}</Text><Text style={T.sub}>@{user.handle} · 申請中</Text></View><Button label="取り消す" ghost disabled={busy} onPress={() => void respond(user, 'cancel')} /></View>)}
      </View>}
      <View style={styles.heading}><Text style={T.h2}>友達</Text><Text style={T.huge}>{friends.length}</Text></View>
      <View style={styles.panel}>
        <Text style={T.h2}>友達を追加</Text><Text style={T.sub}>IDを入力すると友達申請を送ります。相手が承認すると友達になります。</Text>
        <TextInput accessibilityLabel="友達のID" placeholder="友達のID（例: taro）" autoCapitalize="none" autoCorrect={false} value={handle} onChangeText={setHandle} style={S.input} editable={!busy} onSubmitEditing={() => { if (handle.trim()) void addFriend({ handle: handle.trim() }); }} />
        <Button label="IDで追加" disabled={busy || !handle.trim()} onPress={() => void addFriend({ handle: handle.trim() })} />
        <Button label="招待リンク・QRを表示" ghost onPress={() => setSheet('invite')} disabled={busy} />
      </View>
      {loading ? <ActivityIndicator color={C.ink} accessibilityLabel="読み込み中" /> : !friends.length && <Text style={T.sub}>友達はまだいません。IDや招待リンクでつながりましょう。</Text>}
      {friends.map(friend => <View key={friend.id} style={styles.row}><Avatar user={friend} size={44} /><View style={styles.grow}><Text style={T.h2}>{friend.name}</Text><Text style={T.sub}>@{friend.handle}</Text></View><Pressable accessibilityRole="button" accessibilityLabel={`${friend.name}さんを削除`} disabled={busy} onPress={() => setRemove(friend)} style={styles.delete}><Text style={S.error}>削除</Text></Pressable></View>)}
      <View style={styles.heading}><Text style={T.h2}>グループ</Text><Text style={T.huge}>{groups.length}</Text></View>
      <Button label="グループを作成" onPress={() => { setGroupError(''); setSheet('group'); }} disabled={busy || loading} />
      {!loading && !groups.length && <Text style={T.sub}>グループはまだありません。いつもの友達を選んで作成できます。</Text>}
      {groups.map(group => <Pressable accessibilityRole="button" accessibilityLabel={`${group.name}を開く`} onPress={() => setEditingGroupId(group.id)} style={styles.panel} key={group.id}><View style={styles.heading}><Text style={[T.h2, styles.grow]}>{group.name}</Text><Text style={T.small}>{group.members.length}人</Text></View>{!!group.profile && <Text style={T.body}>{group.profile}</Text>}<View style={styles.members}>{group.members.map(user => <View style={styles.member} key={user.id}><Avatar user={user} /><Text style={T.small}>{user.name}</Text></View>)}</View></Pressable>)}
    </ScrollView>
    {editingGroup && <GroupEditSheet key={editingGroup.id} group={editingGroup} me={me} friends={friends} refresh={reload} onClose={() => setEditingGroupId(null)} />}
    <Sheet visible={sheet !== null || !!remove || !!invite} onClose={close}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.heading}><Text style={[T.h1, styles.grow]}>{remove ? '友達を削除' : invite ? '招待が届いています' : sheet === 'invite' ? '友達を招待' : 'グループを作成'}</Text><Button label="閉じる" ghost onPress={close} disabled={busy} /></View>
        {(!!remove || !!invite) && !!(error || socialError) && <Text accessibilityRole="alert" style={S.error}>{error || socialError}</Text>}
        {remove ? <><Text style={T.body}>{remove.name}さんを友達から削除しますか？ お互いの友達一覧から削除されます。</Text><Button label="削除する" disabled={busy} onPress={() => void deleteFriend()} /></> : invite ? <><View style={styles.row}><Avatar user={invite.user} size={56} /><View style={styles.grow}><Text style={T.h2}>{invite.user.name}</Text><Text style={T.sub}>@{invite.user.handle}</Text></View></View><Text style={T.body}>この人と友達になりますか？ 追加すると相互に友達になります。</Text><Button label="友達に追加する" disabled={busy} onPress={() => void addFriend({ invite_code: invite.code })} /><Button label="追加しない" ghost disabled={busy} onPress={close} /></> : sheet === 'invite' ? <><Text style={T.sub}>QRを読み取るか、リンクを友達に送ってください。</Text><View style={{ alignItems: 'center' }}><InviteQr value={link} /></View><Text style={T.h2}>{me.name}</Text><Text style={T.sub}>@{me.handle}</Text><Text selectable style={[T.body, styles.panel]}>{link}</Text><Text style={T.small}>リンクは長押し・選択してコピーできます。受け取った人はログイン後「フォロー」を開いてください。</Text></> : <>
          <Text style={T.body}>グループ名（必須・20文字まで）</Text><TextInput accessibilityLabel="グループ名" placeholder="例: 研究室" value={name} onChangeText={setName} maxLength={20} style={S.input} editable={!busy} />
          <Text style={T.body}>プロフィール（100文字まで）</Text><TextInput accessibilityLabel="グループのプロフィール" placeholder="どんなグループ？" value={profile} onChangeText={setProfile} maxLength={100} multiline style={S.input} editable={!busy} />
          <Text style={T.h2}>友達を選択 · {selected.length}人</Text><Text style={T.sub}>自分は自動でメンバーに含まれます。</Text>
          {!friends.length && <Text style={T.sub}>選べる友達がいません。先に友達を追加できます。</Text>}
          {friends.map(friend => <Pressable key={friend.id} accessibilityRole="checkbox" accessibilityState={{ checked: selected.includes(friend.id), disabled: busy }} disabled={busy} onPress={() => setSelected(current => current.includes(friend.id) ? current.filter(id => id !== friend.id) : [...current, friend.id])} style={[styles.row, selected.includes(friend.id) && { backgroundColor: C.surface }]}><Avatar user={friend} /><View style={styles.grow}><Text style={T.body}>{friend.name}</Text><Text style={T.sub}>@{friend.handle}</Text></View><Text style={[T.body, { color: selected.includes(friend.id) ? C.red : C.muted }]}>{selected.includes(friend.id) ? '選択中' : '選ぶ'}</Text></Pressable>)}
          {!!groupError && <Text accessibilityRole="alert" style={S.error}>{groupError}</Text>}<Button label={busy ? '作成中…' : 'グループを作成する'} disabled={busy || !name.trim()} onPress={() => void createGroup()} />
        </>}
      </ScrollView>
    </Sheet>
  </View>;
}
const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32, gap: 16 },
  heading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  panel: { padding: 18, backgroundColor: C.white, borderRadius: 22, borderWidth: 1.5, borderColor: C.line, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.line },
  grow: { flex: 1 }, delete: { padding: 12 },
  request: { gap: 10 }, requestUser: { flexDirection: 'row', alignItems: 'center', gap: 12 }, requestActions: { flexDirection: 'row', gap: 8 },
  members: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 }, member: { alignItems: 'center', gap: 4 },
});
