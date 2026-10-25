import { Ctx, Route, HttpError, json, str, int, jsonInt, now, visibleSql } from './core';
import { item, eventItems, eventItemSql, EventItemRow as EventRow } from './eventItem';
import { notifyEventCreated, notifyJoined } from './notify';

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
async function input(c: Ctx, previous?: EventRow) {
  const b = await c.body();
  const v = { ...previous, ...b };
  const title = str(v.title, 'タイトル', 1, 20);
  const place = str(v.place, '場所', 0, 30);
  const time_text = str(v.time_text, '時間', 0, 20);
  const capacity = jsonInt(v.capacity, '定員', 2, 20);
  const capacity_min = b.capacity_min === undefined ? capacity : jsonInt(b.capacity_min, '人数の下限', 2, 20);
  if (capacity_min > capacity) throw new HttpError(400, '人数の下限は上限以下にしてください');
  const duration_min = jsonInt(v.duration_min, '表示時間', 15, 120);
  if (![15, 30, 60, 120].includes(duration_min)) throw new HttpError(400, '表示時間は15・30・60・120分から選んでください');
  const group_id = v.group_id === null ? null :
    typeof v.group_id === 'number' ? int(v.group_id, 'グループ', 1, Number.MAX_SAFE_INTEGER) : NaN;
  if (Number.isNaN(group_id)) throw new HttpError(400, 'グループを指定してください');
  // 公開範囲を変えない編集では所属を確認しない（退会・グループ削除後も編集できる。#139）
  if (group_id !== null && group_id !== previous?.group_id &&
    !(await c.env.DB.prepare('SELECT 1 FROM group_members WHERE group_id = ? AND user_id = ?')
      .bind(group_id, c.me.id).first())) throw new HttpError(400, '所属しているグループを選んでください');
  return { title, place, time_text, capacity, capacity_min, duration_min, group_id };
}

export const eventRoutes: Route[] = [
  { method: 'GET', path: /^\/events$/, handler: async c => {
    const group = c.url.searchParams.get('group');
    const groupId = group === null || group === 'all' ? null : int(group, 'グループ', 1, Number.MAX_SAFE_INTEGER);
    const { results } = await c.env.DB.prepare(`${eventItemSql} WHERE e.expires_at > ? AND ${visibleSql(c.me.id)}
      ${groupId === null ? '' : 'AND e.group_id = ?'} ORDER BY e.expires_at, e.id`)
      .bind(...(groupId === null ? [now()] : [now(), groupId])).all<EventRow>();
    return json({ events: await eventItems(c, results) });
  } },
  { method: 'GET', path: /^\/events\/(\d+)$/, handler: async c => {
    const e = await find(c);
    return json({ event: await item(c, e.id) });
  } },
  { method: 'POST', path: /^\/events$/, handler: async c => {
    const v = await input(c), at = now();
    const r = await c.env.DB.prepare(`INSERT INTO events
      (host_id, group_id, title, place, time_text, capacity, capacity_min, duration_min, expires_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).bind(c.me.id, v.group_id, v.title, v.place, v.time_text,
        v.capacity, v.capacity_min, v.duration_min, at + v.duration_min * 60000, at).run();
    const event = await item(c, r.meta.last_row_id);
    notifyEventCreated(c, event);
    return json({ event }, 201);
  } },
  { method: 'PATCH', path: /^\/events\/(\d+)$/, handler: async c => {
    const e = await owned(c), v = await input(c, e), at = now();
    // 期限の再計算と、定員が現在人数まで縮んだときの満員終了を同じトランザクションで確定する（#138）。
    // 終了判定は「表示中」かつ「主催者を含む人数＝新しい定員」のときだけで、既に終了した募集は動かさない。
    const [updated] = await c.env.DB.batch([
      // 更新時点の期限と旧durationで判定し、joinによる終了を古い読み取りで上書きしない。
      c.env.DB.prepare(`UPDATE events SET title = ?, place = ?, time_text = ?, capacity = ?, capacity_min = ?,
        duration_min = ?, group_id = ?, expires_at = CASE
          WHEN expires_at > MAX(?, CAST(unixepoch('subsec') * 1000 AS INTEGER))
            AND expires_at = created_at + duration_min * 60000
            AND duration_min != ? THEN created_at + ? * 60000
          ELSE expires_at END WHERE id = ?
        AND (SELECT COUNT(*) FROM event_members WHERE event_id = ?) + 1 <= ?`)
        .bind(v.title, v.place, v.time_text, v.capacity, v.capacity_min, v.duration_min, v.group_id,
          at, v.duration_min, v.duration_min, e.id, e.id, v.capacity),
      c.env.DB.prepare(`UPDATE events SET expires_at = ? WHERE id = ? AND expires_at > ?
        AND (SELECT COUNT(*) FROM event_members WHERE event_id = ?) + 1 = ?`)
        .bind(at, e.id, at, e.id, v.capacity),
      c.env.DB.prepare(`INSERT INTO messages (event_id, user_id, kind, body, created_at)
        SELECT ?, ?, 'system', ?, ? WHERE changes() > 0`)
        .bind(e.id, c.me.id, '人数がそろったので募集を終了しました', at),
    ]) as { meta?: { changes?: number } }[];
    if (!updated?.meta?.changes) throw new HttpError(400, '参加人数より少ない定員にはできません');
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
    // 参加・通知・満員終了を同じトランザクションで行い、直前の changes() で重複を防ぐ。
    const [added, , full] = await c.env.DB.batch([
      c.env.DB.prepare(`INSERT OR IGNORE INTO event_members (event_id, user_id, joined_at)
        SELECT id, ?, ? FROM events e WHERE id = ? AND ${visibleSql(c.me.id)}
        AND (SELECT COUNT(*) FROM event_members WHERE event_id = ?) + 1 < capacity AND expires_at > ?`)
        .bind(c.me.id, at, e.id, e.id, at),
      c.env.DB.prepare(`INSERT INTO messages (event_id, user_id, kind, body, created_at)
        SELECT ?, ?, 'system', ?, ? WHERE changes() > 0`).bind(e.id, c.me.id, `${c.me.name}が参加しました`, at),
      c.env.DB.prepare(`UPDATE events SET expires_at = ? WHERE id = ? AND changes() > 0
        AND expires_at > ? AND (SELECT COUNT(*) FROM event_members WHERE event_id = ?) + 1 = capacity`)
        .bind(at, e.id, at, e.id),
      c.env.DB.prepare(`INSERT INTO messages (event_id, user_id, kind, body, created_at)
        SELECT ?, ?, 'system', ?, ? WHERE changes() > 0`)
        .bind(e.id, c.me.id, '人数がそろったので募集を終了しました', at),
    ]) as { meta?: { changes?: number } }[];
    const event = await item(c, e.id);
    if (!event.joined) throw new HttpError(400, '定員に達しているか、募集が終了しています');
    // 新しく参加できたときだけ通知する（参加済みの再送では送らない）
    if (added?.meta?.changes) notifyJoined(c, event, !!full?.meta?.changes);
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
