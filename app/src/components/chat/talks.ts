// トーク一覧のページ結合（#136）。定期取得は先頭ページだけを取り直し、読み込み済みの過去ページは残す。
import type { Talk } from '../../api';

export const TALKS_PAGE_SIZE = 50;

/** APIと同じ並び（最終メッセージ時刻・ID・イベントID）で比較する。 */
function compareTalks(a: Talk, b: Talk): number {
  return (a.last?.created_at ?? a.event.created_at) - (b.last?.created_at ?? b.event.created_at)
    || (a.last?.id ?? 0) - (b.last?.id ?? 0)
    || a.event.id - b.event.id;
}

/** 確定した先頭範囲は置き換え、それより古い読み込み済みページだけを残す。 */
export function mergeFirstPage(current: Talk[], first: Talk[], next: string | null): Talk[] {
  if (next === null || first.length === 0) return first;
  const head = new Set(first.map(t => t.event.id));
  const boundary = first[first.length - 1];
  return [...first, ...current.filter(t => !head.has(t.event.id) && compareTalks(t, boundary) < 0)];
}

/** 次のページを後ろに足す。取得中に並びが変わっても同じイベントを二重に出さない */
export function appendPage(current: Talk[], page: Talk[]): Talk[] {
  const seen = new Set(current.map(t => t.event.id));
  return [...current, ...page.filter(t => !seen.has(t.event.id))];
}
