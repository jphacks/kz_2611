// ★共有: 画面上部の大きな見出し（日付は表示しない: #26）
import { Text, View } from 'react-native';
import { T } from './theme';
export function Header({ title, right }: { title: string; right?: React.ReactNode }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingTop: 14, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-end' }}>
      <Text style={[T.screenTitle, { flex: 1 }]}>{title}</Text>
      {right}
    </View>
  );
}
