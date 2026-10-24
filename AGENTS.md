# AGENTS.md — 開発ルール（人間・AIエージェント共通）

Claude Code / Codex などのAIエージェントと人間の両方が読む。作業を始める前に全部読むこと。
ここのルールは個別の指示より優先する（ユーザーが明示的に変更を指示した場合を除く）。

## 1. プロダクト
- 仕様: docs/spec.md が正。モックのために仮に決めたことは docs/mock-decisions.md。どちらにも無い機能は作らない
- 作らないもの: グループチャット、暇かどうかが分かる機能、「行けたら行く」
- API の契約: docs/api.md（★共有）。型は app/src/api.ts
- 不明な点は推測で大きく作らず、Issue にコメントで質問する
- 進捗は Issue と PR だけで管理する。進捗まとめの Issue やファイルは作らない

## 2. 技術スタック（勝手に変えない）
| 層 | 使うもの |
|---|---|
| アプリ | Expo SDK 58 / React Native 0.88 / React 19 / TypeScript（strict）。Webは react-native-web |
| 画面遷移 | app/src/Main.tsx の state（Expo Router は使わない） |
| API | Cloudflare Pages Functions（app/functions/、パスは /api/*） |
| DB | Cloudflare D1（SQLite）。スキーマは app/migrations/ |
| 公開 | Cloudflare Pages（プロジェクト kz2611、https://kz2611.pages.dev） |

- ライブラリは `npx expo install <pkg>` で入れる。PR説明に書く
- Web専用API（window, document, localStorage）は直接使わない。必要なら `Platform.OS === 'web'` で分岐
- Expo の API は記憶で書かず https://docs.expo.dev/versions/v58.0.0/ で確認する

## 3. デザイン（Swiss・全画面で統一）
- 色は app/src/ui/theme.ts の C だけ: 白 #FFFFFF / 薄灰 #F4F4F4 / 黒 #0A0A0A / 赤 #FF2D20 / 灰 #8A8A8A（+区切り線 #E2E2E2）。赤はアクセント1色だけ。新しい色・グラデーション・影を作らない
- 角丸ゼロ（RADIUS=0）。丸はアバターと人数の丸ゲージだけ
- 文字は Inter / Noto Sans JP（FONT）。見出しは太く大きく、数字は巨大に（例: 残り時間「あと 40 分」の40）。T（文字スタイル）と S（部品スタイル）を使う
- 画面上部は ui/Header（日付＋大きな見出し）。タブ・選択肢は ui/Chip（四角）。シートは ui/Sheet
- 絵文字をアイコンに使わない（アイコンは react-native-svg の線画）
- 見本: docs/design/style12-swiss.png

## 4. ディレクトリと担当（衝突を防ぐ最重要ルール）
```
app/
  src/Main.tsx                ★共有: ログイン状態・下タブ・画面切り替え
  src/api.ts                  ★共有: fetch・共通型
  src/lib/util.ts             ★共有: errMsg / usePolling
  src/ui/*                    ★共有: theme / Avatar / Chip / Header / Sheet
  src/screens/AuthScreen.tsx  認証（実装済み）
  src/screens/BoardScreen.tsx       掲示板
  src/components/EventCard.tsx      掲示板
  src/components/ChatSheet.tsx      チャット
  src/components/ParticipantsSheet.tsx チャット
  src/screens/CreateScreen.tsx      誘う
  src/screens/TalkScreen.tsx        トーク
  src/screens/FollowScreen.tsx      フォロー
  src/screens/ProfileScreen.tsx     プロフィール
  functions/api/[[path]].ts   ★共有: ルーター（全機能の import は登録済み。触らない）
  functions/lib/core.ts       ★共有: 型・認証・入力チェック・visibleSql
  functions/lib/auth.ts       認証（実装済み）
  functions/lib/<機能>.ts     各機能の API（profile / friends / groups / events / chat）
  migrations/                 ★共有（追加のみ）
  scripts/tests/test_<機能>.py 各機能の API テスト（自分のファイルだけ作る）
```
- 担当は Issue に書いてある「触るファイル」。新しい部品は新しいファイルで作る
- ★共有ファイルは触らない。どうしても必要なら数行の追加だけにし、PR説明に「★共有の変更あり: ファイルと理由」を書く
- 担当外のファイルは自分で直さず、Issue かコメントで頼む

## 5. API の決まり
- 入力は必ずサーバー側でチェックする（core.ts の str / int）。画面側のチェックは信用しない
- SQL は必ずプレースホルダ（?）。文字列連結で値を埋め込まない
- 見せてよいかの判定はサーバー側（募集は visibleSql、チャットは参加者か）。見えないものは 404
- 他人のユーザー情報は PUBLIC_USER（id, handle, name, avatar）だけ返す
- JOIN した id は必ず別名を付ける（`u.id AS user_id`）。D1 は後の id で上書きする
- 上限（定員）は確認と書き込みを1つのSQLで行う（`INSERT ... SELECT ... WHERE (人数) < capacity`）
- 時刻は UNIX ミリ秒の INTEGER
- 定期取得は util.ts の usePolling を使う（見えていないときは止まる）

## 6. DB マイグレーション
- 0001_init.sql に全機能のテーブルを用意済み。変更は `migrations/NNNN_説明.sql` を追加する。既存ファイルは編集しない
- 使ってよいのは CREATE TABLE / CREATE INDEX / ALTER TABLE ... ADD COLUMN（デフォルト値付き）だけ。CI が違反を検出する

## 7. 開発コマンド（app/ で実行）
```
npm install
npm run db:migrate:local   # 手元DB
npm run dev:api            # Web書き出し + API + DB を http://localhost:8788 で起動
npm run typecheck
npm run test:api           # dev:api を起動した状態で。手元以外には流せない
```
- 2人で確かめるときは http://localhost:8788 と http://127.0.0.1:8788 を別々に開く
- 他のエージェントと同時に動かすときはポートを変える（`npx wrangler pages dev dist --port 88xx`、テストは `npm run test:api -- http://localhost:88xx`）

## 8. Issue・ブランチ・PR
### 着手の手順（人間・AI共通）
1. 誰かが手をつけていないか確認する: `gh issue view <番号> --comments`、`git fetch --all && git branch -r`、`gh pr list --state open`
2. 「作業中」のコメント、担当者、対応するブランチや PR があれば飛ばす
3. 空いていれば Issue に「作業中です（ブランチ名: ...）」とコメントし、自分を担当者にしてから始める
4. 途中でやめるときは「作業をやめます（どこまでできたか）」とコメントし、担当者を外す

### ブランチと PR
1. main に直接 push しない。main から `feat/<issue番号>-<短い説明>`（不具合は `fix/...`）を切る
2. 1つの PR は1つの Issue。小さく早めに出す
3. PR の前に: main を取り込む、typecheck・build・test:api が通る、画面を変えたら実際に操作した
4. PR 説明: `Closes #番号`、何を変えたか、どう確かめたか、★共有・マイグレーションの変更の有無
5. マージは誰がしてもよい（本人のAIエージェントも可）。条件は CI（check）が通っていて衝突がないこと
6. `.github/workflows/`・`migrations/`・認証・`wrangler.toml` の変更は、他の1人に見てもらってからマージ
7. マージは squash だけ。Issue は `Closes #番号` で閉じる

## 9. 公開
- 公開はオーナーが確認してから手で行う（main へのマージでは公開されない）
- 人もエージェントも実行しない: `wrangler pages deploy`、`wrangler d1 ... --remote`

## 10. AIエージェントへの追加ルール
- 作業の最初に、仕様書・docs/api.md・担当の Issue とコメントを読み、8章の手順で空きを確認する
- 担当外のファイル、★共有ファイル、package.json、wrangler.toml、.github/workflows/、既存のマイグレーションを変える前に、指示した人に確認する
- 実行しない: `git push origin main`、自分の作業ブランチ以外への `git push --force`、Cloudflare や GitHub の設定変更
- テストは手元の DB だけで行う
- 秘密情報（パスワード、APIキー、トークン、個人情報）をコード・Issue・PR・ログに書かない
- 完了報告では「何を変えたか」「どのコマンドで何を確かめたか」「確かめていないこと」を書く。確かめていないことを「動く」と書かない
- README.md は提出物（作品紹介とデモ URL だけ）。開発用の情報は CONTRIBUTING.md、ルールはこのファイル
- 画面の文言とコメントは日本語
