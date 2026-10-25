// ★共有: ルーター。機能を足すときは import と ROUTES の末尾に1行ずつ足すだけ
import { Route, HttpError, json, currentUser, Env, User } from '../lib/core';
import { authRoutes } from '../lib/auth';
import { profileRoutes } from '../lib/profile';
import { friendRoutes } from '../lib/friends';
import { groupRoutes } from '../lib/groups';
import { eventRoutes } from '../lib/events';
import { chatRoutes } from '../lib/chat';
import { pushRoutes } from '../lib/notify';

const ROUTES: Route[] = [
  { method: 'GET', path: /^\/health$/, auth: false, handler: async ({ env }) => {
    const r = await env.DB.prepare('SELECT 1 AS ok').first<{ ok: number }>();
    return json({ db: r?.ok === 1 ? 'ok' : 'ng' });
  } },
  ...authRoutes,
  ...profileRoutes,
  ...friendRoutes,
  ...groupRoutes,
  ...eventRoutes,
  ...chatRoutes,
  ...pushRoutes,
];

export const onRequest = async (ctx: { request: Request; env: Env; waitUntil?: (p: Promise<unknown>) => void }) => {
  const req = ctx.request, env = ctx.env;
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api/, '') || '/';
  try {
    let pathMatched = false;
    for (const r of ROUTES) {
      const m = path.match(r.path);
      if (!m) continue;
      pathMatched = true;
      if (r.method !== req.method) continue;
      let me: User | null = null;
      if (r.auth !== false) {
        me = await currentUser(req, env);
        if (!me) throw new HttpError(401, 'ログインしてください');
      }
      let cached: Record<string, unknown> | undefined;
      const body = async () => {
        if (cached) return cached;
        try { const v = await req.json(); cached = v && typeof v === 'object' ? (v as Record<string, unknown>) : {}; }
        catch { throw new HttpError(400, 'リクエストの形式が正しくありません'); }
        return cached;
      };
      const waitUntil = (p: Promise<unknown>) => { if (ctx.waitUntil) ctx.waitUntil(p); else void p.catch(() => {}); };
      return await r.handler({ req, env, params: m.slice(1), me: me as User, url, body, waitUntil });
    }
    throw new HttpError(pathMatched ? 405 : 404, pathMatched ? 'この操作はできません' : '見つかりません');
  } catch (e) {
    if (e instanceof HttpError) return json({ error: e.message }, e.status);
    console.error(e);
    return json({ error: 'サーバーでエラーが起きました' }, 500);
  }
};
