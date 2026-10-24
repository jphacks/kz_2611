import type { EventItem } from '../../api';

type OrderedEvent = Pick<EventItem, 'is_host' | 'expires_at'>;

/** 主催の募集を先にし、各グループ内では締切が近い順にする。 */
export function compareBoardEvents(a: OrderedEvent, b: OrderedEvent) {
  return a.is_host === b.is_host ? a.expires_at - b.expires_at : a.is_host ? -1 : 1;
}
