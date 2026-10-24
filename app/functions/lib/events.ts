import { Ctx, Route, HttpError, json, str, int, now, visibleSql, userCols, pickUser } from './core';

type EventRow = Record<string, unknown> & {
  id: number; host_id: number; group_id: number | null; capacity: number;
  duration_min: number; created_at: number; expires_at: number;
};

async function find(c: Ctx, visible = true): Promise<EventRow> {
  const row = await c.env.DB.prepare(`SELECT e.* FROM events e WHERE e.id = ? ${visible ? `AND ${visibleSql(c.me.id)}` : ''}`)
    .bind(c.params[0]).first<EventRow>();
  if (!row) throw new HttpError(404, '募集が見つかりません');
  return row;
}
async function owned(c: Ctx) {
  const row = await find(c, false);
  if (row.host_id !== c.me.id) throw new HttpError(403, '主催者だけが操作できます');
  return row;
}
async function item(c: Ctx, id: number) {
  const row = await c.env.DB.prepare(`SELECT e.*, g.name AS group_name, ${userCols('u', 'host_')} FROM events e
    JOIN users u ON u.id = e.host_id LEFT JOIN groups g ON g.id = e.group_id WHERE e.id = ?`)
    .bind(id).first<EventRow>();
  if (!row) throw new HttpError(404, '募集が見つかりません');
  const { results } = await c.env.DB.prepare(`SELECT ${userCols('u', 'member_')} FROM event_members m
    JOIN users u ON u.id = m.user_id WHERE m.event_id = ? ORDER BY m.joined_at, m.user_id`).bind(id).all();
  const members = results.map(r => pickUser(r, 'member_'));
  const is_host = row.host_id === c.me.id;
  return { id: row.id, title: row.title, place: row.place, time_text: row.time_text,
    capacity: row.capacity, duration_min: row.duration_min, expires_at: row.expires_at,
    created_at: row.created_at, group_id: row.group_id, group_name: row.group_name,
    host: pickUser(row, 'host_'), members, count: members.length + 1,
    joined: is_host || members.some(u => u.id === c.me.id), is_host };
}
async function input(c: Ctx, previous?: EventRow) {
  const b = await c.body();
  const v = { ...previous, ...b };
  const title = str(v.title, 'タイトル', 1, 20);
  const place = str(v.place, '場所', 0, 30);
  const time_text = str(v.time_text, '時間', 0, 20);
  const capacity = int(v.capacity, '定員', 2, 20);
  const duration_min = int(v.duration_min, '表示時間', 15, 120);
  if (![15, 30, 60, 120].includes(duration_min)) throw new HttpError(400, '表示時間は15・30・60・120分から選んでください');
  const group_id = v.group_id === null ? null :
    typeof v.group_id === 'number' ? int(v.group_id, 'グループ', 1, Number.MAX_SAFE_INTEGER) : NaN;
  if (Number.isNaN(group_id)) throw new HttpError(400, 'グループを指定してください');
  if (group_id !== null && !(await c.env.DB.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?')
    .bind(group_id, c.me.id).first())) throw new HttpError(400, '所属しているグループを選んでください');
  return { title, place, time_text, capacity, duration_min, group_id };
}

export const eventRoutes: Route[] = [
  { method: 'GET', path: /^\/events$/, handler: async c => {
    const group = c.url.searchParams.get('group');
    const groupId = group === null || group === 'all' ? null : int(group, 'グループ', 1, Number.MAX_SAFE_INTEGER);
    const { results } = await c.env.DB.prepare(`SELECT e.id FROM events e WHERE e.expires_at > ? AND ${visibleSql(c.me.id)}
      ${groupId === null ? '' : 'AND e.group_id = ?'} ORDER BY e.expires_at, e.id`)
      .bind(...(groupId === null ? [now()] : [now(), groupId])).all<{ id: number }>();
    return json({ events: await Promise.all(results.map(e => item(c, e.id))) });
  } },
  { method: 'GET', path: /^\/events\/(\d+)$/, handler: async c => {
    const e = await find(c);
    return json({ event: await item(c, e.id) });
  } },
  { method: 'POST', path: /^\/events$/, handler: async c => {
    const v = await input(c), at = now();
    const r = await c.env.DB.prepare(`INSERT INTO events
      (host_id, group_id, title, place, time_text, capacity, duration_min, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(c.me.id, v.group_id, v.title, v.place, v.time_text,
        v.capacity, v.duration_min, at + v.duration_min * 60000, at).run();
    return json({ event: await item(c, r.meta.last_row_id) }, 201);
  } },
  { method: 'PATCH', path: /^\/events\/(\d+)$/, handler: async c => {
    const e = await owned(c), v = await input(c, e);
    const r = await c.env.DB.prepare(`UPDATE events SET title = ?, place = ?, time_text = ?, capacity = ?,
      duration_min = ?, group_id = ?, expires_at = ? WHERE id = ?
      AND (SELECT COUNT(*) FROM event_members WHERE event_id = ?) + 1 <= ?`)
      .bind(v.title, v.place, v.time_text, v.capacity, v.duration_min, v.group_id,
        e.created_at + v.duration_min * 60000, e.id, e.id, v.capacity).run();
    if (!r.meta.changes) throw new HttpError(400, '参加人数より少ない定員にはできません');
    return json({ event: await item(c, e.id) });
  } },
  { method: 'DELETE', path: /^\/events\/(\d+)$/, handler: async c => {
    const e = await owned(c);
    await c.env.DB.batch(['DELETE FROM event_members WHERE event_id = ?', 'DELETE FROM messages WHERE event_id = ?',
      'DELETE FROM events WHERE id = ?'].map(sql => c.env.DB.prepare(sql).bind(e.id)));
    return json({ ok: true });
  } },
  { method: 'POST', path: /^\/events\/(\d+)\/join$/, handler: async c => {
    const e = await find(c), at = now();
    if (e.expires_at <= at) throw new HttpError(400, '募集は終了しています');
    if (e.host_id === c.me.id) return json({ event: await item(c, e.id) });
    // 定員確認と参加登録を同じSQLで行う。直後の changes() で通知の重複を防ぐ。
    await c.env.DB.batch([
      c.env.DB.prepare(`INSERT OR IGNORE INTO event_members (event_id, user_id, joined_at)
        SELECT id, ?, ? FROM events e WHERE id = ? AND ${visibleSql(c.me.id)}
        AND (SELECT COUNT(*) FROM event_members WHERE event_id = ?) + 1 < capacity AND expires_at > ?`)
        .bind(c.me.id, at, e.id, e.id, at),
      c.env.DB.prepare(`INSERT INTO messages (event_id, user_id, kind, body, created_at)
        SELECT ?, ?, 'system', ?, ? WHERE changes() > 0`).bind(e.id, c.me.id, `${c.me.name}が参加しました`, at),
    ]);
    const event = await item(c, e.id);
    if (!event.joined) throw new HttpError(400, '定員に達しているか、募集が終了しています');
    return json({ event });
  } },
  { method: 'DELETE', path: /^\/events\/(\d+)\/join$/, handler: async c => {
    const e = await find(c);
    if (e.host_id === c.me.id) throw new HttpError(400, '主催者は参加を取り消せません');
    await c.env.DB.batch([
      c.env.DB.prepare('DELETE FROM event_members WHERE event_id = ? AND user_id = ?').bind(e.id, c.me.id),
      c.env.DB.prepare(`INSERT INTO messages (event_id, user_id, kind, body, created_at)
        SELECT ?, ?, 'system', ?, ? WHERE changes() > 0`).bind(e.id, c.me.id, `${c.me.name}が抜けました`, now()),
    ]);
    return json({ event: await item(c, e.id) });
  } },
];
