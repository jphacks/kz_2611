import { Route, HttpError, json, str, now, randomHex, hashPassword, safeEqual, SESSION_MS, PUBLIC_USER, Env } from './core';

const HANDLE = /^[a-zA-Z0-9_]{3,20}$/;
const LIMIT = 10, WINDOW = 10 * 60 * 1000; // 10分に10回まで

async function rateLimit(env: Env, key: string) {
  const since = now() - WINDOW;
  const r = await env.DB.prepare('SELECT COUNT(*) AS n FROM login_attempts WHERE key = ? AND at > ?').bind(key, since).first<{ n: number }>();
  if ((r?.n ?? 0) >= LIMIT) throw new HttpError(429, '試行回数が多すぎます。しばらくしてからもう一度お試しください');
  await env.DB.prepare('INSERT INTO login_attempts (key, at) VALUES (?, ?)').bind(key, now()).run();
}
async function issue(env: Env, userId: number) {
  const token = randomHex(32);
  await env.DB.prepare('INSERT INTO sessions (token, user_id, expires_at) VALUES (?, ?, ?)').bind(token, userId, now() + SESSION_MS).run();
  return token;
}
const me = (env: Env, id: number) => env.DB.prepare(`SELECT ${PUBLIC_USER}, invite_code FROM users WHERE id = ?`).bind(id).first();

export const authRoutes: Route[] = [
  { method: 'POST', path: /^\/register$/, auth: false, handler: async ({ env, body, req }) => {
    const b = await body();
    await rateLimit(env, 'register:' + (req.headers.get('cf-connecting-ip') || 'local'));
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
  { method: 'POST', path: /^\/login$/, auth: false, handler: async ({ env, body }) => {
    const b = await body();
    const handle = str(b.handle, 'ID', 1, 20);
    await rateLimit(env, 'login:' + handle.toLowerCase());
    const password = str(b.password, 'パスワード', 1, 100);
    const u = await env.DB.prepare('SELECT id, pass_hash, salt FROM users WHERE handle = ?').bind(handle).first<{ id: number; pass_hash: string; salt: string }>();
    if (!u || !safeEqual(await hashPassword(password, u.salt), u.pass_hash)) throw new HttpError(401, 'IDかパスワードが違います');
    return json({ token: await issue(env, u.id), user: await me(env, u.id) });
  } },
  { method: 'POST', path: /^\/logout$/, handler: async ({ env, req }) => {
    const token = (req.headers.get('authorization') || '').slice(7);
    await env.DB.prepare('DELETE FROM sessions WHERE token = ?').bind(token).run();
    return json({ ok: true });
  } },
  { method: 'GET', path: /^\/me$/, handler: async ({ env, me: u }) => json({ user: await me(env, u.id) }) },
];
