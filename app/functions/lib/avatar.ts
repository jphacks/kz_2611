// プロフィール画像（avatar）の入力チェック（#131）。
// docs/api.md の契約: 画像の data URL、200KB以内、null で削除。
// 許可するのは PNG / JPEG / WebP のラスター画像だけ。SVG は img として表示したときの
// スクリプト実行を否定できないため受け付けない。
// Workers には画像デコーダが無いので、base64 を復号して画像のシグネチャ・縦横を読む。
import { HttpError } from './core';

/** 復号後の画像の上限（docs/api.md の 200KB） */
export const AVATAR_MAX_BYTES = 200 * 1024;
/** 受信する data URL 全体の上限（base64 で約 210KB になる。メモリ保護） */
const AVATAR_MAX_URL_LENGTH = 280000;
/** 縦横と画素数の上限（展開すると巨大になる画像を弾く） */
const AVATAR_MAX_SIDE = 4096;
const AVATAR_MAX_PIXELS = 4_000_000;

const MESSAGE = '画像は200KB以内のPNG・JPEG・WebPにしてください';
const TOO_LARGE = '画像の縦横が大きすぎます。小さい画像を選んでください';

type Kind = 'png' | 'jpeg' | 'webp';
const KINDS: Record<string, Kind> = {
  'image/png': 'png',
  'image/jpeg': 'jpeg',
  'image/webp': 'webp',
};
// base64 の data URL だけを受け付ける（パラメータ・空白・URL-safe は不可）
const DATA_URL = /^data:(image\/[a-z0-9.+-]+);base64,([A-Za-z0-9+/]+={0,2})$/i;

/**
 * avatar の入力を検証する。null は削除としてそのまま返し、画像の data URL は
 * そのまま保存できる文字列として返す。不正なら HttpError(400) を投げる。
 */
export function validateAvatar(value: unknown): string | null {
  if (value === null) return null;
  if (typeof value !== 'string' || value.length > AVATAR_MAX_URL_LENGTH) throw new HttpError(400, MESSAGE);
  const m = DATA_URL.exec(value);
  if (!m) throw new HttpError(400, MESSAGE);
  const kind = KINDS[m[1].toLowerCase()];
  if (!kind) throw new HttpError(400, MESSAGE);
  const bytes = decodeBase64(m[2]);
  // 復号後のサイズで 200KB を判定する
  if (!bytes || bytes.length === 0 || bytes.length > AVATAR_MAX_BYTES) throw new HttpError(400, MESSAGE);
  const size = imageSize(kind, bytes);
  // MIME と実体が違う・画像でない
  if (!size) throw new HttpError(400, MESSAGE);
  if (size.width > AVATAR_MAX_SIDE || size.height > AVATAR_MAX_SIDE || size.width * size.height > AVATAR_MAX_PIXELS) {
    throw new HttpError(400, TOO_LARGE);
  }
  return value;
}

/** 正規の base64 だけを復号する（不正な文字・詰め物・余分なビットは null） */
function decodeBase64(s: string): Uint8Array | null {
  if (s.length % 4 !== 0) return null;
  let binary: string;
  try { binary = atob(s); } catch { return null; }
  if (btoa(binary) !== s) return null;
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function imageSize(kind: Kind, b: Uint8Array): { width: number; height: number } | null {
  if (kind === 'png') return pngSize(b);
  if (kind === 'jpeg') return jpegSize(b);
  return webpSize(b);
}

const be32 = (b: Uint8Array, i: number) => ((b[i] << 24) | (b[i + 1] << 16) | (b[i + 2] << 8) | b[i + 3]) >>> 0;
const ascii = (b: Uint8Array, i: number) => String.fromCharCode(b[i], b[i + 1], b[i + 2], b[i + 3]);

/** PNG: シグネチャ・IHDR（8〜28バイト目）と IDAT の有無だけを読む（中身は展開しない） */
function pngSize(b: Uint8Array) {
  const signature = [137, 80, 78, 71, 13, 10, 26, 10];
  if (b.length < 33 || !signature.every((v, i) => b[i] === v)) return null;
  if (be32(b, 8) !== 13 || ascii(b, 12) !== 'IHDR') return null;
  const width = be32(b, 16), height = be32(b, 20);
  const depth = b[24], color = b[25];
  if (!width || !height) return null;
  if (![1, 2, 4, 8, 16].includes(depth)) return null;
  if (![0, 2, 3, 4, 6].includes(color)) return null;
  if (b[26] !== 0 || b[27] !== 0 || b[28] > 1) return null; // 圧縮・フィルタ・インタレース
  // チャンクをたどって画像データ（IDAT）と終端（IEND）があることを確かめる
  let i = 8, idat = false, end = false;
  while (i + 12 <= b.length) {
    const len = be32(b, i);
    if (len > b.length - i - 12) return null;
    const type = ascii(b, i + 4);
    if (type === 'IDAT') idat = true;
    i += 12 + len;
    if (type === 'IEND') { end = true; break; }
  }
  if (!idat || !end) return null;
  return { width, height };
}

/** JPEG: SOI からマーカーをたどり SOF の縦横を読む。最後は EOI で終わること */
function jpegSize(b: Uint8Array) {
  if (b.length < 12 || b[0] !== 0xff || b[1] !== 0xd8) return null;
  let width = 0, height = 0, i = 2;
  while (i + 3 < b.length) {
    if (b[i] !== 0xff) return null;
    while (b[i] === 0xff) i++; // 詰め物の 0xFF
    const marker = b[i++];
    if (marker === 0xd9) break; // EOI
    // 長さを持たないマーカー
    if (marker === 0x01 || (marker >= 0xd0 && marker <= 0xd7)) continue;
    if (i + 1 >= b.length) return null;
    const len = (b[i] << 8) | b[i + 1];
    if (len < 2 || i + len > b.length) return null;
    // SOF0〜SOF15（DHT・JPG・DAC を除く）に縦横がある
    if (marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc) {
      if (len < 7) return null;
      height = (b[i + 3] << 8) | b[i + 4];
      width = (b[i + 5] << 8) | b[i + 6];
    }
    if (marker === 0xda) break; // 以降はエントロピー符号化データ
    i += len;
  }
  if (!width || !height) return null;
  if (!(b[b.length - 2] === 0xff && b[b.length - 1] === 0xd9)) return null;
  return { width, height };
}

/** WebP: RIFF コンテナの最初のチャンク（VP8 / VP8L / VP8X）から縦横を読む */
function webpSize(b: Uint8Array) {
  if (b.length < 30) return null;
  const le32 = (i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16) | (b[i + 3] << 24);
  const le24 = (i: number) => b[i] | (b[i + 1] << 8) | (b[i + 2] << 16);
  if (ascii(b, 0) !== 'RIFF' || ascii(b, 8) !== 'WEBP') return null;
  const riff = le32(4) >>> 0;
  if (riff < 22 || riff + 8 > b.length) return null;
  const chunk = ascii(b, 12);
  const size = le32(16) >>> 0;
  if (size > b.length - 20) return null;
  if (chunk === 'VP8 ') {
    if (size < 10 || !(b[23] === 0x9d && b[24] === 0x01 && b[25] === 0x2a)) return null;
    return { width: (b[26] | (b[27] << 8)) & 0x3fff, height: (b[28] | (b[29] << 8)) & 0x3fff };
  }
  if (chunk === 'VP8L') {
    if (size < 5 || b[20] !== 0x2f) return null;
    const bits = le32(21);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >>> 14) & 0x3fff) };
  }
  if (chunk === 'VP8X') {
    if (size < 10) return null;
    return { width: 1 + le24(24), height: 1 + le24(27) };
  }
  return null;
}
