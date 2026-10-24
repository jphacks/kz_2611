// ★共有: 画面上部の「日付＋大きな見出し」
import { Text, View } from 'react-native';
import { T } from './theme';
const W = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const M = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
export function Header({ title, right }: { title: string; right?: React.ReactNode }) {
  const d = new Date();
  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12, flexDirection: 'row', alignItems: 'flex-end' }}>
      <View style={{ flex: 1 }}>
        <Text style={T.date}>{`${W[d.getDay()]} · ${M[d.getMonth()]} ${d.getDate()}`}</Text>
        <Text style={T.screenTitle}>{title}</Text>
      </View>
      {right}
    </View>
  );
}
