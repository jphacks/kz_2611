import { useCallback, useEffect, useSyncExternalStore } from 'react';
import type { Me } from '../api';
import { isVisible, onVisibilityChange } from './useClock';
import { socialStore } from './socialStore';

/** マウント（タブ復帰）、前景復帰、明示的な変更通知だけで取得する。 */
export function useSocialData(me: Me) {
  const store = socialStore(me.id);
  const data = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot);
  const refresh = useCallback(() => store.refresh(true), [store]);
  useEffect(() => {
    const resume = () => { if (isVisible()) void store.refresh(); };
    resume();
    return onVisibilityChange(resume);
  }, [store]);
  return { ...data, refresh };
}

export function refreshSocialData(me: Me) {
  return socialStore(me.id).refresh(true);
}
