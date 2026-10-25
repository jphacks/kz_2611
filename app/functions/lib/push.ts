// Web Push の暗号化（RFC 8291 aes128gcm）と VAPID（RFC 8292 ES256）。ライブラリを使わず Web Crypto だけで行う。
// テストから単体で読めるように、値の import はしない（型だけ）。
import type { D1 } from './core';

type Bytes = Uint8Array<ArrayBuffer>;
const enc = new TextEncoder();

export interface PushTarget { endpoint: string; p256dh: string; auth: string; user_id: number }
export interface PushMessage { kind: 'created' | 'joined' | 'full'; title: string; body: string; event_id: number; tag: string }
export interface VapidKeys { publicKey: string; privateKey: string; subject: string }

// ---- base64url ----
export function b64urlEncode(bytes: Uint8Array): string {
  let s = '';
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
/** base64url を厳密に読む（使えない文字があれば例外） */
export function b64urlDecode(text: string): Bytes {
  if (!/^[A-Za-z0-9_-]*={0,2}$/.test(text)) throw new Error('base64url ではありません');
  const s = text.replace(/=+$/, '').replace(/-/g, '+').replace(/_/g, '/');
  if (s.length % 4 === 1) throw new Error('base64url の長さが正しくありません');
  const bin = atob(s + '='.repeat((4 - (s.length % 4)) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
function concat(...parts: Uint8Array[]): Bytes {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let i = 0;
  for (const p of parts) { out.set(p, i); i += p.length; }
  return out;
}

// ---- 届け先の確認（SSRF 対策） ----
// 主要ブラウザのプッシュサービスだけに送る。完全一致か、末尾一致（"." 始まり）
const PUSH_HOSTS = ['fcm.googleapis.com', 'updates.push.services.mozilla.com', 'web.push.apple.com', '.push.apple.com', '.notify.windows.com'];
/** 送ってよい届け先なら正規化した URL、だめなら null。https・既定ポート・認証情報なし・許可したホストだけ */
export function pushEndpoint(raw: unknown): string | null {
  if (typeof raw !== 'string' || raw.length > 1024 || /\s/.test(raw)) return null;
  let url: URL;
  try { url = new URL(raw); } catch { return null; }
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash) return null;
  const host = url.hostname;
  if (!PUSH_HOSTS.some(h => h.startsWith('.') ? host.endsWith(h) && host.length > h.length : host === h)) return null;
  if (url.pathname.length < 2) return null;
  return url.href;
}
/** 端末の公開鍵（P-256 の非圧縮点 65 バイト）と認証用の秘密（16 バイト）か確かめる */
export async function validKeys(p256dh: unknown, auth: unknown): Promise<boolean> {
  if (typeof p256dh !== 'string' || typeof auth !== 'string' || p256dh.length > 100 || auth.length > 40) return false;
  try {
    const pub = b64urlDecode(p256dh), secret = b64urlDecode(auth);
    if (pub.length !== 65 || pub[0] !== 4 || secret.length !== 16) return false;
    await crypto.subtle.importKey('raw', pub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
    return true;
  } catch { return false; }
}

// ---- 鍵 ----
/** base64url の秘密鍵 d と公開鍵（非圧縮点）から P-256 の秘密鍵を作る */
export function importPrivateKey(d: string, publicKey: string, alg: 'ECDH' | 'ECDSA') {
  const pub = b64urlDecode(publicKey);
  if (pub.length !== 65 || pub[0] !== 4) throw new Error('公開鍵の形式が正しくありません');
  const jwk: JsonWebKey = { kty: 'EC', crv: 'P-256', d, x: b64urlEncode(pub.slice(1, 33)), y: b64urlEncode(pub.slice(33)), ext: false };
  return crypto.subtle.importKey('jwk', jwk, { name: alg, namedCurve: 'P-256' }, false, alg === 'ECDH' ? ['deriveBits'] : ['sign']);
}
async function hkdf(salt: Bytes, ikm: Bytes, info: Bytes, bytes: number): Promise<Bytes> {
  const key = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await crypto.subtle.deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, bytes * 8));
}

// ---- RFC 8291: メッセージの暗号化（1レコードの aes128gcm） ----
export const RECORD_SIZE = 4096;
export interface EncryptOptions { salt?: Bytes; sender?: { privateKey: CryptoKey; publicKey: Bytes } }
export async function encrypt(plaintext: Uint8Array, uaPublic: Bytes, authSecret: Bytes, opts: EncryptOptions = {}): Promise<Bytes> {
  // 1レコードに収まる長さだけ（区切り 1 バイトと GCM のタグ 16 バイトを除く）
  if (plaintext.length > RECORD_SIZE - 17 - 86) throw new Error('通知の内容が長すぎます');
  let sender = opts.sender;
  if (!sender) {
    const pair = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']) as CryptoKeyPair;
    sender = { privateKey: pair.privateKey, publicKey: new Uint8Array(await crypto.subtle.exportKey('raw', pair.publicKey) as ArrayBuffer) };
  }
  const salt = opts.salt ?? crypto.getRandomValues(new Uint8Array(16));
  const uaKey = await crypto.subtle.importKey('raw', uaPublic, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const ecdhSecret = new Uint8Array(await crypto.subtle.deriveBits({ name: 'ECDH', public: uaKey }, sender.privateKey, 256));
  const keyInfo = concat(enc.encode('WebPush: info\0'), uaPublic, sender.publicKey);
  const ikm = await hkdf(authSecret, ecdhSecret, keyInfo, 32);
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const key = await crypto.subtle.importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const padded = concat(plaintext, new Uint8Array([2])); // 最後のレコードの区切り
  const cipher = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv: nonce }, key, padded));
  const header = new Uint8Array(21);
  header.set(salt, 0);
  new DataView(header.buffer).setUint32(16, RECORD_SIZE);
  header[20] = sender.publicKey.length;
  return concat(header, sender.publicKey, cipher);
}

// ---- RFC 8292: VAPID ----
/** Authorization ヘッダの値（vapid t=<JWT>, k=<公開鍵>）。有効期限は12時間 */
export async function vapidAuthorization(endpoint: string, keys: VapidKeys, nowMs = Date.now()): Promise<string> {
  const header = b64urlEncode(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const claims = b64urlEncode(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(nowMs / 1000) + 12 * 3600, sub: keys.subject })));
  const unsigned = `${header}.${claims}`;
  const key = await importPrivateKey(keys.privateKey, keys.publicKey, 'ECDSA');
  // Web Crypto の ECDSA 署名は r||s（64 バイト）で、JWS の ES256 の形と同じ
  const sig = new Uint8Array(await crypto.subtle.sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(unsigned)));
  return `vapid t=${unsigned}.${b64urlEncode(sig)}, k=${keys.publicKey}`;
}

type Fetch = (url: string, init: RequestInit) => Promise<{ status: number }>;
/** 1つの届け先へ送り、プッシュサービスの HTTP ステータスを返す。リダイレクトは追わない */
export async function sendPush(target: PushTarget, message: PushMessage, keys: VapidKeys, fetcher: Fetch = fetch): Promise<number> {
  const endpoint = pushEndpoint(target.endpoint);
  if (!endpoint) return 410; // 許可していない届け先は送らず、消す扱いにする
  const body = await encrypt(enc.encode(JSON.stringify(message)), b64urlDecode(target.p256dh), b64urlDecode(target.auth));
  const res = await fetcher(endpoint, {
    method: 'POST', redirect: 'manual', body,
    headers: { authorization: await vapidAuthorization(endpoint, keys), ttl: '3600', urgency: 'high',
      'content-encoding': 'aes128gcm', 'content-type': 'application/octet-stream' },
  });
  return res.status;
}

/** まとめて送る。404/410（期限切れ・解除済み）の届け先は DB から消す。ログには届け先の URL や鍵を出さない */
export async function dispatch(db: D1, targets: PushTarget[], message: PushMessage, keys: VapidKeys, fetcher: Fetch = fetch) {
  const result = { sent: 0, removed: 0, failed: 0 };
  await Promise.all(targets.map(async t => {
    try {
      const status = await sendPush(t, message, keys, fetcher);
      if (status === 404 || status === 410) {
        await db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').bind(t.endpoint).run();
        result.removed++;
      } else if (status >= 200 && status < 300) result.sent++;
      else { result.failed++; console.warn('通知の送信に失敗しました', status); }
    } catch (e) {
      result.failed++;
      console.warn('通知の送信に失敗しました', e instanceof Error ? e.name : 'error');
    }
  }));
  return result;
}
