#!/usr/bin/env bash
# マイグレーションのルール違反を検出する（既存ファイルの変更、番号の重複、DROP/RENAME）
set -euo pipefail
cd "$(dirname "$0")/.."
base="${1:-origin/main}"
fail=0
if git rev-parse --verify -q "$base" >/dev/null; then
  changed=$(git diff --name-only --diff-filter=MDR "$base"...HEAD -- migrations/ || true)
  if [ -n "$changed" ]; then echo "既存のマイグレーションは変更できません: $changed"; fail=1; fi
fi
dups=$(ls migrations | cut -c1-4 | sort | uniq -d)
if [ -n "$dups" ]; then echo "マイグレーション番号が重複しています: $dups"; fail=1; fi
if grep -iEn '\b(DROP|RENAME)\b' migrations/*.sql; then echo "DROP/RENAME は使えません"; fail=1; fi
exit $fail
