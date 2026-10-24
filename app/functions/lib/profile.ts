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
    // 主催者も参加者として扱う。閲覧だけできる人には公開しない。
    const sharedEvent = id !== me.id && !friend && await env.DB.prepare(`SELECT 1 FROM events e
      WHERE (e.host_id = ? OR EXISTS (SELECT 1 FROM event_members m WHERE m.event_id = e.id AND m.user_id = ?))
        AND (e.host_id = ? OR EXISTS (SELECT 1 FROM event_members m WHERE m.event_id = e.id AND m.user_id = ?))
      LIMIT 1`).bind(me.id, me.id, id, id).first();
    if (id !== me.id && !friend && !sharedEvent) throw new HttpError(404, 'ユーザーが見つかりません');
    const user = await env.DB.prepare(`SELECT ${PUBLIC_USER} FROM users WHERE id = ?`).bind(id).first<User>();
    if (!user) throw new HttpError(404, 'ユーザーが見つかりません');
    // 友達申請の状態: none / sent（自分が申請中）/ received（相手から届いている）
    const pending = id === me.id || friend ? null : await env.DB.prepare('SELECT from_id FROM friend_requests WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?) ORDER BY created_at LIMIT 1')
      .bind(me.id, id, id, me.id).first<{ from_id: number }>();
    const request = !pending ? 'none' : pending.from_id === me.id ? 'sent' : 'received';
    return json({ user, is_friend: friend, request });
  } },
];
