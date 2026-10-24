import { Ctx, HttpError, Route, int, json, now, pickUser, str, userCols } from './core';
import { EventItemRow, eventItems } from './eventItem';

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
    const { results } = await c.env.DB.prepare(`SELECT e.*, g.name AS group_name, ${userCols('h', 'host_')},
      m.id AS message_id, m.event_id, m.kind, m.body, m.created_at AS message_created_at,
      ${userCols('u', 'user_')}
      FROM events e JOIN users h ON h.id = e.host_id LEFT JOIN groups g ON g.id = e.group_id
      LEFT JOIN messages m ON m.id = (SELECT last.id FROM messages last WHERE last.event_id = e.id ORDER BY last.id DESC LIMIT 1)
      LEFT JOIN users u ON u.id = m.user_id
      WHERE ${participantSql}
      ORDER BY COALESCE(m.created_at, e.created_at) DESC, COALESCE(m.id, 0) DESC, e.id DESC`)
      .bind(c.me.id, c.me.id).all<EventItemRow>();
    const at = now();
    const events = await eventItems(c, results);
    const talks = results.map((row, i) => ({ event: events[i],
      last: row.message_id == null ? null : message({ ...row, created_at: row.message_created_at }),
      active: Number(row.expires_at) > at }));
    return json({ talks });
  } },
];
