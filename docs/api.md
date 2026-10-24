# API 契約（★共有）

すべて `/api` 以下、JSON。ログインが要るものは `Authorization: Bearer <token>`。エラーは `{ "error": "日本語のメッセージ" }`。
型は `app/src/api.ts`（User / Me / Group / EventItem / Message / Talk）。レスポンスの項目は削除・改名しない（追加はOK）。

## 認証・自分（実装済み: functions/lib/auth.ts）
| メソッド | パス | 入力 | 出力 |
|---|---|---|---|
| POST | /register | handle, name, password | 201 { token, user: Me } |
| POST | /login | handle, password | { token, user: Me } |
| POST | /logout | — | { ok } |
| GET | /me | — | { user: Me } |
| GET | /health | — | { db: "ok" } |

## プロフィール（担当: functions/lib/profile.ts）
| PATCH | /me | name?, avatar?（data URL, 200KB以内, null で削除） | { user: Me } |
| GET | /users/:id | — | { user: User, is_friend } 友達か本人だけ。それ以外は 404 |

## 友達（担当: functions/lib/friends.ts）
| GET | /friends | — | { friends: User[] }（名前順） |
| POST | /friends | handle または invite_code | { friend: User }（相互・即時。自分自身・存在しない→400/404、既に友達→200） |
| DELETE | /friends/:id | — | { ok } |
| GET | /invite/:code | — | { user: User }（招待リンクを開いたときの確認用。ログイン必要） |

## グループ（担当: functions/lib/groups.ts）
| GET | /groups | — | { groups: Group[] }（自分がメンバーのもの） |
| POST | /groups | name(1-20), profile(0-100), member_ids:number[]（自分の友達だけ） | 201 { group: Group } |
| DELETE | /groups/:id | — | { ok }（作成者だけ） |

## 募集（担当: functions/lib/events.ts）
見てよいかは core.ts の `visibleSql(me.id)` で判定する。
| GET | /events?group=all\|<groupId> | — | { events: EventItem[] }（表示中＝expires_at > 今 のもの、締切が近い順） |
| GET | /events/:id | — | { event: EventItem }（見えない→404。終了したものも参加者は見られる） |
| POST | /events | title(1-20), place(0-30), time_text(0-20), capacity(2-20), duration_min(15/30/60/120), group_id(null か自分がメンバーのグループ) | 201 { event } |
| PATCH | /events/:id | 上と同じ項目の一部 | { event }（主催者だけ。duration_min を変えたら expires_at = created_at + 新しい分数） |
| DELETE | /events/:id | — | { ok }（主催者だけ。参加者とメッセージも消す） |
| POST | /events/:id/join | — | { event }（定員・終了・見えない→400/400/404。1つのSQLで定員を確認して追加。system メッセージ「<名前>が参加しました」） |
| DELETE | /events/:id/join | — | { event }（主催者は取り消せない→400。system メッセージ「<名前>が抜けました」） |

## チャット・トーク（担当: functions/lib/chat.ts）
参加者（主催者を含む）だけ。それ以外は 403。
| GET | /events/:id/messages?after=<id> | — | { messages: Message[] }（id の昇順、最大200件） |
| POST | /events/:id/messages | body(1-500) | 201 { message } |
| GET | /talks | — | { talks: Talk[] }（自分が主催・参加したイベント。終了したものも。最新メッセージが新しい順） |
