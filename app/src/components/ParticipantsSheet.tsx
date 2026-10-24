import { useEffect, useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { UserProfileSheet } from './UserProfileSheet';
import type { EventItem, Me } from '../api';
import { Avatar } from '../ui/Avatar';
import { Sheet } from '../ui/Sheet';
import { C, T } from '../ui/theme';
export interface ParticipantsSheetProps { me: Me; event: EventItem | null; onClose: () => void }
export function ParticipantsSheet({ event, me, onClose }: ParticipantsSheetProps) {
  const [selected, setSelected] = useState<{ eventId: number; userId: number } | null>(null);
  useEffect(() => { setSelected(null); }, [event?.id]);
  const selectedId = selected?.eventId === event?.id ? selected?.userId : undefined;
  return <><Sheet visible={!!event && !selectedId} onClose={onClose} height="62%">
    <View style={{ padding: 16, flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1, borderColor: C.line }}>
      <View style={{ flex: 1 }}><Text style={T.small}>{event?.title}</Text><Text style={T.h1}>参加者 <Text style={{ color: C.red }}>{event?.count}</Text></Text></View>
      <Pressable onPress={onClose} accessibilityRole="button" accessibilityLabel="参加者を閉じる" style={{ padding: 12 }}><Text style={T.h2}>×</Text></Pressable>
    </View>
    <ScrollView contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 24 }}>
      {event && [event.host, ...event.members.filter(u => u.id !== event.host.id)].map(user => <Pressable key={user.id} onPress={() => setSelected({ eventId: event.id, userId: user.id })} accessibilityRole="button" accessibilityLabel={`${user.name}のプロフィールを開く`} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 16, borderBottomWidth: 1, borderColor: C.line }}>
        <Avatar user={user} size={44} /><View style={{ flex: 1 }}><Text style={T.h2}>{user.name}</Text><Text style={T.sub}>@{user.handle}</Text></View>
        {user.id === event.host.id && <View style={{ backgroundColor: C.red, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 4 }}><Text style={[T.small, { color: C.white }]}>主催</Text></View>}
      </Pressable>)}
    </ScrollView>
  </Sheet>
    {!!selectedId && <UserProfileSheet me={me} key={selectedId} userId={selectedId} onClose={() => setSelected(null)} />}
  </>;
}
