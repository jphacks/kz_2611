import { Route, HttpError, json, str, int, now, isFriend, Env, User, pickUser, userCols } from './core';

interface Group { id: number; name: string; profile: string; owner_id: number }
async function withMembers(env: Env, group: Group) {
  const members = await env.DB.prepare('SELECT u.id AS id, u.handle, u.name, u.avatar FROM group_members m JOIN users u ON u.id = m.user_id WHERE m.group_id = ? ORDER BY u.name, u.id').bind(group.id).all<User>();
  return { ...group, members: members.results };
}

export const groupRoutes: Route[] = [
  { method: 'GET', path: /^\/groups$/, handler: async ({ env, me }) => {
    const groups = await env.DB.prepare('SELECT g.id AS id, g.name, g.profile, g.owner_id FROM groups g JOIN group_members m ON m.group_id = g.id WHERE m.user_id = ? ORDER BY g.id').bind(me.id).all<Group>();
    const members = new Map<number, User[]>();
    if (groups.results.length) {
      const { results } = await env.DB.prepare(`SELECT m.group_id, ${userCols('u', 'member_')}
        FROM group_members m JOIN users u ON u.id = m.user_id
        WHERE m.group_id IN (SELECT CAST(value AS INTEGER) FROM json_each(?))
        ORDER BY m.group_id, u.name, u.id`).bind(JSON.stringify(groups.results.map(g => g.id))).all();
      for (const row of results) {
        const id = Number(row.group_id);
        if (!members.has(id)) members.set(id, []);
        members.get(id)!.push(pickUser(row, 'member_'));
      }
    }
    return json({ groups: groups.results.map(g => ({ ...g, members: members.get(g.id) ?? [] })) });
  } },
  { method: 'POST', path: /^\/groups$/, handler: async ({ env, me, body }) => {
    const b = await body();
    const name = str(b.name, 'グループ名', 1, 20);
    const profile = str(b.profile, 'プロフィール', 0, 100);
    if (!Array.isArray(b.member_ids)) throw new HttpError(400, 'メンバーを指定してください');
    const ids = new Set<number>();
    for (const value of b.member_ids) {
      if (typeof value !== 'number') throw new HttpError(400, 'メンバーIDは整数で指定してください');
      const id = int(value, 'メンバーID', 1, Number.MAX_SAFE_INTEGER);
      if (!(await isFriend(env, me.id, id))) throw new HttpError(400, 'メンバーには自分の友達だけを指定してください');
      ids.add(id);
    }
    ids.add(me.id);
    // 同じトランザクション内で作成した最新グループに全員を登録する。
    const results = await env.DB.batch([
      env.DB.prepare('INSERT INTO groups (owner_id, name, profile, created_at) VALUES (?, ?, ?, ?)').bind(me.id, name, profile, now()),
      env.DB.prepare('INSERT INTO group_members (group_id, user_id) SELECT (SELECT MAX(id) FROM groups WHERE owner_id = ?), CAST(value AS INTEGER) FROM json_each(?)').bind(me.id, JSON.stringify([...ids])),
    ]);
    const id = (results[0] as { meta: { last_row_id: number } }).meta.last_row_id;
    return json({ group: await withMembers(env, { id, name, profile, owner_id: me.id }) }, 201);
  } },
  { method: 'PATCH', path: /^\/groups\/(\d+)$/, handler: async ({ env, me, params, body }) => {
    const id = int(params[0], 'グループID', 1, Number.MAX_SAFE_INTEGER);
    const group = await env.DB.prepare('SELECT id, name, profile, owner_id FROM groups WHERE id = ?').bind(id).first<Group>();
    if (!group) throw new HttpError(404, 'グループが見つかりません');
    if (group.owner_id !== me.id) throw new HttpError(403, '作成者だけが編集できます');
    const b = await body();
    const name = b.name === undefined ? group.name : str(b.name, 'グループ名', 1, 20);
    const profile = b.profile === undefined ? group.profile : str(b.profile, 'プロフィール', 0, 100);
    await env.DB.prepare('UPDATE groups SET name = ?, profile = ? WHERE id = ? AND owner_id = ?').bind(name, profile, id, me.id).run();
    return json({ group: await withMembers(env, { ...group, name, profile }) });
  } },
  { method: 'POST', path: /^\/groups\/(\d+)\/members$/, handler: async ({ env, me, params, body }) => {
    const id = int(params[0], 'グループID', 1, Number.MAX_SAFE_INTEGER);
    const group = await env.DB.prepare('SELECT id, name, profile, owner_id FROM groups WHERE id = ?').bind(id).first<Group>();
    if (!group) throw new HttpError(404, 'グループが見つかりません');
    if (group.owner_id !== me.id) throw new HttpError(403, '作成者だけが追加できます');
    const b = await body();
    if (typeof b.user_id !== 'number') throw new HttpError(400, 'メンバーIDは整数で指定してください');
    const userId = int(b.user_id, 'メンバーID', 1, Number.MAX_SAFE_INTEGER);
    if (!(await isFriend(env, me.id, userId))) throw new HttpError(400, 'メンバーには自分の友達だけを指定してください');
    await env.DB.prepare('INSERT OR IGNORE INTO group_members (group_id, user_id) SELECT id, ? FROM groups WHERE id = ? AND owner_id = ?').bind(userId, id, me.id).run();
    return json({ group: await withMembers(env, group) });
  } },
  { method: 'DELETE', path: /^\/groups\/(\d+)\/members\/(\d+)$/, handler: async ({ env, me, params }) => {
    const id = int(params[0], 'グループID', 1, Number.MAX_SAFE_INTEGER);
    const userId = int(params[1], 'メンバーID', 1, Number.MAX_SAFE_INTEGER);
    const group = await env.DB.prepare('SELECT owner_id FROM groups WHERE id = ?').bind(id).first<{ owner_id: number }>();
    if (!group) throw new HttpError(404, 'グループが見つかりません');
    if (me.id !== userId && group.owner_id !== me.id) throw new HttpError(403, '作成者だけが他のメンバーを削除できます');
    // 退会・引き継ぎ・空グループ削除を同じトランザクションで行う。
    // 参加時刻がないため、残った最小のuser_idへ引き継ぐ。募集・参加者は残す。
    await env.DB.batch([
      env.DB.prepare('DELETE FROM group_members WHERE group_id = ? AND user_id = ? AND (user_id = ? OR EXISTS (SELECT 1 FROM groups WHERE id = ? AND owner_id = ?))').bind(id, userId, me.id, id, me.id),
      env.DB.prepare('UPDATE groups SET owner_id = (SELECT MIN(user_id) FROM group_members WHERE group_id = ?) WHERE id = ? AND NOT EXISTS (SELECT 1 FROM group_members WHERE group_id = ? AND user_id = groups.owner_id) AND EXISTS (SELECT 1 FROM group_members WHERE group_id = ?)').bind(id, id, id, id),
      env.DB.prepare('DELETE FROM groups WHERE id = ? AND NOT EXISTS (SELECT 1 FROM group_members WHERE group_id = ?)').bind(id, id),
    ]);
    return json({ ok: true });
  } },
  { method: 'DELETE', path: /^\/groups\/(\d+)$/, handler: async ({ env, me, params }) => {
    const id = int(params[0], 'グループID', 1, Number.MAX_SAFE_INTEGER);
    const group = await env.DB.prepare('SELECT owner_id FROM groups WHERE id = ?').bind(id).first<{ owner_id: number }>();
    if (!group) throw new HttpError(404, 'グループが見つかりません');
    if (group.owner_id !== me.id) throw new HttpError(403, '作成者だけが削除できます');
    // 募集とそのgroup_idは残し、メンバー資格だけを削除する。
    await env.DB.batch([
      env.DB.prepare('DELETE FROM group_members WHERE group_id = ?').bind(id),
      env.DB.prepare('DELETE FROM groups WHERE id = ?').bind(id),
    ]);
    return json({ ok: true });
  } },
];
