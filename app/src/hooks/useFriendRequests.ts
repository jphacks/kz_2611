import { useCallback, useEffect, useRef, useState } from 'react';
import { api, type FriendRequests } from '../api';
import { errMsg } from '../lib/util';
import { isVisible, onVisibilityChange } from './useClock';

/** 届いた申請・送った申請。マウント（タブ復帰）、前景復帰、変更後の refresh だけで取得する。 */
export function useFriendRequests() {
  const [requests, setRequests] = useState<FriendRequests>({ received: [], sent: [] });
  const [error, setError] = useState('');
  const generation = useRef(0);
  const refresh = useCallback(async () => {
    // 変更前に出した遅い応答で巻き戻さない。
    const current = ++generation.current;
    try {
      const result = await api<FriendRequests>('/friend-requests');
      if (current === generation.current) { setRequests(result); setError(''); }
    } catch (e) { if (current === generation.current) setError(errMsg(e)); }
  }, []);
  useEffect(() => {
    const resume = () => { if (isVisible()) void refresh(); };
    resume();
    const stop = onVisibilityChange(resume);
    return () => { stop(); generation.current++; };
  }, [refresh]);
  return { ...requests, error, refresh };
}
