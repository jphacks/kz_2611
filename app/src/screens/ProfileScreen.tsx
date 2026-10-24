import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { api, type Me } from '../api';
import type { ScreenProps } from '../Main';
import { Header } from '../ui/Header';
import { Avatar } from '../ui/Avatar';
import { C, S, T } from '../ui/theme';
import { errMsg } from '../lib/util';
import { avatarResize, jpegDataUrl, profilePatch } from '../components/profile/profile';

export function ProfileScreen(props: ScreenProps) {
  const [name, setName] = useState(props.me.name);
  const [avatar, setAvatar] = useState(props.me.avatar);
  const [busy, setBusy] = useState<'image' | 'save' | 'logout' | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const lock = useRef(false);
  useEffect(() => { setName(props.me.name); setAvatar(props.me.avatar); }, [props.me.name, props.me.avatar]);
  const changed = name.trim() !== props.me.name || avatar !== props.me.avatar;

  async function chooseImage() {
    if (lock.current) return;
    lock.current = true; setBusy('image'); setError(''); setNotice('');
    try {
      // Webではユーザー操作から直接ピッカーを開く（権限要求は不要）。
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) throw new Error('写真へのアクセスを許可してから、もう一度お試しください');
      }
      const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], allowsMultipleSelection: false });
      if (result.canceled) return;
      const asset = result.assets[0];
      const context = ImageManipulator.manipulate(asset.uri, { maxWidth: 256, maxHeight: 256 });
      try {
        context.resize(avatarResize(asset.width, asset.height));
        const image = await context.renderAsync();
        try {
          const jpeg = await image.saveAsync({ format: SaveFormat.JPEG, compress: 0.75, base64: true });
          setAvatar(jpegDataUrl(jpeg.base64));
        } finally { image.release(); }
      } finally { context.release(); }
    } catch (e) { setError(errMsg(e)); }
    finally { lock.current = false; setBusy(null); }
  }

  async function save() {
    if (lock.current) return;
    setError(''); setNotice('');
    try {
      const body = profilePatch(props.me, name, avatar);
      if (!Object.keys(body).length) return;
      lock.current = true; setBusy('save');
      const { user } = await api<{ user: Me }>('/me', { method: 'PATCH', body });
      props.setMe(user);
      setName(user.name); setAvatar(user.avatar); setNotice('プロフィールを保存しました');
    } catch (e) { setError(errMsg(e)); }
    finally { lock.current = false; setBusy(null); }
  }

  return (
    <View style={S.screen}>
      <Header title="プロフィール" />
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <View style={styles.identity}>
          <Avatar user={{ name: name.trim() || props.me.name, avatar }} size={112} />
          <View style={styles.identityText}>
            <Text style={T.h1}>{props.me.name}</Text>
            <Text style={T.sub}>@{props.me.handle}</Text>
          </View>
        </View>
        <View style={styles.photoActions}>
          <Pressable accessibilityRole="button" disabled={!!busy} onPress={chooseImage} style={[S.btnGhost, styles.photoButton, busy && styles.disabled]}>
            <Text style={S.btnGhostText}>{busy === 'image' ? '画像を処理中…' : '写真を変更'}</Text>
          </Pressable>
          {avatar !== null && <Pressable accessibilityRole="button" disabled={!!busy} onPress={() => { setAvatar(null); setError(''); setNotice(''); }} style={styles.remove}>
            <Text style={T.sub}>写真を削除</Text>
          </Pressable>}
        </View>
        <Text style={T.small}>写真は長辺256px・JPEGに縮小して保存します</Text>
        <View style={styles.field}>
          <Text style={T.h2}>名前</Text>
          <TextInput accessibilityLabel="名前" value={name} editable={!busy} onChangeText={value => { setName(value); setError(''); setNotice(''); }} maxLength={20} style={S.input} placeholder="名前を入力" placeholderTextColor={C.muted} returnKeyType="done" onSubmitEditing={save} />
          <Text style={T.small}>{name.length} / 20文字</Text>
        </View>
        <View style={styles.id}>
          <Text style={T.small}>ID</Text>
          <Text selectable style={T.body}>@{props.me.handle}</Text>
          <Text style={T.sub}>IDは変更できません</Text>
        </View>
        {!!error && <Text accessibilityRole="alert" style={S.error}>{error}</Text>}
        {!!notice && <Text accessibilityLiveRegion="polite" style={T.body}>{notice}</Text>}
        <Pressable accessibilityRole="button" accessibilityState={{ disabled: !!busy || !changed }} disabled={!!busy || !changed} onPress={save} style={[S.btn, (!!busy || !changed) && styles.disabled]}>
          {busy === 'save' ? <ActivityIndicator color={C.white} accessibilityLabel="保存中" /> : <Text style={S.btnText}>変更を保存</Text>}
        </Pressable>
        <View style={styles.footer}>
          <Pressable accessibilityRole="button" disabled={!!busy} onPress={() => { if (!lock.current) { lock.current = true; setBusy('logout'); props.logout(); } }} style={[S.btnGhost, busy && styles.disabled]}>
            <Text style={S.btnGhostText}>ログアウト</Text>
          </Pressable>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: 16, paddingBottom: 32, gap: 16, width: '100%', maxWidth: 640, alignSelf: 'center' },
  identity: { flexDirection: 'row', alignItems: 'center', gap: 24, paddingVertical: 16 },
  identityText: { flex: 1, gap: 6 },
  photoActions: { flexDirection: 'row', alignItems: 'center', gap: 20 },
  photoButton: { paddingHorizontal: 24 },
  remove: { paddingVertical: 14 },
  field: { gap: 10, marginTop: 16 },
  id: { borderTopWidth: 1, borderTopColor: C.line, paddingVertical: 16, gap: 8 },
  footer: { marginTop: 16, paddingTop: 24, borderTopWidth: 1, borderTopColor: C.line },
  disabled: { opacity: 0.45 },
});
