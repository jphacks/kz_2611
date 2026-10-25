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
| PATCH | /me | name?, avatar?（PNG / JPEG / WebP の base64 data URL、復号後 200KB 以内、null で削除。SVG・画像でない値・MIME と実体の不一致は 400） | { user: Me } |
| GET | /users/:id | — | { user: User, is_friend, request } 友達・本人・同じイベントの参加者どうし（主催者含む）だけ。それ以外は 404（申請中でも見えない）。request は友達申請の状態 `none`（なし・友達・本人）/ `sent`（自分が申請中）/ `received`（相手から届いている） |

## 友達（担当: functions/lib/friends.ts）
| GET | /friends | — | { friends: User[] }（名前順） |
| POST | /friends | handle または invite_code | handle: { status: "requested" } または { status: "friends", friend: User }（#77 申請。相手からの申請が届いていればすぐ友達。既に友達→200 friends。申請済みでも200 requested）。invite_code: { friend: User }（status は付かない。相互・即時。既に友達→200。2人の間の申請は消える）。自分自身・存在しない→400/404 |
| DELETE | /friends/:id | — | { ok } |
| GET | /invite/:code | — | { user: User }（招待リンクを開いたときの確認用。ログイン必要） |
| GET | /friend-requests | — | { received: User[], sent: User[] }（届いた申請・送った申請。新しい順） |
| POST | /friend-requests/:userId/accept | — | { status: "friends", friend: User }（:userId から届いた申請を承認し相互に友達になる。申請が無い→404、既に友達→200、自分→400） |
| DELETE | /friend-requests/:userId | — | { ok }（届いた申請の拒否・送った申請の取り消し。無くても200） |

## グループ（担当: functions/lib/groups.ts）
| GET | /groups | — | { groups: Group[] }（自分がメンバーのもの） |
| POST | /groups | name(1-20), profile(0-100), member_ids:number[]（自分の友達だけ） | 201 { group: Group } |
| PATCH | /groups/:id | name?(1-20), profile?(0-100) | { group: Group }（作成者だけ、他は403。存在しない→404） |
| POST | /groups/:id/members | user_id:number（整数、自分の友達だけ） | { group: Group }（作成者だけ→403、友達以外→400、重複追加は冪等） |
| DELETE | /groups/:id/members/:userId | — | { ok }（作成者は他人を削除可、本人は退会可。他人による削除→403。作成者退会時は最小user_idへ引継ぎ、最後の1人はグループ削除。募集と参加者は残す） |
| DELETE | /groups/:id | — | { ok }（作成者だけ） |

## 募集（担当: functions/lib/events.ts）
見てよいかは core.ts の `visibleSql(me.id)` で判定する。
人数は幅で募集する（#31）: capacity_min〜capacity 人（主催者を含む）。参加できるのは capacity まで。EventItem に capacity_min を返す。表示は「count / min〜max」（min=max なら「count / max」、0 は下限なし）。
| GET | /events?group=all\|<groupId> | — | { events: EventItem[] }（表示中＝expires_at > 今 のもの、締切が近い順） |
| GET | /events/:id | — | { event: EventItem }（見えない→404。終了したものも参加者は見られる） |
| POST | /events | title(1-20), place(0-30), time_text(0-20), capacity_min(2-20, 省略時は capacity と同じ), capacity(capacity_min〜20), duration_min(15/30/60/120), group_id(null か自分がメンバーのグループ) | 201 { event } |
| PATCH | /events/:id | 上と同じ項目の一部 | { event }（主催者だけ。表示中の募集で duration_min の値を変えたときだけ expires_at = created_at + 新しい分数。その他の編集では期限を維持。満員終了・期限切れの募集は duration_min や定員の変更、参加取消後の編集でも再公開しない） |
| DELETE | /events/:id | — | { ok }（主催者だけ。参加者とメッセージも消す） |
| POST | /events/:id/join | — | { event }（定員・終了・見えない→400/400/404。1つのSQLで定員を確認して追加。system メッセージ「<名前>が参加しました」） |
| DELETE | /events/:id/join | — | { event }（主催者は取り消せない→400。system メッセージ「<名前>が抜けました」） |

## チャット・トーク（担当: functions/lib/chat.ts）
参加者（主催者を含む）だけ。それ以外は 403。
| GET | /events/:id/messages?after=<id> | — | { messages: Message[] }（id の昇順、最大200件） |
| POST | /events/:id/messages | body(1-500) | 201 { message } |
| GET | /talks | — | { talks: Talk[] }（自分が主催・参加したイベント。終了したものも。最新メッセージが新しい順） |

## 通知・Web Push（担当: functions/lib/notify.ts、暗号化は functions/lib/push.ts）（#87）
鍵は Pages の secret `VAPID_PUBLIC_KEY`（base64url の非圧縮公開鍵）・`VAPID_PRIVATE_KEY`（base64url の d）・任意で `VAPID_SUBJECT`（mailto: か https:）。本番には設定済みなので、デプロイのたびに設定し直す必要はない。手元で実際に送るときだけ `app/.dev.vars`（git に入れない）に置く。
| GET | /push/key | — | { key: string \| null }（applicationServerKey。未設定なら null） |
| POST | /push/subscribe | PushSubscription.toJSON() の endpoint, keys.p256dh, keys.auth | { ok }（endpoint は https・既定ポート・認証情報なしで、FCM / Mozilla / Apple / Windows のプッシュサービスだけ。鍵は P-256 の65バイトと16バイト。それ以外→400。同じ端末の再登録は冪等。別アカウントの届け先→409（画面は購読し直す）。1人10台まで、古いものから消す） |
| DELETE | /push/subscribe | endpoint | { ok }（自分のその届け先だけ消す。オフ・ログアウト時に画面から呼ぶ。無くても200） |

送る相手（送信は返事の後に waitUntil で行う。送れなかった 404/410 の届け先は消す）:
| 場面 | 相手 | data |
|---|---|---|
| POST /events | その募集を見られる人（visibleSql と同じ条件）。主催者は除く | kind: created、title「新しい募集」、body に主催者名とタイトル |
| POST /events/:id/join（新しく参加したとき） | 主催者 | kind: joined、body に参加者名とタイトル |
| 同上で定員に達して終了したとき | 主催者と参加者。参加した本人は除く（主催者へは joined の代わりにこれを1通） | kind: full |
通知の中身は { kind, title, body, event_id, tag }。タップすると `/?event=<event_id>` が開き、ログイン後に掲示板でその募集のチャットを開く。
手元のテスト用に、localhost で鍵が無い（CI）か `PUSH_TEST_OUTBOX=1` で起動したときは送信せず記録し、`GET /push/test-outbox?event_id=<id>` で返す（それ以外は404）。
