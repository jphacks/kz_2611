import { Ctx, HttpError, Route, int, json, now, pickUser, str, userCols } from './core';

type Row = Record<string, unknown>;
const participantSql = `(e.host_id = ? OR EXISTS (
  SELECT 1 FROM event_members em WHERE em.event_id = e.id AND em.user_id = ?))`;
const messageSql = `SELECT m.id AS message_id, m.event_id, m.kind, m.body, m.created_at,
  ${userCols('u', 'user_')} FROM messages m LEFT JOIN users u ON u.id = m.user_id`;

function message(row: Row) {
  return { id: Number(row.message_id), event_id: Number(row.event_id),
    kind: row.kind, body: row.body, created_at: Number(row.created_at),
    user: row.user_id == null ? null : pickUser(row, 'user_') };
}

async function requireParticipant(c: Ctx, eventId: number) {
  const event = await c.env.DB.prepare(`SELECT e.id AS event_id FROM events e
    WHERE e.id = ? AND ${participantSql}`).bind(eventId, c.me.id, c.me.id).first();
  if (!event) throw new HttpError(403, '参加者だけがチャットを利用できます');
}

// events.ts とは独立して、トークに必要な EventItem を組み立てる。
async function eventItem(c: Ctx, row: Row) {
  const { results } = await c.env.DB.prepare(`SELECT ${userCols('u', 'user_')}
    FROM event_members em JOIN users u ON u.id = em.user_id
    WHERE em.event_id = ? AND em.user_id != ? ORDER BY em.joined_at, u.id`)
    .bind(row.event_id, row.host_id).all<Row>();
  const members = results.map(r => pickUser(r, 'user_'));
  const isHost = Number(row.host_id) === c.me.id;
  return { id: Number(row.event_id), title: row.title, place: row.place, time_text: row.time_text,
    capacity: Number(row.capacity), capacity_min: Number(row.capacity_min), duration_min: Number(row.duration_min),
    expires_at: Number(row.expires_at), created_at: Number(row.created_at),
    group_id: row.group_id == null ? null : Number(row.group_id), group_name: row.group_name,
    host: pickUser(row, 'host_'), members, count: members.length + 1,
    joined: isHost || members.some(u => u.id === c.me.id), is_host: isHost };
}

export const chatRoutes: Route[] = [
  { method: 'GET', path: /^\/events\/(\d+)\/messages$/, handler: async c => {
    const eventId = int(c.params[0], 'イベントID', 1, Number.MAX_SAFE_INTEGER);
    await requireParticipant(c, eventId);
    const rawAfter = c.url.searchParams.get('after');
    const after = rawAfter === null ? 0 : int(rawAfter, 'after', 0, Number.MAX_SAFE_INTEGER);
    const { results } = await c.env.DB.prepare(`${messageSql}
      WHERE m.event_id = ? AND m.id > ? ORDER BY m.id ASC LIMIT 200`).bind(eventId, after).all<Row>();
    return json({ messages: results.map(message) });
  } },
  { method: 'POST', path: /^\/events\/(\d+)\/messages$/, handler: async c => {
    const eventId = int(c.params[0], 'イベントID', 1, Number.MAX_SAFE_INTEGER);
    await requireParticipant(c, eventId);
    const body = str((await c.body()).body, 'メッセージ', 1, 500);
    // 参加取り消しと競合した場合にも、書き込み時点の参加資格を確認する。
    const result = await c.env.DB.prepare(`INSERT INTO messages (event_id, user_id, kind, body, created_at)
      SELECT e.id, ?, 'text', ?, ? FROM events e WHERE e.id = ? AND ${participantSql}`)
      .bind(c.me.id, body, now(), eventId, c.me.id, c.me.id).run();
    if (!result.meta.changes) throw new HttpError(403, '参加者だけがチャットを利用できます');
    const row = await c.env.DB.prepare(`${messageSql} WHERE m.id = ?`).bind(result.meta.last_row_id).first<Row>();
    return json({ message: message(row!) }, 201);
  } },
  { method: 'GET', path: /^\/talks$/, handler: async c => {
    const { results } = await c.env.DB.prepare(`SELECT e.id AS event_id, e.host_id, e.group_id,
      e.title, e.place, e.time_text, e.capacity, e.capacity_min, e.duration_min, e.expires_at, e.created_at,
      g.name AS group_name, ${userCols('h', 'host_')},
      (SELECT m.id FROM messages m WHERE m.event_id = e.id ORDER BY m.id DESC LIMIT 1) AS last_id
      FROM events e JOIN users h ON h.id = e.host_id LEFT JOIN groups g ON g.id = e.group_id
      WHERE ${participantSql}
      ORDER BY COALESCE((SELECT m.created_at FROM messages m WHERE m.id = last_id), e.created_at) DESC,
        COALESCE(last_id, 0) DESC, e.id DESC`).bind(c.me.id, c.me.id).all<Row>();
    const at = now();
    const talks = await Promise.all(results.map(async row => {
      const lastRow = row.last_id == null ? null : await c.env.DB.prepare(`${messageSql} WHERE m.id = ?`)
        .bind(row.last_id).first<Row>();
      return { event: await eventItem(c, row), last: lastRow ? message(lastRow) : null,
        active: Number(row.expires_at) > at };
    }));
    return json({ talks });
  } },
];
