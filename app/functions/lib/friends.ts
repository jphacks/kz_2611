import { Route, HttpError, json, str, int, now, PUBLIC_USER, User } from './core';

export const friendRoutes: Route[] = [
  { method: 'GET', path: /^\/friends$/, handler: async ({ env, me }) => {
    const friends = await env.DB.prepare(`SELECT u.id AS id, u.handle, u.name, u.avatar FROM friendships f JOIN users u ON u.id = CASE WHEN f.user_a = ? THEN f.user_b ELSE f.user_a END WHERE f.user_a = ? OR f.user_b = ? ORDER BY u.name, u.id`)
      .bind(me.id, me.id, me.id).all<User>();
    return json({ friends: friends.results });
  } },
  { method: 'POST', path: /^\/friends$/, handler: async ({ env, me, body }) => {
    const b = await body();
    if (('handle' in b) === ('invite_code' in b)) throw new HttpError(400, 'IDか招待コードのどちらかを指定してください');
    const byHandle = 'handle' in b;
    const value = str(byHandle ? b.handle : b.invite_code, byHandle ? 'ID' : '招待コード', 1, byHandle ? 20 : 100);
    const friend = await env.DB.prepare(`SELECT ${PUBLIC_USER} FROM users WHERE ${byHandle ? 'handle' : 'invite_code'} = ?`).bind(value).first<User>();
    if (!friend) throw new HttpError(404, 'ユーザーが見つかりません');
    if (friend.id === me.id) throw new HttpError(400, '自分自身は追加できません');
    const [a, c] = me.id < friend.id ? [me.id, friend.id] : [friend.id, me.id];
    await env.DB.prepare('INSERT OR IGNORE INTO friendships (user_a, user_b, created_at) VALUES (?, ?, ?)').bind(a, c, now()).run();
    return json({ friend });
  } },
  { method: 'DELETE', path: /^\/friends\/(\d+)$/, handler: async ({ env, me, params }) => {
    const id = int(params[0], 'ユーザーID', 1, Number.MAX_SAFE_INTEGER);
    const [a, b] = me.id < id ? [me.id, id] : [id, me.id];
    await env.DB.prepare('DELETE FROM friendships WHERE user_a = ? AND user_b = ?').bind(a, b).run();
    return json({ ok: true });
  } },
  { method: 'GET', path: /^\/invite\/([^/]+)$/, handler: async ({ env, params }) => {
    const user = await env.DB.prepare(`SELECT ${PUBLIC_USER} FROM users WHERE invite_code = ?`).bind(params[0]).first<User>();
    if (!user) throw new HttpError(404, 'ユーザーが見つかりません');
    return json({ user });
  } },
];
