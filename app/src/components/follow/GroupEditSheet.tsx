import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { api, type Group, type Me, type User } from '../../api';
import { Sheet } from '../../ui/Sheet';
import { Avatar } from '../../ui/Avatar';
import { C, S, T } from '../../ui/theme';
import { errMsg } from '../../lib/util';

export function GroupEditSheet({ group, me, friends, refresh, onClose }: {
  group: Group; me: Me; friends: User[]; refresh: () => Promise<unknown>; onClose: () => void;
}) {
  const [name, setName] = useState(group.name);
  const [profile, setProfile] = useState(group.profile);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [confirm, setConfirm] = useState<User | null>(null);
  const owner = group.owner_id === me.id;
  async function mutate(path: string, method: string, body?: unknown, leaving = false) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      await api(path, { method, body });
      setConfirm(null);
      await refresh();
      if (leaving) onClose();
      else setNotice('更新しました');
    } catch (e) { setError(errMsg(e)); } finally { setBusy(false); }
  }
  function button(label: string, onPress: () => void, ghost = false, disabled = false, description?: string) {
    return <Pressable accessibilityRole="button" accessibilityLabel={description} accessibilityState={{ disabled: busy || disabled }} disabled={busy || disabled} onPress={onPress} style={[ghost ? S.btnGhost : S.btn, styles.action, { opacity: busy || disabled ? 0.4 : 1 }]}><Text style={ghost ? S.btnGhostText : S.btnText}>{label}</Text></Pressable>;
  }
  return <Sheet visible onClose={() => { if (!busy) onClose(); }}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.row}><Text style={[T.h1, styles.grow]}>グループ</Text>{button('閉じる', onClose, true)}</View>
      {!!error && <Text accessibilityRole="alert" style={S.error}>{error}</Text>}
      {!!notice && <Text accessibilityLiveRegion="polite" style={T.body}>{notice}</Text>}
      {owner ? <>
        <Text style={T.body}>グループ名（20文字まで）</Text>
        <TextInput accessibilityLabel="グループ名を編集" value={name} onChangeText={setName} maxLength={20} editable={!busy} style={S.input} />
        <Text style={T.body}>プロフィール（100文字まで）</Text>
        <TextInput accessibilityLabel="グループのプロフィールを編集" value={profile} onChangeText={setProfile} maxLength={100} editable={!busy} multiline style={S.input} />
        {button('変更を保存', () => void mutate('/groups/' + group.id, 'PATCH', { name: name.trim(), profile: profile.trim() }), false, !name.trim())}
      </> : <><Text style={T.h1}>{group.name}</Text>{!!group.profile && <Text style={T.body}>{group.profile}</Text>}<Text style={T.sub}>編集は作成者だけができます。</Text></>}
      <Text style={T.h2}>メンバー · {group.members.length}人</Text>
      {group.members.map(user => <View key={user.id} style={styles.row}><Avatar user={user} size={44} /><View style={styles.grow}><Text style={[T.h2, styles.name]}>{user.name}</Text>{user.id === group.owner_id && <Text style={[T.small, { color: C.blue }]}>作成者</Text>}</View>{owner && user.id !== me.id && button('外す', () => setConfirm(user), true, false, `${user.name}さんを外す`)}</View>)}
      {owner && <><Text style={T.h2}>友達を追加</Text>{friends.filter(user => !group.members.some(member => member.id === user.id)).map(user => <View key={user.id} style={styles.row}><Avatar user={user} size={44} /><Text style={[T.body, styles.grow, styles.name]}>{user.name}</Text>{button('追加', () => void mutate(`/groups/${group.id}/members`, 'POST', { user_id: user.id }), true, false, `${user.name}さんを追加`)}</View>)}<Text style={T.sub}>追加できるのは自分の友達だけです。</Text></>}
      {confirm ? <View style={styles.confirm}><Text style={T.body}>{confirm.id === me.id ? 'このグループから抜けますか？' : `${confirm.name}さんをグループから外しますか？`}</Text>{confirm.id === me.id && owner && <Text style={T.sub}>{group.members.length > 1 ? '残ったメンバーのうち、ユーザーIDが最も小さい人が作成者になります。' : '最後の1人なのでグループは削除されます。'}</Text>}{button('確定する', () => void mutate(`/groups/${group.id}/members/${confirm.id}`, 'DELETE', undefined, confirm.id === me.id))}{button('やめる', () => setConfirm(null), true)}</View> : button('グループから抜ける', () => setConfirm(me), true)}
    </ScrollView>
  </Sheet>;
}
const styles = StyleSheet.create({
  content: { padding: 16, paddingBottom: 32, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 4 },
  grow: { flex: 1, minWidth: 0 },
  // 長い名前では名前側だけを折り返し、ボタンは縮めずに画面内へ収める
  name: { flexShrink: 1 },
  action: { flexShrink: 0 },
  confirm: { backgroundColor: C.white, borderRadius: 22, padding: 16, gap: 12 },
});
