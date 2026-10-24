// 掲示板のイベントカード（担当 Issue で実装する）
import { Text, View } from 'react-native';
import type { EventItem } from '../api';
import { C, T } from '../ui/theme';

export interface EventCardProps {
  event: EventItem;
  now: number;
  onOpen: () => void;      // カードをタップ → チャット
  onJoin: () => void;      // 主催者の丸を右へスワイプ → 参加
  onPressMembers: () => void; // 参加者のアイコンをタップ → 参加者の詳細
}
export function EventCard({ event }: EventCardProps) {
  return <View style={{ backgroundColor: C.surface, padding: 16, marginBottom: 12 }}><Text style={T.h1}>{event.title}</Text></View>;
}
