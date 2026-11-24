#!/usr/bin/env bash
# リハーサルの通し実行（ローカル完結、本番データには触らない）
#   1. スクラッチ PostgreSQL に現行スキーマ＋サンプルデータを投入
#   2. pg_dump -> pg-to-d1.mjs で変換
#   3. ローカル D1（airapj-rehearsal）にマイグレーション 0001〜0006 を適用してからデータを投入
#   4. 件数と主要レコードを目視確認するためのクエリ結果を表示
# 前提: PostgreSQL 16 のバイナリ (/usr/lib/postgresql/16/bin) と postgres ユーザーが使えること
set -euo pipefail

MIG_DIR="$(cd "$(dirname "$0")/.." && pwd)"
WORKERS_DIR="$(cd "$MIG_DIR/.." && pwd)"
PGBIN="${PGBIN:-/usr/lib/postgresql/16/bin}"
SCRATCH="${SCRATCH:-/tmp/airapj-rehearsal}"
PORT="${PORT:-54399}"

rm -rf "$SCRATCH"
mkdir -p "$SCRATCH/pgdata" "$SCRATCH/pgsock"
chown -R postgres:postgres "$SCRATCH" 2>/dev/null || true

cleanup() {
  su postgres -c "$PGBIN/pg_ctl -D $SCRATCH/pgdata stop" >/dev/null 2>&1 || true
}
trap cleanup EXIT

su postgres -c "$PGBIN/initdb -D $SCRATCH/pgdata -U postgres --auth=trust" >/dev/null
su postgres -c "$PGBIN/pg_ctl -D $SCRATCH/pgdata -o '-k $SCRATCH/pgsock -p $PORT -c listen_addresses=' -l $SCRATCH/pg.log start" >/dev/null

"$PGBIN/createdb" -h "$SCRATCH/pgsock" -p "$PORT" -U postgres rehearsal
"$PGBIN/psql" -h "$SCRATCH/pgsock" -p "$PORT" -U postgres -d rehearsal -v ON_ERROR_STOP=1 -q \
  -f "$MIG_DIR/rehearsal/sample-pg.sql"
"$PGBIN/pg_dump" -h "$SCRATCH/pgsock" -p "$PORT" -U postgres \
  --data-only --no-owner --no-privileges rehearsal > "$SCRATCH/dump.sql"
echo "== pg_dump 完了 =="

node "$MIG_DIR/pg-to-d1.mjs" "$SCRATCH/dump.sql" --out "$MIG_DIR/out"

cd "$WORKERS_DIR"
npx wrangler d1 migrations apply airapj-rehearsal --local \
  --config migration/rehearsal/wrangler.rehearsal.toml
npx wrangler d1 execute airapj-rehearsal --local \
  --config migration/rehearsal/wrangler.rehearsal.toml --file "$MIG_DIR/out/d1-data.sql"
echo "== D1 投入完了（検証クエリは README 参照） =="
