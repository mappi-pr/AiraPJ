# AiraPJ 開発者ガイド

このドキュメントは、AiraPJ（着せ替えゲームエンジン）の開発環境構築とデプロイメントに関する包括的なガイドです。

## 目次

- [概要](#概要)
- [技術スタック](#技術スタック)
- [開発環境のセットアップ](#開発環境のセットアップ)
  - [Docker を使用した環境構築（推奨）](#docker-を使用した環境構築推奨)
  - [ローカル開発環境の構築](#ローカル開発環境の構築)
- [プロダクション環境への配置](#プロダクション環境への配置)
- [スマートフォン実機での開発・テスト](#スマートフォン実機での開発テスト)
- [トラブルシューティング](#トラブルシューティング)
- [開発ガイドライン](#開発ガイドライン)
- [関連ドキュメント](#関連ドキュメント)

---

## 概要

AiraPJ は React + Vite + TypeScript による SPA（シングルページアプリケーション）です。
Express API サーバーと PostgreSQL データベースを連携し、キャラクター・背景・衣装の着せ替えや BGM/SE の継続再生、リッチな画面遷移演出を実現します。

### アーキテクチャ

```
[ブラウザ] <---> [nginx] <---> [Express API] <---> [PostgreSQL]
                   ↓
              [Vite SPA]
```

- **フロントエンド**: React 19, Vite, TypeScript, React Router DOM
- **バックエンド**: Express 4, Sequelize ORM
- **データベース**: PostgreSQL 16
- **リバースプロキシ**: nginx（本番環境）

---

## 技術スタック

### フロントエンド
- **React** 19.2.1 - UI ライブラリ
- **Vite** 6.3.5 - ビルドツール・開発サーバー
- **TypeScript** 5.8.3 - 型安全性
- **React Router DOM** 7.6.2 - ルーティング
- **Axios** 1.10.0 - HTTP クライアント
- **html2canvas** 1.4.1 - 画像生成

### バックエンド
- **Express** 4.18.2 - Web フレームワーク
- **Sequelize** 6.37.7 - ORM
- **pg** 8.16.1 - PostgreSQL クライアント
- **dotenv** 16.5.0 - 環境変数管理
- **multer** 2.0.1 - ファイルアップロード
- **cors** 2.8.5 - CORS 対応

### インフラ
- **Docker** & **Docker Compose** - コンテナ管理
- **PostgreSQL** 16-alpine - データベース
- **nginx** alpine - リバースプロキシ・静的ファイル配信

---

## 開発環境のセットアップ

### Docker を使用した開発環境構築（推奨）

開発時は **Vite の開発サーバー**を使用することで、Hot Module Replacement（HMR）によるコード変更の即時反映が可能です。

#### 前提条件

- Docker 20.10 以上
- Docker Compose 2.0 以上

#### 開発モードでのセットアップ

**1. リポジトリのクローン**

```bash
git clone https://github.com/mappi-pr/AiraPJ.git
cd AiraPJ
```

**2. 環境変数の設定**

```bash
cp .env.example .env
```

`.env` ファイルを編集して、必要に応じて値を変更します：

```env
# PostgreSQL設定
DB_NAME=airapj
DB_USER=postgres
DB_PASS=postgres
DB_PORT=5432

# フロントエンドポート（開発モード）
FRONTEND_PORT=5173
```

**3. 開発用コンテナの起動**

```bash
# Vite dev server でフロントエンドを起動
docker compose -f docker/docker-compose.dev.yml up

# バックグラウンドで起動する場合
docker compose -f docker/docker-compose.dev.yml up -d
```

**重要:** 初回起動時は `sequelize.sync()` によってテーブルが自動作成されます。マイグレーション実行は不要です。

**4. アクセス確認**

- **フロントエンド**: http://localhost:5173（Vite dev server、HMR 対応）
- **API**: http://localhost:4000/api/health
- **データベース**: localhost:5432

**開発モードの特徴:**
- ✅ コード変更が即座に反映（Hot Module Replacement）
- ✅ ソースマップによる詳細なデバッグ
- ✅ Vite の高速な開発サーバー
- ✅ ボリュームマウントでホストのコードを直接使用

**5. コンテナの停止**

```bash
docker compose -f docker/docker-compose.dev.yml down
```

#### コード変更後のリビルド・再デプロイ（開発モード）

開発モードでは、ソースコードがボリュームマウントされているため、通常は**リビルド不要**です。コードを変更すると自動的に反映されます。

ただし、以下の場合はコンテナの再起動またはリビルドが必要です：

**依存関係（package.json）を変更した場合:**

```bash
# API の依存関係を変更した場合
docker compose -f docker/docker-compose.dev.yml restart api

# フロントエンドの依存関係を変更した場合
docker compose -f docker/docker-compose.dev.yml restart frontend
```

**Dockerfileや環境変数を変更した場合:**

```bash
# 変更を反映してコンテナを再起動
docker compose -f docker/docker-compose.dev.yml up -d --build
```

**Git で別のブランチやコミットに切り替えた場合:**

```bash
# ブランチ切り替え
git checkout feature-branch

# 依存関係が変更されている可能性があるため、コンテナを再起動
docker compose -f docker/docker-compose.dev.yml restart

# Dockerfile や docker-compose の設定が変更されている場合はリビルド
docker compose -f docker/docker-compose.dev.yml up -d --build
```

#### 開発時のワークフロー（開発モード）

**Vite dev server を使用した開発:**

```bash
# 開発サーバーを起動（コード変更は自動反映）
docker compose -f docker/docker-compose.dev.yml up

# バックグラウンドで起動
docker compose -f docker/docker-compose.dev.yml up -d

# ログを確認
docker compose -f docker/docker-compose.dev.yml logs -f frontend
docker compose -f docker/docker-compose.dev.yml logs -f api
```

**コードの変更:**
- ホストマシンでファイルを編集すると、Vite が自動的に変更を検出してブラウザに反映します
- API のコードを変更した場合も、`npm run dev` が自動的に再起動します

**データベースのリセット:**

```bash
# データベースを含むすべてのデータを削除
docker compose -f docker/docker-compose.dev.yml down -v

# 再起動（データベースが初期化される）
docker compose -f docker/docker-compose.dev.yml up -d
```

**コンテナ内でのコマンド実行:**

```bash
# API コンテナ内でシェルを実行
docker compose -f docker/docker-compose.dev.yml exec api sh

# データベースに接続
docker compose -f docker/docker-compose.dev.yml exec db psql -U postgres -d airapj

# npm コマンドの実行例
docker compose -f docker/docker-compose.dev.yml exec api npm install axios
```

---

### 本番モードでの動作確認（Docker）

本番環境やデプロイテストには **nginx** + ビルド済みファイルを使用します。

**本番モードを使用するケース:**
- 本番環境へのデプロイ前の動作確認
- nginx の設定テスト
- ビルド後のパフォーマンス確認

**開発モードとの主な違い:**

| 項目 | 開発モード | 本番モード |
|------|----------|----------|
| フロントエンド | Vite dev server | nginx + ビルド済み |
| ポート | 5173 | 80 |
| HMR | ✅ 対応 | ❌ 非対応 |
| ビルド時間 | なし（即起動） | あり（数分） |
| 用途 | 日常の開発作業 | デプロイテスト |

#### 起動手順

```bash
# 環境変数の設定（未設定の場合）
cp .env.example .env

# コンテナの起動
docker compose up -d

# ログを表示しながら起動（初回推奨）
docker compose up
```

初回起動時は、フロントエンドのビルド・APIサーバーのビルド・データベースの初期化が実行されます。

#### アクセス確認

- **フロントエンド**: http://localhost
- **API**: http://localhost/api/health

#### コード変更後のリビルド・再デプロイ（本番モード）

本番モードでは、ソースコードはDockerイメージに含まれるため、コード変更後は**必ずリビルドが必要**です。

**通常のコード変更の場合:**

```bash
# コンテナを停止
docker compose -f docker/docker-compose.yml down

# イメージを再ビルドして起動
docker compose up -d --build
```

**Git でブランチやコミットを切り替えた場合:**

```bash
# ブランチ切り替え
git checkout main

# 既存のコンテナを停止
docker compose -f docker/docker-compose.yml down

# イメージを再ビルドして起動
docker compose up -d --build
```

**環境変数のみ変更した場合:**

```bash
# .env ファイルを編集後、コンテナを再作成
docker compose up -d --force-recreate
```

**注意**: 本番モードでは、すべてのコード変更がDockerイメージに反映されるまで数分かかります。頻繁にコードを変更する場合は、開発モード（`docker-compose.dev.yml`）の使用を推奨します。

---

#### Docker 環境の詳細

**開発モード（docker-compose.dev.yml）のサービス構成**

| サービス | コンテナ名 | ポート | 説明 |
|---------|-----------|--------|------|
| frontend | airapj-frontend-dev | 5173 | Vite dev server（HMR 対応） |
| api | airapj-api-dev | 4000 | Express API サーバー（開発モード） |
| db | airapj-db-dev | 5432 | PostgreSQL 16 |

**本番モード（docker-compose.yml）のサービス構成**

| サービス | コンテナ名 | ポート | 説明 |
|---------|-----------|--------|------|
| frontend | airapj-frontend | 80 | nginx + Vite ビルド済み SPA |
| api | airapj-api | 4000 | Express API サーバー |
| db | airapj-db | 5432 | PostgreSQL 16 |

**ボリューム（データ永続化）**

Docker の名前付きボリュームを使用してデータを永続化しています：

**開発モード:**
- `postgres_data_dev`: PostgreSQL のデータ
- `uploads_data_dev`: アップロードされた画像ファイル

**本番モード:**
- `postgres_data`: PostgreSQL のデータ
- `uploads_data`: アップロードされた画像ファイル

**重要**: `docker compose down` ではボリュームは削除されません。データを完全に削除する場合は `docker compose down -v` を実行してください。

**ボリュームの確認:**

```bash
# ボリュームの一覧表示
docker volume ls | grep airapj

# ボリュームの詳細情報
docker volume inspect airapj_postgres_data

# ボリュームのサイズ確認
docker system df -v
```

**ネットワーク**

すべてのサービスは同一の Docker ネットワーク内で通信します：
- フロントエンドから API へは `http://localhost:4000` でアクセス
- API からデータベースへは `db:5432` でアクセス

---

### ローカル開発環境の構築

Docker を使用せず、ホストマシン上で直接開発する場合の手順です。

#### 前提条件

- **Node.js**: v20.x（必須）
  - `.nvmrc` ファイルにバージョンが記載されています
  - nvm を使用している場合: `nvm use`
- **PostgreSQL**: 16.x 以上
  - ローカルにインストールまたは Docker で起動

#### セットアップ手順

**1. Node.js バージョンの確認**

```bash
node -v  # v20.x であることを確認

# nvm を使用している場合
nvm use
```

**2. 依存パッケージのインストール**

```bash
# フロントエンド
npm install

# API サーバー
cd api
npm install
cd ..
```

**3. PostgreSQL のセットアップ**

PostgreSQL をローカルにインストールするか、Docker で起動します：

```bash
# Docker で PostgreSQL のみ起動する場合
docker run -d \
  --name airapj-postgres \
  -e POSTGRES_DB=airapj \
  -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres \
  -p 5432:5432 \
  postgres:16-alpine
```

**4. API サーバーの環境変数設定**

```bash
cd api
cp .env.example .env
```

`api/.env` を編集：

```env
DB_NAME=airapj
DB_USER=postgres
DB_PASS=postgres
DB_HOST=localhost
DB_PORT=5432
PORT=4000
```

### データベースマイグレーション管理

**⚠️ 重要**: 新規データベースではマイグレーション不要です。`sequelize.sync()` で最新のスキーマが自動作成されます。

#### 既存データベースへのスキーマ変更適用

稼働中のサーバーで新しいカラムやテーブルを追加する場合のみ、マイグレーションを実行します。

```bash
cd api

# マイグレーションの状態を確認
npm run migrate:status

# 未適用のマイグレーションを実行
npm run migrate

# 直前のマイグレーションを取り消す（必要な場合のみ）
npm run migrate:undo
```

#### Docker 環境でのマイグレーション実行

```bash
# 開発モード
docker compose -f docker/docker-compose.dev.yml exec api npm run migrate

# 本番モード
docker compose -f docker/docker-compose.yml exec api npm run migrate
```

詳細は「[データベースマイグレーション管理](#データベースマイグレーション管理)」セクションを参照してください。

**6. サーバーの起動**

**API サーバー（ターミナル1）**

```bash
cd api
npm run dev  # 開発モード（ホットリロード）
# または
npm run build && npm start  # 本番モード
```

API サーバーは http://localhost:4000 で起動します。

**フロントエンド（ターミナル2）**

```bash
npm run dev
```

フロントエンドは http://localhost:5173 で起動します。

**7. アクセス確認**

- **フロントエンド**: http://localhost:5173
- **API**: http://localhost:4000/api/health

#### ローカル開発の注意点

- Vite の開発サーバーは `vite.config.ts` で `/api` と `/uploads` を自動的に `http://localhost:4000` にプロキシします
- API サーバーは CORS を許可しているため、異なるポート間での通信が可能です
- アップロードされたファイルは `api/uploads/` ディレクトリに保存されます
- ビルド後は `api/dist/uploads/` ディレクトリが使用されます

---

## プロダクション環境への配置

### Docker を使用した本番デプロイ

#### 環境変数の設定（重要）

本番環境では、セキュリティを考慮して `.env` ファイルを適切に設定してください：

```env
# PostgreSQL設定（強力なパスワードを使用）
DB_NAME=airapj_prod
DB_USER=airapj_user
DB_PASS=<強力なランダムパスワード>
DB_PORT=5432

# フロントエンドポート（通常は80または443）
FRONTEND_PORT=80
```

#### デプロイ手順

**1. 本番用の docker-compose 設定（オプション）**

本番環境用に `docker-compose.prod.yml` を作成することを推奨します：

```yaml
services:
  db:
    restart: always
    # 外部からのアクセスを制限（portsを削除）
    # ports:
    #   - "5432:5432"

  api:
    restart: always
    # 外部からのアクセスを制限（nginx経由のみ）
    # ports:
    #   - "4000:4000"

  frontend:
    restart: always
```

**2. デプロイコマンド**

```bash
# 本番環境用の設定でデプロイ
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# または標準設定のみ
docker compose up -d --build
```

**3. ログの監視**

```bash
docker compose logs -f
```

#### HTTPS/SSL の設定

本番環境では HTTPS を使用することを強く推奨します。

**Let's Encrypt + Certbot を使用する場合**

nginx コンテナに Certbot を追加するか、リバースプロキシ（Traefik、Caddy など）を使用します。

**nginx の SSL 設定例**

`docker/nginx/nginx.conf` を以下のように変更：

```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # 既存の設定...
}

server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$host$request_uri;
}
```

#### セキュリティのベストプラクティス

1. **環境変数の管理**
   - `.env` ファイルは Git にコミットしない（`.gitignore` で除外済み）
   - 本番環境では強力なパスワードを使用
   - シークレット管理ツール（AWS Secrets Manager、HashiCorp Vault など）の使用を検討

2. **データベース**
   - 本番環境では外部からの直接アクセスを遮断（`ports` を削除）
   - 定期的なバックアップの設定
   - PostgreSQL の設定ファイルでセキュリティを強化

3. **nginx**
   - レート制限の設定
   - セキュリティヘッダーの追加（CSP, HSTS など）
   - ファイルアップロードサイズの制限

4. **Docker**
   - イメージを最新の状態に保つ
   - 不要なポートを公開しない
   - ログローテーションの設定

#### バックアップとリストア

**データベースのバックアップ**

```bash
# バックアップ
docker compose exec db pg_dump -U postgres airapj > backup_$(date +%Y%m%d).sql

# リストア
docker compose exec -T db psql -U postgres airapj < backup_20231201.sql
```

**アップロードファイルのバックアップ**

```bash
# uploads ボリュームのバックアップ
docker run --rm -v airapj_uploads_data:/data -v $(pwd):/backup \
  alpine tar czf /backup/uploads_backup_$(date +%Y%m%d).tar.gz /data
```

#### スケーリングの考慮事項

**水平スケーリング**

複数の API サーバーを起動する場合：

```yaml
services:
  api:
    deploy:
      replicas: 3
```

この場合、以下を考慮する必要があります：
- アップロードファイルの共有ストレージ（NFS、S3 など）
- セッション管理（Redis など）

**垂直スケーリング**

リソース制限の設定：

```yaml
services:
  api:
    deploy:
      resources:
        limits:
          cpus: '2'
          memory: 2G
        reservations:
          cpus: '1'
          memory: 1G
```

---

## トラブルシューティング

### よくある問題と解決方法

#### 1. フロントエンドのビルドが失敗する

**エラー**: `Could not resolve "./assets/sound/bgm/main.mp3"`

**原因**: 必要なアセットファイルが存在しない

**解決方法**:
- アセットファイルを配置するか、一時的にコードからインポートを削除
- `.gitkeep` ファイルでディレクトリ構造のみコミットされています

#### 2. データベース接続エラー

**エラー**: `ECONNREFUSED` または `Connection refused`

**解決方法**:
```bash
# データベースコンテナの状態確認
docker compose ps

# データベースログの確認
docker compose logs db

# データベースの再起動
docker compose restart db
```

#### 3. ポートが既に使用されている

**エラー**: `port is already allocated`

**解決方法**:
```bash
# 使用中のポートを確認
lsof -i :80
lsof -i :4000
lsof -i :5432

# .env でポートを変更
FRONTEND_PORT=8080
```

#### 4. アップロードされた画像が表示されない

**原因**: CORS 設定または nginx プロキシ設定の問題

**解決方法**:
- `docker/nginx/nginx.conf` の `/uploads/` location を確認
- API サーバーの CORS 設定を確認
- ブラウザの開発者ツールでネットワークエラーを確認

#### 5. 型エラーが発生する（TypeScript）

**エラー**: Express 関連の型エラー

**解決方法**:
```bash
cd api
npm install --save-dev @types/express@4.17.21
```

Express v5 系の型定義と混在しないよう、v4 系に固定してください。

---

## 開発ガイドライン

### ディレクトリ構成

```
AiraPJ/
├── src/                      # フロントエンド（React + Vite）
│   ├── components/          # 再利用可能なコンポーネント
│   ├── pages/               # 各画面コンポーネント
│   ├── context/             # Context API プロバイダー
│   ├── types/               # TypeScript 型定義
│   ├── utils/               # ユーティリティ関数
│   ├── assets/              # 静的アセット
│   ├── App.tsx              # ルーティング・BGM管理
│   └── main.tsx             # エントリポイント
├── api/                      # APIサーバー（Express）
│   ├── routes/              # API ルーティング
│   ├── models/              # Sequelize モデル
│   ├── config/              # 設定ファイル
│   ├── migrations/          # DBマイグレーション
│   ├── uploads/             # アップロードファイル保存先
│   └── index.ts             # APIサーバーエントリ
├── docker/                   # Docker 関連設定
│   ├── nginx/               # nginx 設定
│   ├── Dockerfile           # フロントエンド用 Dockerfile
│   ├── docker-compose.yml   # 本番用 Docker Compose 設定
│   └── docker-compose.dev.yml # 開発用 Docker Compose 設定
├── scripts/                  # 補助スクリプト
│   └── setup-wsl-port-forwarding.ps1  # WSL2ポートフォワーディング設定
├── doc/                      # ドキュメント
├── public/                   # 静的ファイル
├── .env.example             # Docker Compose 環境変数テンプレート
└── README.md                # プロジェクト概要
```

### コーディング規約

**フロントエンド**
- ESLint 設定に従う: `npm run lint`
- コンポーネントは関数コンポーネント + Hooks を使用
- 型定義を必ず記述（`any` は避ける）
- Context API で状態管理（選択中パーツ、BGM など）

**バックエンド**
- Express v4 系を使用
- Sequelize ORM でデータベース操作
- エラーハンドリングを適切に実装
- 環境変数は `dotenv` で管理

### API エンドポイント

#### 顔パーツ
- `GET /api/face` - 顔パーツ一覧取得
- `POST /api/face/upload` - 顔パーツアップロード
- `DELETE /api/face/:id` - 顔パーツ削除（論理削除）

#### 前髪パーツ
- `GET /api/front-hair` - 前髪パーツ一覧取得
- `POST /api/front-hair/upload` - 前髪パーツアップロード
- `DELETE /api/front-hair/:id` - 前髪パーツ削除

#### 後髪パーツ
- `GET /api/back-hair` - 後髪パーツ一覧取得
- `POST /api/back-hair/upload` - 後髪パーツアップロード
- `DELETE /api/back-hair/:id` - 後髪パーツ削除

#### 背景
- `GET /api/background` - 背景一覧取得
- `POST /api/background/upload` - 背景アップロード
- `DELETE /api/background/:id` - 背景削除

#### 衣装
- `GET /api/costume` - 衣装一覧取得
- `POST /api/costume/upload` - 衣装アップロード
- `DELETE /api/costume/:id` - 衣装削除

#### お気に入り
- `GET /api/favorite` - お気に入り一覧取得
- `POST /api/favorite` - お気に入り追加
- `DELETE /api/favorite/:id` - お気に入り削除

#### ヘルスチェック
- `GET /api/health` - API サーバーの稼働確認

### データベーススキーマ

#### アセット削除仕様
- 各アセットテーブルには `deleted` (boolean) と `deletedAt` (timestamp) カラムがあります
- DELETE API では物理削除（ファイル削除）+ 論理削除（DBフラグ）を実施
- GET API では `deleted = false` のレコードのみ返却

### 画面仕様

#### photo（フォト撮影）画面
- 選択中のパーツ（背景・後髪・衣装・顔・前髪）を重ね合わせ表示
- レイヤー順: 背景 → 後髪 → 衣装 → 顔 → 前髪
- スライダーでキャラクター（顔系+衣装）の拡大率を調整
- 「PNGで保存」ボタンで合成画像をダウンロード
  - `html2canvas` による画面キャプチャ方式
  - Canvas API による手動合成方式（高精度）

### BGM/SE/ボイス管理

- BGM は `App.tsx` で管理し、画面遷移しても継続再生
- SE は各ページで必要に応じて再生
- ボイスはキャラクター選択などで特定のタイミングで再生
- 音声ファイルは `src/assets/sound/` 配下に配置
  - BGM: `src/assets/sound/bgm/`
  - SE: `src/assets/sound/se/`
  - ボイス: `src/assets/sound/voice/`
  - 詳細な配置方法は `src/assets/sound/README.md` を参照

**ボイス機能の実装**については、**[VOICE_IMPLEMENTATION.md](./VOICE_IMPLEMENTATION.md)** を参照してください。

### ビルドとデプロイ

**フロントエンドビルド**
```bash
npm run build
# dist/ ディレクトリに出力
```

**API サーバービルド**
```bash
cd api
npm run build
# dist/ ディレクトリに出力
```

### テスト

現時点ではテストは実装されていません。今後追加予定です。

---

## スマートフォン実機での開発・テスト

スマートフォン実機から開発サーバーにアクセスして、実際のデバイスでUI/UXを確認できます。

### 前提条件

- スマートフォンと開発PCが同じWi-Fiネットワークに接続されていること
- Vite dev server（`npm run dev`）とAPIサーバー（`cd api && npm run dev`）が起動していること

### クイックセットアップ

#### 1. サーバー設定の確認

**Vite設定** (`vite.config.ts`) - すべてのネットワークインターフェースでリッスン:

```typescript
export default defineConfig({
  server: {
    host: '0.0.0.0',  // 外部アクセスを許可
    port: 5173,
    // ... 他の設定
  },
})
```

**APIサーバー設定** (`api/index.ts`) - 0.0.0.0でリッスン:

```typescript
const PORT = Number(process.env.PORT) || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`API server running on port ${PORT}`);
});
```

#### 2. 開発PCのIPアドレス確認

**Windows (PowerShell)**:
```powershell
ipconfig
# 「ワイヤレス LAN アダプター Wi-Fi」の IPv4 アドレスをメモ (例: 192.168.1.100)
```

**Mac**:
```bash
ipconfig getifaddr en0
```

**Linux / WSL2**:
```bash
hostname -I | awk '{print $1}'
```

#### 3. ファイアウォール設定

**Windows**: ポート 5173（Vite）と 4000（API）を許可

```powershell
# 管理者権限のPowerShellで実行
New-NetFirewallRule -DisplayName "Vite Dev Server" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow
New-NetFirewallRule -DisplayName "Express API Server" -Direction Inbound -LocalPort 4000 -Protocol TCP -Action Allow
```

**Mac**: 通常は設定不要

**Linux**:
```bash
sudo ufw allow 5173/tcp
sudo ufw allow 4000/tcp
```

#### 4. WSL2追加設定（Windowsのみ）

WSL2を使用している場合、ポートフォワーディングが必要です:

```powershell
# 管理者権限のPowerShellで実行
$wsl_ip = (wsl hostname -I).trim()
netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=$wsl_ip
netsh interface portproxy add v4tov4 listenport=4000 listenaddress=0.0.0.0 connectport=4000 connectaddress=$wsl_ip

# 設定確認
netsh interface portproxy show v4tov4
```

**自動化スクリプト** (`scripts/setup-wsl-port-forwarding.ps1`):
```powershell
# WSL2再起動時に実行
$wsl_ip = (wsl hostname -I).trim()
Write-Host "WSL IP: $wsl_ip"

# 既存設定削除 & 新規設定
netsh interface portproxy delete v4tov4 listenport=5173 listenaddress=0.0.0.0 2>$null
netsh interface portproxy delete v4tov4 listenport=4000 listenaddress=0.0.0.0 2>$null
netsh interface portproxy add v4tov4 listenport=5173 listenaddress=0.0.0.0 connectport=5173 connectaddress=$wsl_ip
netsh interface portproxy add v4tov4 listenport=4000 listenaddress=0.0.0.0 connectport=4000 connectaddress=$wsl_ip

Write-Host "`nSetup complete!"
netsh interface portproxy show v4tov4
```

実行: `Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned; .\scripts\setup-wsl-port-forwarding.ps1`

#### 5. スマートフォンからアクセス

ブラウザで以下のURLにアクセス（IPアドレスは実際のものに置き換え）:

- **フロントエンド**: `http://192.168.1.100:5173`
- **API**: `http://192.168.1.100:4000/api/health`

### トラブルシューティング

**アクセスできない場合**:
1. ファイアウォールで両ポートが許可されているか確認
2. サーバーが起動しているか確認: `curl http://localhost:5173`
3. 同じWi-Fiに接続されているか確認
4. WSL2の場合、ポートフォワーディング設定を確認

**WSL2でIPアドレスが変わる**:
- WSL2再起動後はIPが変わることがあります → 上記の自動化スクリプトを再実行

**HTTPSが必要な場合**（カメラAPI等）:
```typescript
// vite.config.ts
import fs from 'fs'

export default defineConfig({
  server: {
    host: '0.0.0.0',
    https: {
      key: fs.readFileSync('./localhost-key.pem'),
      cert: fs.readFileSync('./localhost-cert.pem'),
    },
  },
})
```

自己署名証明書作成:
```bash
openssl req -x509 -newkey rsa:2048 -nodes -sha256 -subj '/CN=localhost' \
  -keyout localhost-key.pem -out localhost-cert.pem
```

---

## データベースマイグレーション管理

AiraPJ では以下の2つの方法でデータベーススキーマを管理しています：

1. **Sequelize Sync** (`sequelize.sync()`)
   - API サーバー起動時に自動実行され、モデル定義からテーブルを作成
   - 開発環境や新規データベースで使用
   - **新規データベースではマイグレーション不要**

2. **Sequelize Migrations**
   - 既存のデータベースにスキーマ変更を適用
   - マイグレーションファイル（`api/migrations/`）で管理
   - 本番環境のスキーマ更新で使用

### マイグレーションファイルの構成

```
api/migrations/
├── 20250625_add_deleted_columns.js  # 論理削除カラム追加
└── 20251111_add_sort_order.js      # ソート順カラム追加
```

各マイグレーションファイルは以下の構造を持ちます：
- `up()`: スキーマ変更を適用する処理
- `down()`: スキーマ変更を取り消す処理（ロールバック用）

### 新規データベースのセットアップ

**Docker 環境:**

```bash
# 開発モード
docker compose -f docker/docker-compose.dev.yml up

# 本番モード
docker compose -f docker/docker-compose.yml up

# マイグレーションは不要（sequelize.sync() が最新スキーマでテーブルを作成）
```

**ローカル環境:**

```bash
# PostgreSQL を起動
docker run -d --name airapj-postgres \
  -e POSTGRES_DB=airapj -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres -p 5432:5432 \
  postgres:16-alpine

# API サーバーを起動（テーブルが自動作成される）
cd api
npm run dev
```

### 既存データベースへのスキーマ変更適用

稼働中のサーバーやデータが入っているデータベースにスキーマ変更を適用する場合：

**1. マイグレーション状態の確認**

```bash
cd api
npm run migrate:status
```

出力例：`up` は適用済み、`down` は未適用を示します。

**2. 未適用マイグレーションの実行**

```bash
cd api
npm run migrate
```

**3. マイグレーションの取り消し（必要な場合のみ）**

```bash
cd api
npm run migrate:undo
```

⚠️ 本番環境では慎重に実行してください。データ損失の可能性があります。

### Docker 環境でのマイグレーション実行

```bash
# 開発モード
docker compose -f docker/docker-compose.dev.yml exec api npm run migrate:status
docker compose -f docker/docker-compose.dev.yml exec api npm run migrate

# 本番モード
docker compose -f docker/docker-compose.yml exec api npm run migrate:status
docker compose -f docker/docker-compose.yml exec api npm run migrate
```

### よくある問題と解決方法

#### 問題1: "Column already exists" エラー

**原因**: 新規データベースで `sequelize.sync()` が既にテーブルを作成済み

**解決方法**: 新規データベースではマイグレーション不要です。

#### 問題2: マイグレーションが既に適用済みのものも実行しようとする

**原因**: `SequelizeMeta` テーブルが存在しない、または適切に更新されていない

**解決方法**:

```bash
# マイグレーション状態を確認
cd api
npm run migrate:status

# データベースで SequelizeMeta テーブルを確認
docker compose -f docker/docker-compose.dev.yml exec db psql -U postgres -d airapj -c "SELECT * FROM \"SequelizeMeta\";"

# 既に適用済みのマイグレーションを手動で記録（必要な場合のみ）
# 注意: 実際のマイグレーションファイル名を確認してください（ls api/migrations/）
```

#### 問題3: マイグレーションが失敗して中途半端な状態

**解決方法**:

```bash
# データベースの状態を確認
docker compose -f docker/docker-compose.dev.yml exec db psql -U postgres -d airapj -c "\d faces"

# 必要に応じてロールバック
cd api
npm run migrate:undo

# 問題を修正してから再実行
npm run migrate
```

### マイグレーションファイルの作成

新しいスキーマ変更を追加する場合：

```bash
cd api
npx sequelize-cli migration:generate --name add_new_column

# 生成されたファイルを編集
# api/migrations/YYYYMMDDHHMMSS-add_new_column.js
```

マイグレーションファイルの例：

```javascript
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('faces', 'newColumn', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('faces', 'newColumn');
  }
};
```

### ベストプラクティス

1. **マイグレーション前のバックアップ**
   ```bash
   docker compose exec db pg_dump -U postgres airapj > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **開発環境でのテスト**: 本番環境に適用する前に、開発環境でマイグレーションをテストしてください。

3. **ロールバック計画**: マイグレーション失敗時のロールバック手順を事前に確認してください。

4. **モデル定義との整合性**: マイグレーション後は、モデル定義（`api/models/*.ts`）も更新してください。

### 参考コマンド一覧

```bash
# マイグレーション関連
npm run migrate              # 未適用マイグレーションを実行
npm run migrate:status       # マイグレーション状態を確認
npm run migrate:undo         # 最後のマイグレーションを取り消す

# データベース接続
docker compose -f docker/docker-compose.dev.yml exec db psql -U postgres -d airapj  # 開発モード
docker compose -f docker/docker-compose.yml exec db psql -U postgres -d airapj  # 本番モード
```

---

## 関連ドキュメント

AiraPJの機能別ドキュメント：

- **[ボイス実装ガイド](./VOICE_IMPLEMENTATION.md)** - キャラクター選択画面などでのボイス機能の実装方法
- **[CSSアーキテクチャ](./CSS.md)** - スタイル管理とデザインガイドライン
- **[多言語対応](./MULTILINGUAL.md)** - 国際化対応の実装方法

---

## 参考リンク

- [React 公式ドキュメント](https://react.dev/)
- [Vite 公式ドキュメント](https://vitejs.dev/)
- [Express 公式ドキュメント](https://expressjs.com/)
- [Sequelize 公式ドキュメント](https://sequelize.org/)
- [PostgreSQL 公式ドキュメント](https://www.postgresql.org/docs/)
- [Docker 公式ドキュメント](https://docs.docker.com/)
- [nginx 公式ドキュメント](https://nginx.org/en/docs/)

---

## ライセンス

このプロジェクトのライセンスについては、リポジトリの LICENSE ファイルを参照してください。

---

## コントリビューション

プルリクエストやイシューの報告を歓迎します。貢献する際は以下を確認してください：

1. 適切なブランチから作業する
2. コミットメッセージを明確に記述する
3. ESLint 設定に従う（`npm run lint` でチェック可能）
4. テストが通ることを確認する（実装後）

---

最終更新: 2025-12-19
