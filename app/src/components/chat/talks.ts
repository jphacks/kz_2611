// トーク一覧のページ結合（#136）。定期取得は先頭ページだけを取り直し、読み込み済みの過去ページは残す。
import type { Talk } from '../../api';

export const TALKS_PAGE_SIZE = 50;

/** 先頭ページを最新にし、読み込み済みの古い行はその後ろに残す（同じイベントは先頭ページ側だけ） */
export function mergeFirstPage(current: Talk[], first: Talk[]): Talk[] {
  const head = new Set(first.map(t => t.event.id));
  return [...first, ...current.filter(t => !head.has(t.event.id))];
}

/** 次のページを後ろに足す。取得中に並びが変わっても同じイベントを二重に出さない */
export function appendPage(current: Talk[], page: Talk[]): Talk[] {
  const seen = new Set(current.map(t => t.event.id));
  return [...current, ...page.filter(t => !seen.has(t.event.id))];
}
