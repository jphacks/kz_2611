// #87 通知（Web Push）の購読・解除。Web だけで動く（それ以外は pushSupport が案内を返す）
import { Platform } from 'react-native';
import { api, ApiError } from '../api';
import { pushSupport, sameKey, base64UrlToBytes, type PushSupport } from './pushSupport';

const web = () => Platform.OS === 'web' && typeof window !== 'undefined' && typeof navigator !== 'undefined';

export function currentPushSupport(): PushSupport {
  if (!web()) return pushSupport({ web: false, secure: false, serviceWorker: false, pushManager: false, notification: false, userAgent: '', touchPoints: 0, standalone: false });
  return pushSupport({
    web: true,
    secure: window.isSecureContext,
    serviceWorker: 'serviceWorker' in navigator,
    pushManager: 'PushManager' in window,
    notification: 'Notification' in window,
    userAgent: navigator.userAgent,
    touchPoints: navigator.maxTouchPoints || 0,
    standalone: window.matchMedia?.('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true,
  });
}

/** 通知の許可の状態（許可を求めない） */
export const pushPermission = (): NotificationPermission => (web() && 'Notification' in window ? Notification.permission : 'default');

/** この端末の購読（無ければ null）。許可は求めない */
export async function currentSubscription(): Promise<PushSubscription | null> {
  if (!web() || !('serviceWorker' in navigator)) return null;
  const reg = await navigator.serviceWorker.getRegistration('/');
  return reg?.pushManager ? reg.pushManager.getSubscription() : null;
}

export async function fetchPushKey() {
  return (await api<{ key: string | null }>('/push/key')).key;
}

/**
 * 通知をオンにする。必ずボタンを押した処理の中から最初に呼ぶ（iPhone は押した直後でないと許可を求められない）
 */
export async function enablePush(key: string) {
  const permission = await Notification.requestPermission();
  if (permission === 'denied') throw new Error('通知がブロックされています。ブラウザやiPhoneの設定でこのアプリの通知を許可してください');
  if (permission !== 'granted') throw new Error('通知が許可されませんでした');
  await navigator.serviceWorker.register('/sw.js', { scope: '/' });
  const reg = await navigator.serviceWorker.ready;
  const subscribe = () => reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(key) });
  let sub = await reg.pushManager.getSubscription();
  // サーバーの鍵が変わっていたら購読し直す
  if (sub && !sameKey(sub.options.applicationServerKey, key)) { await sub.unsubscribe(); sub = null; }
  if (!sub) sub = await subscribe();
  try {
    await api('/push/subscribe', { body: sub.toJSON() });
  } catch (e) {
    // 前に別のアカウントで使っていた届け先なら、新しい届け先を作り直して登録する
    if (!(e instanceof ApiError && e.status === 409)) throw e;
    await sub.unsubscribe();
    await api('/push/subscribe', { body: (await subscribe()).toJSON() });
  }
}

/** この端末の通知をオフにする（サーバーから消し、ブラウザの購読も解除）。他の端末には触らない */
export async function disablePush() {
  const sub = await currentSubscription();
  if (!sub) return;
  try { await api('/push/subscribe', { method: 'DELETE', body: { endpoint: sub.endpoint } }); }
  finally { await sub.unsubscribe(); }
}

/** ログアウトの前に呼ぶ。失敗してもログアウトは止めない（購読を解除すれば届け先は送信時に 410 で消える） */
export async function removePushOnLogout() {
  try { await disablePush(); } catch { /* 何もしない */ }
}
