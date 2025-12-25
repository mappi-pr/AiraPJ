# SortOrder バグ修正と本番環境復旧手順

## 問題の概要

アセット一覧でソート機能が正しく動作しない問題が発生していました。

### 根本原因

1. **アップロード時の問題**: 新しいアセットをアップロードする際、最大のsortOrderを取得する際に`deleted: false`でフィルタリングしていなかった
   - 削除済みアイテムも含めて最大値を取得していたため、誤ったsortOrder値が設定される可能性があった
   
2. **既存データの問題**: 既に本番環境に適用済みのデータで、sortOrderが0のまま、または不正な値になっている可能性

## 修正内容

### 1. アップロードロジックの修正

以下のファイルで、最大sortOrderを取得する際に`deleted: false`条件を追加:

- `api/routes/face-upload.ts`
- `api/routes/frontHair-upload.ts`
- `api/routes/backHair-upload.ts`
- `api/routes/background-upload.ts`
- `api/routes/costume-upload.ts`

**修正前:**
```typescript
const maxOrderItem = await Face.findOne({ 
  order: [['sortOrder', 'DESC']] 
});
```

**修正後:**
```typescript
const maxOrderItem = await Face.findOne({ 
  where: { deleted: false },
  order: [['sortOrder', 'DESC']] 
});
```

### 2. 本番環境復旧用マイグレーション

新しいマイグレーション `20251225_fix_sort_order_recovery.js` を作成しました。

このマイグレーションは:
- 全ての非削除アイテムのsortOrderを再初期化
- idの昇順で1から順番に連番を振り直す
- 全てのアセットテーブル（faces, front_hairs, back_hairs, backgrounds, costumes）に適用

## 本番環境での復旧手順

### ステップ1: バックアップ

```bash
# PostgreSQLのバックアップを取得
docker exec -it <postgres_container_name> pg_dump -U postgres airapj > backup_before_fix.sql
```

### ステップ2: マイグレーションの実行

```bash
# APIコンテナに入る
docker exec -it <api_container_name> /bin/sh

# マイグレーションを実行
cd /app
npm run migrate
```

### ステップ3: 確認

```bash
# マイグレーションの状態を確認
npm run migrate:status

# データベースに接続して確認
docker exec -it <postgres_container_name> psql -U postgres airapj

# sortOrderが正しく設定されているか確認
SELECT id, name, "sortOrder", deleted FROM faces ORDER BY "sortOrder" ASC;
SELECT id, name, "sortOrder", deleted FROM front_hairs ORDER BY "sortOrder" ASC;
SELECT id, name, "sortOrder", deleted FROM back_hairs ORDER BY "sortOrder" ASC;
SELECT id, name, "sortOrder", deleted FROM backgrounds ORDER BY "sortOrder" ASC;
SELECT id, name, "sortOrder", deleted FROM costumes ORDER BY "sortOrder" ASC;
```

### ステップ4: アプリケーションの再起動

```bash
# コンテナを再起動
docker compose restart api
```

## 開発環境でのテスト

開発環境で動作確認する場合:

```bash
# 開発環境を起動
docker compose -f docker/docker-compose.dev.yml up

# 別ターミナルでAPIコンテナに入る
docker exec -it airapj-api-dev /bin/sh

# マイグレーションを実行
cd /app
npm run migrate

# 確認
npm run migrate:status
```

## ロールバック手順

問題が発生した場合、マイグレーションをロールバックできます:

```bash
# 最後のマイグレーションを取り消す
npm run migrate:undo
```

ただし、これによりsortOrderは全て0にリセットされるため、注意が必要です。

## 期待される動作

修正後:
1. 新しいアセットをアップロードすると、現在の最大sortOrder + 1が設定される
2. 削除済みアイテムはsortOrderの計算に含まれない
3. アセット一覧は正しくソートされる
4. ソート順の変更（上下移動）が正しく機能する

## 注意事項

- このマイグレーションは複数回実行しても安全です（idempotent）
- 削除済みアイテムのsortOrderは変更されません
- 既存のソート順序（ユーザーがカスタマイズした順序）はidベースでリセットされます
  - もし既存の順序を保持したい場合は、マイグレーション実行前に順序をバックアップしてください

## トラブルシューティング

### マイグレーションが失敗する場合

1. データベース接続を確認
   ```bash
   # .env ファイルの設定を確認
   cat /app/.env
   ```

2. PostgreSQLが起動しているか確認
   ```bash
   docker compose ps
   ```

3. マイグレーションの状態を確認
   ```bash
   npm run migrate:status
   ```

### sortOrderがまだ0の場合

マイグレーションが正しく実行されたか確認:
```sql
-- PostgreSQLで直接確認
SELECT * FROM "SequelizeMeta" WHERE name = '20251225_fix_sort_order_recovery.js';
```

マイグレーションが実行されていない場合、手動で実行してください。

## 関連ファイル

- `api/migrations/20251225_fix_sort_order_recovery.js` - 復旧用マイグレーション
- `api/routes/*-upload.ts` - アップロードロジックの修正
- `api/models/*.ts` - sortOrder定義
