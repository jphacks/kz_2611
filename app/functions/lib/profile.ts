import { Route, HttpError, json, str, int, isFriend, PUBLIC_USER, User } from './core';

export const profileRoutes: Route[] = [
  { method: 'PATCH', path: /^\/me$/, handler: async ({ env, me, body }) => {
    const b = await body();
    const changes: string[] = [];
    const values: (string | number | null)[] = [];
    if ('name' in b) {
      changes.push('name = ?');
      values.push(str(b.name, '名前', 1, 20));
    }
    if ('avatar' in b) {
      if (b.avatar !== null && (typeof b.avatar !== 'string' || !b.avatar.startsWith('data:image/') || b.avatar.length > 280000)) {
        throw new HttpError(400, '画像は200KB以内の画像data URLにしてください');
      }
      changes.push('avatar = ?');
      values.push(b.avatar as string | null);
    }
    if (changes.length) await env.DB.prepare(`UPDATE users SET ${changes.join(', ')} WHERE id = ?`).bind(...values, me.id).run();
    const user = await env.DB.prepare(`SELECT ${PUBLIC_USER}, invite_code FROM users WHERE id = ?`).bind(me.id).first();
    return json({ user });
  } },
  { method: 'GET', path: /^\/users\/(\d+)$/, handler: async ({ env, me, params }) => {
    const id = int(params[0], 'ユーザーID', 1, Number.MAX_SAFE_INTEGER);
    const friend = await isFriend(env, me.id, id);
    if (id !== me.id && !friend) throw new HttpError(404, 'ユーザーが見つかりません');
    const user = await env.DB.prepare(`SELECT ${PUBLIC_USER} FROM users WHERE id = ?`).bind(id).first<User>();
    if (!user) throw new HttpError(404, 'ユーザーが見つかりません');
    return json({ user, is_friend: friend });
  } },
];
