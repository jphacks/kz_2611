import { Pressable, ScrollView, Text, View } from 'react-native';
import type { EventItem } from '../api';
import { Avatar } from '../ui/Avatar';
import { Sheet } from '../ui/Sheet';
import { C, T } from '../ui/theme';
export interface ParticipantsSheetProps { event: EventItem | null; onClose: () => void }
export function ParticipantsSheet({ event, onClose }: ParticipantsSheetProps) {
  return <Sheet visible={!!event} onClose={onClose} height="62%">
    <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: C.line }}>
      <View style={{ flex: 1 }}><Text style={T.small}>{event?.title}</Text><Text style={T.h1}>参加者 <Text style={{ color: C.red }}>{event?.count}</Text></Text></View>
      <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="参加者を閉じる" style={{ padding: 12 }}><Text style={T.h2}>×</Text></Pressable>
    </View>
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
      {event && [event.host, ...event.members.filter(u => u.id !== event.host.id)].map(user => <View key={user.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, borderBottomWidth: 1, borderColor: C.line }}>
        <Avatar user={user} size={44} /><View style={{ flex: 1 }}><Text style={T.h2}>{user.name}</Text><Text style={T.sub}>@{user.handle}</Text></View>
        {user.id === event.host.id && <Text style={[T.small, { color: C.red }]}>主催</Text>}
      </View>)}
    </ScrollView>
  </Sheet>;
}
