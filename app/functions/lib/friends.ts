import { Route, HttpError, json, str, int, now, PUBLIC_USER, User, Env } from './core';

const pair = (x: number, y: number) => (x < y ? [x, y] : [y, x]);
const userId = (v: string) => int(v, 'ユーザーID', 1, Number.MAX_SAFE_INTEGER);
const FRIEND_COLS = PUBLIC_USER.split(', ').map(c => 'u.' + c).join(', ');

/** 友達になった2人の間の申請（双方向）を消す。友達でなければ何もしない */
const clearRequests = (env: Env, me: number, other: number) => {
  const [a, b] = pair(me, other);
  return env.DB.prepare(`DELETE FROM friend_requests WHERE ((from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?))
    AND EXISTS (SELECT 1 FROM friendships WHERE user_a = ? AND user_b = ?)`).bind(me, other, other, me, a, b);
};
const friendCheck = (env: Env, me: number, other: number) => {
  const [a, b] = pair(me, other);
  return env.DB.prepare('SELECT EXISTS (SELECT 1 FROM friendships WHERE user_a = ? AND user_b = ?) AS f').bind(a, b);
};
/** batch（1つのトランザクション）の最後の文 friendCheck の結果を読む */
const lastIsFriend = (results: unknown[]) => (results[results.length - 1] as { results: { f: number }[] }).results[0]?.f === 1;

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
    const [a, c] = pair(me.id, friend.id);
    const t = now();
    if (!byHandle) {
      // 招待リンク（QR）は相手が渡したものなので、承認なしで友達になる
      await env.DB.batch([
        env.DB.prepare('INSERT OR IGNORE INTO friendships (user_a, user_b, created_at) VALUES (?, ?, ?)').bind(a, c, t),
        clearRequests(env, me.id, friend.id),
      ]);
      return json({ friend });
    }
    // IDは申請。相手からの申請が届いていれば、お互いに申請したので友達になる
    const results = await env.DB.batch([
      env.DB.prepare(`INSERT OR IGNORE INTO friendships (user_a, user_b, created_at) SELECT ?, ?, ?
        WHERE EXISTS (SELECT 1 FROM friend_requests WHERE from_id = ? AND to_id = ?)`).bind(a, c, t, friend.id, me.id),
      env.DB.prepare(`INSERT OR IGNORE INTO friend_requests (from_id, to_id, created_at) SELECT ?, ?, ?
        WHERE NOT EXISTS (SELECT 1 FROM friendships WHERE user_a = ? AND user_b = ?)`).bind(me.id, friend.id, t, a, c),
      clearRequests(env, me.id, friend.id),
      friendCheck(env, me.id, friend.id),
    ]);
    return json(lastIsFriend(results) ? { status: 'friends', friend } : { status: 'requested' });
  } },
  { method: 'DELETE', path: /^\/friends\/(\d+)$/, handler: async ({ env, me, params }) => {
    const id = userId(params[0]);
    const [a, b] = pair(me.id, id);
    await env.DB.prepare('DELETE FROM friendships WHERE user_a = ? AND user_b = ?').bind(a, b).run();
    return json({ ok: true });
  } },
  { method: 'GET', path: /^\/invite\/([^/]+)$/, handler: async ({ env, params }) => {
    const user = await env.DB.prepare(`SELECT ${PUBLIC_USER} FROM users WHERE invite_code = ?`).bind(params[0]).first<User>();
    if (!user) throw new HttpError(404, 'ユーザーが見つかりません');
    return json({ user });
  } },
  { method: 'GET', path: /^\/friend-requests$/, handler: async ({ env, me }) => {
    const [received, sent] = await Promise.all(([['from_id', 'to_id'], ['to_id', 'from_id']] as const).map(([other, self]) =>
      env.DB.prepare(`SELECT ${FRIEND_COLS} FROM friend_requests r JOIN users u ON u.id = r.${other}
        WHERE r.${self} = ? ORDER BY r.created_at DESC, u.id`).bind(me.id).all<User>()));
    return json({ received: received.results, sent: sent.results });
  } },
  { method: 'POST', path: /^\/friend-requests\/(\d+)\/accept$/, handler: async ({ env, me, params }) => {
    const id = userId(params[0]);
    if (id === me.id) throw new HttpError(400, '自分自身は追加できません');
    const friend = await env.DB.prepare(`SELECT ${PUBLIC_USER} FROM users WHERE id = ?`).bind(id).first<User>();
    if (!friend) throw new HttpError(404, '友達申請が見つかりません');
    const [a, c] = pair(me.id, id);
    // 申請の確認と友達の追加を1つのトランザクションで行う（取り消しと同時でも申請なしに友達にならない）
    const results = await env.DB.batch([
      env.DB.prepare(`INSERT OR IGNORE INTO friendships (user_a, user_b, created_at) SELECT ?, ?, ?
        WHERE EXISTS (SELECT 1 FROM friend_requests WHERE from_id = ? AND to_id = ?)`).bind(a, c, now(), id, me.id),
      clearRequests(env, me.id, id),
      friendCheck(env, me.id, id),
    ]);
    if (!lastIsFriend(results)) throw new HttpError(404, '友達申請が見つかりません');
    return json({ status: 'friends', friend });
  } },
  { method: 'DELETE', path: /^\/friend-requests\/(\d+)$/, handler: async ({ env, me, params }) => {
    const id = userId(params[0]);
    // 届いた申請の拒否と、送った申請の取り消しを兼ねる
    await env.DB.prepare('DELETE FROM friend_requests WHERE (from_id = ? AND to_id = ?) OR (from_id = ? AND to_id = ?)').bind(me.id, id, id, me.id).run();
    return json({ ok: true });
  } },
];
