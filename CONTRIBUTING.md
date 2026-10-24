# 開発者向け

他の端末の人・AIエージェントも、このリポジトリだけで開発に参加できるようにしてある。

## 最初に読むもの
| ファイル | 内容 |
|---|---|
| AGENTS.md | 開発ルール（人間・AI共通）。必ず最初に全部読む |
| docs/spec.md | 仕様書（正） |
| docs/mock-decisions.md | 仕様で「不明」の点を、モックのために仮に決めたもの |
| docs/api.md | API の契約 |
| docs/design/style11-colorpop.png | デザインの見本（Color Pop）。全画面これに揃える |
| docs/design/sketch-styles-12.pdf | デザイン候補12案（採用は STYLE 11 Color Pop） |
| docs/design/ui-image/ | 手書き図と音声から作ったUIイメージ |
| docs/sources/ | 元資料: アイデアマップ、UI設計図、手書きUI図、説明音声の文字起こし |

## 始め方
必要なもの: Node.js 22、Python 3、gh CLI（`gh auth login` 済み、jphacks/kz_2611 に push できること）

```
git clone https://github.com/jphacks/kz_2611.git
cd kz_2611/app
npm install
npm run db:migrate:local
npm run dev:api        # http://localhost:8788（画面と API と手元DB）
npm run typecheck
npm run test:api       # dev:api を起動した状態で
```
- Cloudflare のログインは不要（手元の DB だけで動く）
- 2人で確かめるときは http://localhost:8788 と http://127.0.0.1:8788 を別々に開く

## 進め方
1. `gh issue list -R jphacks/kz_2611` で空いている Issue を探す（AGENTS.md 8章の手順で、作業中のものは飛ばす）
2. 新しい作業は Issue テンプレート（何を／なぜ／完了条件）で Issue を作ってから始める
3. ブランチ → PR → CI（check）が通ったら squash でマージ

## 公開（オーナーだけ）
- 公開先: https://kz2611.pages.dev（Cloudflare Pages プロジェクト kz2611、D1 kz2611-db）
- main へのマージでは公開されない。オーナーが確認してから手で公開する
