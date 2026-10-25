import { Route, HttpError, json, str, now, randomHex, hashPassword, safeEqual, SESSION_MS, PUBLIC_USER, Env } from './core';

const HANDLE = /^[a-zA-Z0-9_]{3,20}$/;
const LIMIT = 10, WINDOW = 10 * 60 * 1000; // 同一送信元・同一IDは10分に10回まで
// 送信元を変えた総当たり用。1アカウント全体の失敗数を数え、段階的に遅らせる（拒否はしない）
const ACCOUNT_LIMIT = 30, DELAY_STEP = 400, DELAY_MAX = 3000, NO_LIMIT = 1000000;

async function rateLimit(env: Env, key: string) {
  const since = now() - WINDOW;
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE key = ? AND at > ?').bind(key, since).first<{ n: number }>();
  if ((r?.n ?? 0) >= LIMIT) throw new HttpError(429, '試行回数が多すぎます。しばらくしてからもう一度お試しください');
  await env.DB.prepare('INSERT INTO login_attempts (key, at) VALUES (?, ?)').bind(key, now()).run();
}

/** 送信元。本番は Cloudflare が付ける cf-connecting-ip（クライアントからは偽装できない） */
const source = (req: Request) => (req.headers.get('cf-connecting-ip') || '').trim() || 'local';
const accountKey = (handle: string) => `login:acct:${handle}`;
const sourceKey = (req: Request, handle: string) => `login:src:${source(req)}:${handle}`;

async function countFailures(env: Env, key: string) {
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE key = ? AND at > ?').bind(key, now() - WINDOW).first<{ n: number }>();
  return r?.n ?? 0;
}
/** 上限未満のときだけ1件記録する。確認と書き込みが1つのSQLなので並列でも上限を超えない */
async function recordFailure(env: Env, key: string, limit: number) {
  const at = now();
  const r = await env.DB.prepare('INSERT INTO login_attempts (key, at) SELECT ?, ? WHERE (SELECT COUNT(*) FROM login_attempts WHERE key = ? AND at > ?) < ?')
    .bind(key, at, key, at - WINDOW, limit).run();
  return r.meta.changes > 0;
}
const sleep = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));
async function issue(env: Env, userId: number) {
  const token = randomHex(32);
  await env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').bind(token, userId, now() + SESSION_MS).run();
  return token;
}
const me = (env: Env, id: number) => env.DB.prepare(`SELECT ${PUBLIC_USER}, invite_code FROM users WHERE id = ?`).bind(id).first();

export const authRoutes: Route[] = [
  { method: 'POST', path: /^\/register$/, auth: false, handler: async ({ env, body, req }) => {
    const b = await body();
    // 本番（Cloudflare 経由）だけ IP ごとに制限する。手元・CI のテストでは IP ヘッダが無いので制限しない
    const ip = req.headers.get('cf-connecting-ip');
    if (ip && !['127.0.0.1', '::1'].includes(ip)) await rateLimit(env, 'register:' + ip);
    const handle = str(b.handle, 'ID', 3, 20);
    if (!HANDLE.test(handle)) throw new HttpError(400, 'IDは英数字と_で3〜20文字にしてください');
    const name = str(b.name, '名前', 1, 20);
    const password = str(b.password, 'パスワード', 8, 100);
    if (await env.DB.prepare('SELECT 1 FROM users WHERE handle = ?').bind(handle).first()) throw new HttpError(409, 'そのIDは使われています');
    const salt = randomHex(16);
    const r = await env.DB.prepare('INSERT INTO users (handle, name, avatar, invite_code, pass_hash, salt, created_at) VALUES (?, ?, NULL, ?, ?, ?, ?)')
      .bind(handle, name, randomHex(8), await hashPassword(password, salt), salt, now()).run();
    const id = r.meta.last_row_id;
    return json({ token: await issue(env, id), user: await me(env, id) }, 201);
  } },
  { method: 'POST', path: /^\/login$/, auth: false, handler: async ({ env, body, req }) => {
    const b = await body();
    const handle = str(b.handle, 'ID', 1, 20);
    const keyHandle = handle.toLowerCase();
    const password = str(b.password, 'パスワード', 1, 100);
    const from = sourceKey(req, keyHandle);
    // 同じ送信元からの総当たりは、パスワードを検証する前に止める
    if (await countFailures(env, from) >= LIMIT) throw new HttpError(429, '試行回数が多すぎます。しばらくしてからもう一度お試しください');
    // 送信元を変えた総当たりは、アカウント全体の失敗数に応じて段階的に遅らせる。
    // 正しいパスワードは遅延のあとに通すので、第三者の失敗だけで本人を締め出さない
    const failed = await countFailures(env, accountKey(keyHandle));
    if (failed >= ACCOUNT_LIMIT) await sleep(Math.min((failed - ACCOUNT_LIMIT + 1) * DELAY_STEP, DELAY_MAX));
    const u = await env.DB.prepare('SELECT id, pass_hash, salt FROM users WHERE handle = ?').bind(handle).first<{ id: number; pass_hash: string; salt: string }>();
    if (!u || !safeEqual(await hashPassword(password, u.salt), u.pass_hash)) {
      // 失敗だけを数える（本人がログインしてもカウンターは減らない）
      const withinLimit = await recordFailure(env, from, LIMIT);
      await recordFailure(env, accountKey(keyHandle), NO_LIMIT);
      if (!withinLimit) throw new HttpError(429, '試行回数が多すぎます。しばらくしてからもう一度お試しください');
      throw new HttpError(401, 'IDかパスワードが違います');
    }
    return json({ token: await issue(env, u.id), user: await me(env, u.id) });
  } },
  { method: 'POST', path: /^\/logout$/, handler: async ({ env, req }) => {
    const token = (req.headers.get('authorization') || '').slice(7);
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    return json({ ok: true });
  } },
  { method: 'GET', path: /^\/me$/, handler: async ({ env, me: u }) => json({ user: await me(env, u.id) }) },
];
