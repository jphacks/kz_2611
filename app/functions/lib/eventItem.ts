import { Ctx, HttpError, User, pickUser, userCols } from './core';

export type EventItemRow = Record<string, unknown> & {
  id: number; host_id: number; group_id: number | null; capacity: number; capacity_min: number;
  duration_min: number; created_at: number; expires_at: number;
};

export const eventItemSql = `SELECT e.*, g.name AS group_name, ${userCols('h', 'host_')}
  FROM events e JOIN users h ON h.id = e.host_id LEFT JOIN groups g ON g.id = e.group_id`;

// JSON配列を1引数で渡すので、一覧がD1のバインド変数上限を超えても分割不要。
export async function eventMembers(c: Ctx, ids: number[]) {
  const members = new Map<number, User[]>();
  if (!ids.length) return members;
  const { results } = await c.env.DB.prepare(`SELECT m.event_id, ${userCols('u', 'member_')}
    FROM event_members m JOIN users u ON u.id = m.user_id
    JOIN events e ON e.id = m.event_id
    WHERE m.event_id IN (SELECT CAST(value AS INTEGER) FROM json_each(?)) AND m.user_id != e.host_id
    ORDER BY m.event_id, m.joined_at, m.user_id`).bind(JSON.stringify(ids)).all();
  for (const row of results) {
    const id = Number(row.event_id);
    if (!members.has(id)) members.set(id, []);
    members.get(id)!.push(pickUser(row, 'member_'));
  }
  return members;
}

// 詳細・作成・編集・参加・掲示板・トークで同じ変換を使う。
export function eventItem(c: Ctx, row: EventItemRow, members: User[]) {
  const is_host = Number(row.host_id) === c.me.id;
  return { id: Number(row.id), title: row.title, place: row.place, time_text: row.time_text,
    capacity: Number(row.capacity), capacity_min: Number(row.capacity_min), duration_min: Number(row.duration_min),
    expires_at: Number(row.expires_at), created_at: Number(row.created_at),
    group_id: row.group_id == null ? null : Number(row.group_id), group_name: row.group_name,
    host: pickUser(row, 'host_'), members, count: members.length + 1,
    joined: is_host || members.some(u => u.id === c.me.id), is_host };
}

export async function eventItems(c: Ctx, rows: EventItemRow[]) {
  const members = await eventMembers(c, rows.map(row => row.id));
  return rows.map(row => eventItem(c, row, members.get(row.id) ?? []));
}

export async function item(c: Ctx, id: number) {
  const row = await c.env.DB.prepare(`${eventItemSql} WHERE e.id = ?`).bind(id).first<EventItemRow>();
  if (!row) throw new HttpError(404, '募集が見つかりません');
  return (await eventItems(c, [row]))[0];
}
