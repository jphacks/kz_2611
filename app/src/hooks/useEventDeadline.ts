import { useEffect, useState } from 'react';
import type { EventItem } from '../api';
import { isVisible, onVisibilityChange } from './useClock';

/** 毎秒ではなく、次の募集期限と前景復帰のときだけ一覧を再評価する。 */
export function useEventDeadline(events: Pick<EventItem, 'expires_at'>[]) {
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const schedule = () => {
      clearTimeout(timer);
      if (!isVisible()) return;
      const current = Date.now();
      setNow(current);
      const next = events.reduce((soonest, event) => event.expires_at > current
        ? Math.min(soonest, event.expires_at) : soonest, Infinity);
      if (Number.isFinite(next)) timer = setTimeout(schedule, Math.max(1, next - current));
    };
    schedule();
    const unsubscribe = onVisibilityChange(schedule);
    return () => { clearTimeout(timer); unsubscribe(); };
  }, [events]);
  return now;
}
