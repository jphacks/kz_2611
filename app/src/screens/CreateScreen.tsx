// 誘う画面（担当 Issue で実装する。今は仮の画面）
import { Text, View } from 'react-native';
import { Header } from '../ui/Header';
import { S, T } from '../ui/theme';
import type { ScreenProps } from '../Main';

export function CreateScreen(_p: ScreenProps) {
  return (
    <View style={S.screen}>
      <Header title="誘う" />
      <Text style={[T.sub, S.pad]}>準備中</Text>
    </View>
  );
}
