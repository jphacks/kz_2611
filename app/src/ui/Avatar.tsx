// ★共有: 写真アイコン（丸）。画像が無ければ名前の頭文字
import { Image, Text, View } from 'react-native';
import { C, FONT } from './theme';
import type { User } from '../api';

export function Avatar({ user, size = 32, border }: { user: Pick<User, 'name' | 'avatar'>; size?: number; border?: string }) {
  const style = { width: size, height: size, borderRadius: size / 2, borderWidth: border ? 2 : 0, borderColor: border };
  if (user.avatar) return <Image source={{ uri: user.avatar }} style={style} />;
  return (
    <View style={[style, { backgroundColor: C.ink, alignItems: 'center', justifyContent: 'center' }]}>
      <Text style={{ fontFamily: FONT, color: C.white, fontWeight: '800', fontSize: size * 0.42 }}>{user.name.slice(0, 1)}</Text>
    </View>
  );
}
