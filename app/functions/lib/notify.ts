// #87 通知（Web Push）: 届け先の登録・解除と、募集・参加・満員終了の通知
import { Ctx, Route, HttpError, json, now, Env, EVENT_VISIBLE_SQL } from './core';
import { dispatch, pushEndpoint, validKeys, PushMessage, PushTarget, VapidKeys } from './push';

// 鍵は Pages の secret（手元は app/.dev.vars）。リポジトリには入れない
type PushEnv = Env & { VAPID_PUBLIC_KEY?: string; VAPID_PRIVATE_KEY?: string; VAPID_SUBJECT?: string; PUSH_TEST_OUTBOX?: string };
const MAX_DEVICES = 10;  // 1人あたりの端末数（古いものから消す）

function vapid(env: PushEnv): VapidKeys | null {
  if (!env.VAPID_PUBLIC_KEY || !env.VAPID_PRIVATE_KEY) return null;
  return { publicKey: env.VAPID_PUBLIC_KEY, privateKey: env.VAPID_PRIVATE_KEY, subject: env.VAPID_SUBJECT || 'https://kz2611.pages.dev' };
}
const local = (url: URL) => url.hostname === 'localhost' || url.hostname === '127.0.0.1';
/** 手元のテスト用: 鍵が無い（CI）か PUSH_TEST_OUTBOX=1 のとき、送らずにメモリへ記録する */
const testMode = (c: Ctx) => local(c.url) && ((c.env as PushEnv).PUSH_TEST_OUTBOX === '1' || !vapid(c.env as PushEnv));
const outbox: (PushMessage & { user_id: number; endpoint: string })[] = [];

const TARGET_COLS = 's.endpoint, s.p256dh, s.auth, s.user_id';
function deliver(c: Ctx, where: string, binds: unknown[], message: PushMessage) {
  c.waitUntil((async () => {
    const { results } = await c.env.DB.prepare(`SELECT ${TARGET_COLS} FROM push_subscriptions s JOIN events e ON e.id = ?
      WHERE ${where} ORDER BY s.created_at DESC`).bind(message.event_id, ...binds).all<PushTarget>();
    if (!results.length) return;
    if (testMode(c)) {
      for (const t of results) outbox.push({ ...message, user_id: Number(t.user_id), endpoint: t.endpoint });
      outbox.splice(0, Math.max(0, outbox.length - 500));
      return;
    }
    const keys = vapid(c.env as PushEnv);
    if (keys) await dispatch(c.env.DB, results, message, keys);
  })().catch(e => console.error('通知の送信処理に失敗しました', e instanceof Error ? e.name : 'error')));
}

interface EventInfo { id: number; title: unknown; place: unknown; time_text: unknown }
const detail = (e: EventInfo) => [e.time_text, e.place].filter(v => typeof v === 'string' && v).join('・');

/** 新しい募集: その募集を見られる人（visibleSql と同じ条件）へ。主催者には送らない */
export function notifyEventCreated(c: Ctx, e: EventInfo) {
  const extra = detail(e);
  deliver(c, `s.user_id != e.host_id AND ${EVENT_VISIBLE_SQL.replaceAll(':me', 's.user_id')}`, [], {
    kind: 'created', title: '新しい募集', event_id: e.id, tag: `created-${e.id}`,
    body: `${c.me.name}さんが「${e.title}」に誘っています${extra ? `（${extra}）` : ''}`,
  });
}

/** 参加: 主催者へ。満員で終了したときは、主催者と参加者（参加した本人を除く）へ終了を知らせる */
export function notifyJoined(c: Ctx, e: EventInfo, full: boolean) {
  if (full) deliver(c, `s.user_id != ? AND (s.user_id = e.host_id
      OR EXISTS (SELECT 1 FROM event_members m WHERE m.event_id = e.id AND m.user_id = s.user_id))`, [c.me.id], {
    kind: 'full', title: '人数がそろいました', event_id: e.id, tag: `full-${e.id}`,
    body: `${c.me.name}さんが参加して「${e.title}」の人数がそろいました。募集は終了です`,
  });
  else deliver(c, 's.user_id = e.host_id AND s.user_id != ?', [c.me.id], {
    kind: 'joined', title: '参加がありました', event_id: e.id, tag: `joined-${e.id}`,
    body: `${c.me.name}さんが「${e.title}」に参加しました`,
  });
}

const BAD = '通知の届け先が正しくありません';
export const pushRoutes: Route[] = [
  // 公開鍵（applicationServerKey）。未設定なら null（画面で案内を出す）
  { method: 'GET', path: /^\/push\/key$/, handler: async c => json({ key: vapid(c.env as PushEnv)?.publicKey ?? null }) },
  { method: 'POST', path: /^\/push\/subscribe$/, handler: async c => {
    const b = await c.body();
    const keys = (b.keys && typeof b.keys === 'object' ? b.keys : {}) as Record<string, unknown>;
    const endpoint = pushEndpoint(b.endpoint);
    if (!endpoint || !(await validKeys(keys.p256dh, keys.auth))) throw new HttpError(400, BAD);
    // 他のアカウントの届け先は書き換えない（画面側は購読し直して新しい届け先で登録する）
    const r = await c.env.DB.prepare(`INSERT INTO push_subscriptions (endpoint, p256dh, auth, user_id, created_at) VALUES (?, ?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET p256dh = excluded.p256dh, auth = excluded.auth WHERE push_subscriptions.user_id = excluded.user_id`)
      .bind(endpoint, keys.p256dh, keys.auth, c.me.id, now()).run();
    if (!r.meta.changes) throw new HttpError(409, 'この端末の通知は別のアカウントで登録されています');
    await c.env.DB.prepare(`DELETE FROM push_subscriptions WHERE user_id = ? AND rowid NOT IN
      (SELECT rowid FROM push_subscriptions WHERE user_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ${MAX_DEVICES})`)
      .bind(c.me.id, c.me.id).run();
    return json({ ok: true });
  } },
  // この端末の届け先だけを消す（オフ・ログアウト）。自分のもの以外は消さない。無くても200
  { method: 'DELETE', path: /^\/push\/subscribe$/, handler: async c => {
    const b = await c.body();
    if (typeof b.endpoint !== 'string' || b.endpoint.length > 1024) throw new HttpError(400, BAD);
    const endpoint = pushEndpoint(b.endpoint) ?? b.endpoint;
    await c.env.DB.prepare('DELETE FROM push_subscriptions WHERE endpoint = ? AND user_id = ?').bind(endpoint, c.me.id).run();
    return json({ ok: true });
  } },
  // 手元のテスト専用（localhost かつ送信しないとき）。本番では 404
  { method: 'GET', path: /^\/push\/test-outbox$/, handler: async c => {
    if (!testMode(c)) throw new HttpError(404, '見つかりません');
    const id = Number(c.url.searchParams.get('event_id'));
    return json({ notifications: outbox.filter(n => n.event_id === id) });
  } },
];
