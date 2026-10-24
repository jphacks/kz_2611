// 認証（登録・ログイン）
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { api, setToken, Me } from '../api';
import { C, S, T } from '../ui/theme';
import { errMsg } from '../lib/util';

export function AuthScreen({ onDone }: { onDone: (me: Me) => void }) {
  const [mode, setMode] = useState<'login' | 'register'>('register');
  const [handle, setHandle] = useState(''); const [name, setName] = useState(''); const [password, setPassword] = useState('');
  const [err, setErr] = useState(''); const [busy, setBusy] = useState(false);
  const submit = async () => {
    setBusy(true); setErr('');
    try {
      const r = await api<{ token: string; user: Me }>('/' + mode, { body: mode === 'login' ? { handle, password } : { handle, name, password } });
      await setToken(r.token); onDone(r.user);
    } catch (e) { setErr(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <View style={[S.screen, { padding: 24, justifyContent: 'center', gap: 12 }]}>
      <Text style={T.date}>FUKKARU</Text>
      <Text style={T.screenTitle}>{mode === 'login' ? 'ログイン' : 'はじめる'}</Text>
      <TextInput style={S.input} placeholder="ID（英数字）" autoCapitalize="none" value={handle} onChangeText={setHandle} />
      {mode === 'register' && <TextInput style={S.input} placeholder="名前" value={name} onChangeText={setName} />}
      <TextInput style={S.input} placeholder="パスワード（8文字以上）" secureTextEntry value={password} onChangeText={setPassword} onSubmitEditing={submit} />
      {!!err && <Text style={S.error}>{err}</Text>}
      <Pressable style={[S.btn, busy && { opacity: 0.5 }]} disabled={busy} onPress={submit}><Text style={S.btnText}>{mode === 'login' ? 'ログイン' : '登録する'}</Text></Pressable>
      <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')}>
        <Text style={[T.sub, { textAlign: 'center', color: C.ink, textDecorationLine: 'underline' }]}>{mode === 'login' ? 'はじめての人は登録' : 'アカウントがある人はログイン'}</Text>
      </Pressable>
    </View>
  );
}
