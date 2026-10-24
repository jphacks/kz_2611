// ★共有: 小さな共通処理
import { useEffect, useRef } from 'react';
import { AppState, Platform } from 'react-native';

export const errMsg = (e: unknown) => (e instanceof Error ? e.message : '問題が起きました');

/** 定期取得。画面が見えていないときは止め、失敗したら間隔を空け、前の取得が終わる前に次を出さない */
export function usePolling(fn: () => Promise<unknown>, ms: number, enabled = true) {
  const ref = useRef(fn); ref.current = fn;
  useEffect(() => {
    if (!enabled) return;
    let stop = false, timer: ReturnType<typeof setTimeout> | undefined, fails = 0;
    const visible = () => (Platform.OS === 'web' ? typeof document === 'undefined' || document.visibilityState === 'visible' : AppState.currentState === 'active');
    const tick = async () => {
      if (stop) return;
      if (visible()) { try { await ref.current(); fails = 0; } catch { fails = Math.min(fails + 1, 5); } }
      if (!stop) timer = setTimeout(tick, ms * 2 ** fails);
    };
    tick();
    return () => { stop = true; if (timer) clearTimeout(timer); };
  }, [ms, enabled]);
}
