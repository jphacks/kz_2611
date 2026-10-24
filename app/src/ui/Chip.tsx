// ★共有: 四角いタブ（全体／研究室…、選択肢）
import { Pressable, Text } from 'react-native';
import { S } from './theme';
export function Chip({ label, on, onPress }: { label: string; on?: boolean; onPress?: () => void }) {
  return (
    <Pressable onPress={onPress} style={[S.chip, on && S.chipOn]} accessibilityRole="button" accessibilityState={{ selected: !!on }}>
      <Text style={[S.chipText, on && S.chipTextOn]}>{label}</Text>
    </Pressable>
  );
}
