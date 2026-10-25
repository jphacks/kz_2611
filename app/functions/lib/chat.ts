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

// トーク一覧の1ページ。終了したイベントも含むので、履歴が増えても応答を抑える（#136）。
const TALKS_LIMIT = 50;
type TalksCursor = { at: number; messageId: number; eventId: number };
/** 並び順（最新メッセージの時刻・ID・イベントID）をそのまま次のページの位置にする */
const talksCursor = (at: number, messageId: number, eventId: number) => `${at}:${messageId}:${eventId}`;
function parseTalksCursor(v: string | null): TalksCursor | null {
  if (v === null) return null;
  const parts = v.split(':');
  if (parts.length !== 3) throw new HttpError(400, 'before の形式が正しくありません');
  return {
    at: int(parts[0], 'before', 0, Number.MAX_SAFE_INTEGER),
    messageId: int(parts[1], 'before', 0, Number.MAX_SAFE_INTEGER),
    eventId: int(parts[2], 'イベントID', 1, Number.MAX_SAFE_INTEGER),
  };
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
    const rawLimit = c.url.searchParams.get('limit');
    const limit = rawLimit === null ? TALKS_LIMIT : int(rawLimit, '件数', 1, TALKS_LIMIT);
    const before = parseTalksCursor(c.url.searchParams.get('before'));
    // 主催と参加の候補IDを先に絞ってからイベントを引く（全イベント走査を避ける）。
    // 過去ページは並び順の3項目より小さい行だけを返すので、同時刻でも重複・欠落しない。
    const after = before === null ? '' : `WHERE latest.sort_at < ? OR (latest.sort_at = ? AND latest.sort_id < ?)
      OR (latest.sort_at = ? AND latest.sort_id = ? AND latest.id < ?)`;
    const binds = before === null ? [] : [before.at, before.at, before.messageId, before.at, before.messageId, before.eventId];
    const { results } = await c.env.DB.prepare(`WITH mine AS (
        SELECT e.id AS event_id FROM events e WHERE e.host_id = ?
        UNION
        SELECT em.event_id FROM event_members em WHERE em.user_id = ?
      ), latest AS (
        SELECT e.*, m.id AS message_id, m.event_id, m.kind, m.body,
          m.created_at AS message_created_at, m.user_id AS message_user_id,
          COALESCE(m.created_at, e.created_at) AS sort_at, COALESCE(m.id, 0) AS sort_id
        FROM mine JOIN events e ON e.id = mine.event_id
        LEFT JOIN messages m ON m.id = (SELECT last.id FROM messages last WHERE last.event_id = e.id ORDER BY last.id DESC LIMIT 1)
      )
      SELECT latest.*, g.name AS group_name, ${userCols('h', 'host_')}, ${userCols('u', 'user_')}
      FROM latest JOIN users h ON h.id = latest.host_id
      LEFT JOIN groups g ON g.id = latest.group_id
      LEFT JOIN users u ON u.id = latest.message_user_id
      ${after}
      ORDER BY latest.sort_at DESC, latest.sort_id DESC, latest.id DESC
      LIMIT ?`)
      .bind(c.me.id, c.me.id, ...binds, limit + 1).all<EventItemRow & Row>();
    // 1件多く取って、続きの有無を判定する。
    const page = results.slice(0, limit);
    const last = page[page.length - 1];
    const at = now();
    const events = await eventItems(c, page);
    const talks = page.map((row, i) => ({ event: events[i],
      last: row.message_id == null ? null : message({ ...row, created_at: row.message_created_at }),
      active: Number(row.expires_at) > at }));
    return json({ talks, next: results.length > limit ? talksCursor(Number(last.sort_at), Number(last.sort_id), Number(last.id)) : null });
  } },
];
