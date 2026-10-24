// ★共有: 型・エラー・入力チェック・認証ヘルパー。変更は末尾への追加だけ
export interface D1Result<T> { results: T[] }
export interface D1Stmt {
  bind(...v: unknown[]): D1Stmt;
  first<T = Record<string, unknown>>(): Promise<T | null>;
  all<T = Record<string, unknown>>(): Promise<D1Result<T>>;
  run(): Promise<{ meta: { last_row_id: number; changes: number } }>;
}
export interface D1 { prepare(sql: string): D1Stmt; batch(s: D1Stmt[]): Promise<unknown[]> }
export interface Env { DB: D1 }

export interface User { id: number; handle: string; name: string; avatar: string | null }
/** 他人に返してよい列だけ */
export const PUBLIC_USER = 'id, handle, name, avatar';
export const userCols = (alias: string, prefix: string) =>
  `${alias}.id AS ${prefix}id, ${alias}.handle AS ${prefix}handle, ${alias}.name AS ${prefix}name, ${alias}.avatar AS ${prefix}avatar`;
export function pickUser(row: Record<string, unknown>, prefix: string): User {
  return { id: Number(row[prefix + 'id']), handle: String(row[prefix + 'handle']), name: String(row[prefix + 'name']), avatar: (row[prefix + 'avatar'] as string | null) ?? null };
}

export interface Ctx { req: Request; env: Env; params: string[]; me: User; url: URL; body: () => Promise<Record<string, unknown>> }
export interface Route { method: string; path: RegExp; auth?: boolean; handler: (c: Ctx) => Promise<Response> }

export class HttpError extends Error { constructor(public status: number, message: string) { super(message) } }
export const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { 'content-type': 'application/json; charset=utf-8' } });

/** 文字列の入力チェック（前後の空白を除いて長さを確認） */
export function str(v: unknown, name: string, min: number, max: number): string {
  if (typeof v !== 'string') throw new HttpError(400, `${name}を入力してください`);
  const s = v.trim();
  if (s.length < min) throw new HttpError(400, `${name}を入力してください`);
  if (s.length > max) throw new HttpError(400, `${name}は${max}文字以内にしてください`);
  return s;
}
export function int(v: unknown, name: string, min: number, max: number): number {
  const n = Number(v);
  if (!Number.isInteger(n) || n < min || n > max) throw new HttpError(400, `${name}は${min}〜${max}で指定してください`);
  return n;
}
export const now = () => Date.now();

// ---- パスワード（PBKDF2）とトークン ----
const enc = new TextEncoder();
const hex = (b: ArrayBuffer | Uint8Array) => [...new Uint8Array(b)].map(x => x.toString(16).padStart(2, '0')).join('');
export function randomHex(bytes: number) { const a = new Uint8Array(bytes); crypto.getRandomValues(a); return hex(a); }
export async function hashPassword(password: string, salt: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(password), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: enc.encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256);
  return hex(bits);
}
export function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let r = 0; for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
export const SESSION_MS = 30 * 24 * 60 * 60 * 1000;
export async function currentUser(req: Request, env: Env): Promise<User | null> {
  const h = req.headers.get('authorization') || '';
  const token = h.startsWith('Bearer ') ? h.slice(7) : '';
  if (!token) return null;
  return env.DB.prepare(`SELECT ${PUBLIC_USER.split(', ').map(c => 'u.' + c).join(', ')} FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token = ? AND s.expires_at > ?`)
    .bind(token, now()).first<User>();
}

// ---- 関係の判定（見せてよいかはサーバー側で判定する） ----
export async function isFriend(env: Env, a: number, b: number) {
  const [x, y] = a < b ? [a, b] : [b, a];
  return !!(await env.DB.prepare('SELECT 1 FROM friendships WHERE user_a = ? AND user_b = ?').bind(x, y).first());
}
/** 募集を見てよいか: 主催者本人 / 参加者 / 全体なら主催者の友達 / グループならメンバー */
export const EVENT_VISIBLE_SQL = `(
  e.host_id = :me
  OR EXISTS (SELECT 1 FROM event_members m WHERE m.event_id = e.id AND m.user_id = :me)
  OR (e.group_id IS NULL AND EXISTS (SELECT 1 FROM friendships f WHERE (f.user_a = MIN(e.host_id, :me) AND f.user_b = MAX(e.host_id, :me))))
  OR (e.group_id IS NOT NULL AND EXISTS (SELECT 1 FROM group_members g WHERE g.group_id = e.group_id AND g.user_id = :me))
)`;
/** :me を数値に置き換えた SQL 断片（me.id はサーバー側の整数なので安全） */
export const visibleSql = (meId: number) => EVENT_VISIBLE_SQL.replaceAll(':me', String(Math.trunc(meId)));
