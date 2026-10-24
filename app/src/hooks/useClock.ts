import { useSyncExternalStore } from 'react';
import { AppState, Platform } from 'react-native';

export const isVisible = () => Platform.OS === 'web'
  ? typeof document === 'undefined' || document.visibilityState === 'visible'
  : AppState.currentState === 'active';

export function onVisibilityChange(fn: () => void) {
  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    document.addEventListener('visibilitychange', fn);
    return () => document.removeEventListener('visibilitychange', fn);
  }
  const subscription = AppState.addEventListener('change', fn);
  return () => subscription.remove();
}

// 全カードの時刻部品で1本のタイマーを共有する。
let now = Date.now();
let timer: ReturnType<typeof setInterval> | undefined;
let stopVisibility: (() => void) | undefined;
const listeners = new Set<() => void>();
const getSnapshot = () => now;
const tick = () => { now = Date.now(); listeners.forEach(fn => fn()); };
const sync = () => {
  clearInterval(timer);
  if (isVisible()) { tick(); timer = setInterval(tick, 1000); }
};
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  if (listeners.size === 1) { stopVisibility = onVisibilityChange(sync); sync(); }
  return () => {
    listeners.delete(listener);
    if (!listeners.size) { clearInterval(timer); stopVisibility?.(); stopVisibility = undefined; }
  };
};

/** 時刻依存部品だけを購読させる。非表示中と購読者がいない間は停止する。 */
export function useClock() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
