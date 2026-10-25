// #87 通知をタップして開いた URL（/?event=<id>）から募集を開く
import { Platform } from 'react-native';

/** "?event=12" から募集の id を取り出す（正の整数だけ） */
export function eventIdFromSearch(search: string): number | undefined {
  const v = new URLSearchParams(search).get('event');
  if (!v || !/^[1-9]\d{0,14}$/.test(v)) return undefined;
  return Number(v);
}

let taken: { id: number | undefined } | null = null;
/**
 * Web で開いた URL の ?event= を1回だけ読み、URL からは消す（読み込み直しで何度も開かないように）。
 * ログイン前に開いた場合は、呼び出し側がログイン後に使う
 */
export function takeEventLink(): number | undefined {
  if (taken) return taken.id;
  taken = { id: undefined };
  if (Platform.OS !== 'web' || typeof window === 'undefined') return undefined;
  const { pathname, search, hash } = window.location;
  taken.id = eventIdFromSearch(search);
  const params = new URLSearchParams(search);
  if (params.has('event')) {
    params.delete('event');
    const q = params.toString();
    window.history.replaceState(window.history.state, '', pathname + (q ? `?${q}` : '') + hash);
  }
  return taken.id;
}
