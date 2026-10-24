import type { Message } from '../../api';

/** 送信結果と差分取得の競合をIDでまとめる。 */
export function mergeMessages(current: Message[], incoming: Message[]): Message[] {
  return [...new Map([...current, ...incoming].map(m => [m.id, m])).values()].sort((a, b) => a.id - b.id);
}
export function canJoin(event: { joined: boolean; is_host: boolean; count: number; capacity: number; expires_at: number }, now: number) {
  return !event.joined && !event.is_host && event.count < event.capacity && event.expires_at > now;
}
