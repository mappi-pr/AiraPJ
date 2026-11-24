# データ移行リハーサルキット（#166 No.4）

本番データには触らずに、PostgreSQL → D1 + R2 へのデータ移行手順を先に実証するためのキット。
本番実施時は、入力（PG ダンプと uploads 実ファイル）を本番のものに差し替えて同じ手順を踏む。

## 構成

| ファイル | 役割 |
|---|---|
| `pg-to-d1.mjs` | 変換スクリプト。pg_dump（plain 形式）→ D1 用データ SQL・R2 コピー計画・変換レポートを生成 |
| `rehearsal/sample-pg.sql` | リハーサル用：現行スキーマ＋本番相当サンプルデータ |
| `rehearsal/wrangler.rehearsal.toml` | 検証用ローカル D1（`airapj-rehearsal`）の設定。e2e 用とは分離 |
| `rehearsal/run-rehearsal.sh` | リハーサルの通し実行（PG 構築 → ダンプ → 変換 → D1 投入） |
| `out/` | 変換の出力先（`d1-data.sql` / `r2-copy-plan.json` / `report.json` / `report.md`） |

## 変換スクリプトの使い方

```bash
pg_dump --data-only --no-owner --no-privileges <DB名> > dump.sql
node pg-to-d1.mjs dump.sql --out out
```

入力は COPY 形式（pg_dump の既定）と INSERT 形式（`--inserts` / `--column-inserts`）の両方に対応。

### 変換内容

- 型変換：BOOLEAN → INTEGER (0/1)、TIMESTAMP → TEXT（ISO 8601・UTC・ミリ秒。オフセット付きは UTC 換算、オフセットなしは UTC として扱う）、id はそのまま引き継ぎ
- 対象テーブル：D1 マイグレーション 0001〜0006 の全11テーブル
- **assetPath の旧ディレクトリ名対応**：`/uploads/bg/` → `/uploads/background/`、`/uploads/csm/` → `/uploads/costume/`、`/uploads/nav/` → `/uploads/navigationButton/`（PR #169 の RENAMES と同じ対応）。本番が #169 の移行スクリプト未適用で旧名のまま残っていても、変換時に正式名称へ寄せる。すでに新名ならそのまま
- **sortOrder 重複の事前解消**：パーツ系6テーブル（背景＋5種別）の有効行で sortOrder が重複していたら、(sortOrder, id) の順序を保ったまま 1..N に振り直す。0002／0004 の部分一意インデックス（有効行のみ対象）が失敗しないため。削除済み行（sortOrder=0 で重複が正常）は対象外。検出・解消件数はレポートに出る
- **R2 コピー計画**（`r2-copy-plan.json`）：各 assetPath について「実ファイルの候補パス（旧名・新名の両方）→ R2 キー（正式名称）」の対応表。件数照合に使う。削除済み行のファイルも含む（`deleted: true` で判別可能。本番で実ファイルが無ければその行はスキップでよい）

## リハーサルで確認済みのこと（2026-11-24）

サンプルデータ（旧名 assetPath 混在、有効行 sortOrder 重複、削除済み行、GM 大小文字混在メール、履歴 stickers JSON、+09 オフセット付き日時）で通し検証：

- 変換前後で全11テーブルの件数が一致
- sortOrder 重複：backgrounds／costumes で各1グループを検出し解消。重複のない faces（sortOrder=5 の歯抜け）は無変更
- assetPath 書き換え：合計6件（backgrounds 3、costumes 2、navigation_buttons 1）。変換後の D1 に旧名は残存なし
- 一意インデックス（0002／0004）適用済みの D1 へ問題なく投入できた
- 日時は +09 → UTC の ISO 8601 に変換（小数秒も保持）。GM の LOWER(email) 照合が混在ケースのメールを引ける
- 変換後の D1 に対して実 Workers アプリを起動し、背景・衣装の一覧（並び順どおり）、ナビボタン、生成履歴（isAvailable・stickers 復元）、お気に入りが正しく返ることを確認
- COPY 形式と INSERT 形式のダンプで変換結果が完全一致

## 本番実施時に必要なもの（ユーザー作業）

本番サーバ（docker compose 稼働ホスト）で以下を取得して渡してください。どちらも読み取り操作のみです。

1. **PG ダンプ**：`docker/` ディレクトリで
   ```bash
   docker compose exec db pg_dump -U "$DB_USER" --data-only --no-owner --no-privileges "$DB_NAME" > dump.sql
   ```
   （`$DB_USER` / `$DB_NAME` は本番の .env の値）
2. **uploads 実ファイル一式**：api コンテナの `/app/uploads`（ボリューム `uploads_data`）の中身。
   例：`docker compose cp api:/app/uploads ./uploads-backup`
   R2 コピー計画の `sourceCandidates` と突き合わせて、実在する側のパスからコピーする

## 未検証・残課題

- 本物の Cloudflare アカウント上の D1／R2 への投入（ローカルは Miniflare エミュレーション）
- 本番データ実物での変換（件数・重複・旧名の残り具合は本番ダンプが来て初めて分かる）
- R2 への実ファイルコピーの実行（計画の生成までがキットの範囲）
- 本番 PG のタイムゾーン設定が UTC 以外の場合、オフセットなし timestamp の解釈がずれる可能性（ダンプは timestamptz のオフセット付きで出るため実害は想定しにくいが、本番ダンプで実例を確認する）
