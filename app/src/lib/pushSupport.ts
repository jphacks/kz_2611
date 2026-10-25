// #87 通知（Web Push）を使えるかの判定と、鍵の変換（ブラウザに依存しない純粋な関数）

export interface PushEnvInfo {
  web: boolean;           // Web 版か
  secure: boolean;        // https（または localhost）か
  serviceWorker: boolean;
  pushManager: boolean;
  notification: boolean;
  userAgent: string;
  touchPoints: number;
  standalone: boolean;    // ホーム画面に追加したアプリとして開いているか
}
export type PushSupport = { ok: true } | { ok: false; reason: string; guide?: string };

/** iPhone・iPad（iPadOS の Safari は Mac と名乗るのでタッチで見分ける） */
export const isIos = (userAgent: string, touchPoints: number) =>
  /iPhone|iPad|iPod/.test(userAgent) || (/Macintosh/.test(userAgent) && touchPoints > 1);

export function pushSupport(e: PushEnvInfo): PushSupport {
  if (!e.web) return { ok: false, reason: '通知はブラウザ版で受け取れます' };
  const ios = isIos(e.userAgent, e.touchPoints);
  // iPhone はホーム画面に追加したアプリだけが通知を受け取れる（iOS 16.4 以降）
  if (ios && !e.standalone) return {
    ok: false, reason: 'iPhoneでは、ホーム画面に追加したアプリで通知を受け取れます',
    guide: 'Safariの共有ボタンから「ホーム画面に追加」を選び、追加したアイコンから開いて、ここで通知をオンにしてください（iOS 16.4以降）',
  };
  if (!e.secure) return { ok: false, reason: '通知は https のページでだけ使えます' };
  if (!e.serviceWorker || !e.pushManager || !e.notification) return ios
    ? { ok: false, reason: 'このiPhoneでは通知を使えません', guide: 'iOS 16.4以降にアップデートしてください' }
    : { ok: false, reason: 'このブラウザは通知に対応していません', guide: 'Android の Chrome やパソコンの Chrome・Edge・Firefox でお試しください' };
  return { ok: true };
}

/** base64url の公開鍵を applicationServerKey 用のバイト列にする */
export function base64UrlToBytes(text: string): Uint8Array<ArrayBuffer> {
  const s = text.replace(/-/g, '+').replace(/_/g, '/');
  const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

/** 購読済みの鍵（ArrayBuffer）と今の鍵が同じか */
export function sameKey(current: ArrayBuffer | null | undefined, key: string) {
  if (!current) return false;
  const a = new Uint8Array(current), b = base64UrlToBytes(key);
  return a.length === b.length && a.every((v, i) => v === b[i]);
}
