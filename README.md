# AiraSPA - 着せ替えゲームSPA

このプロジェクトはReact + Vite + TypeScriptによるSPA（シングルページアプリケーション）です。
Express APIサーバーと連携し、キャラクター・背景・衣装の着せ替えやBGM/SEの継続再生、リッチな画面遷移演出を実現します。

## クイックスタート

### Docker で開発する場合（推奨）

**Vite の開発サーバー（HMR対応）を使用:**

```sh
# 環境変数の設定
cp .env.example .env

# 開発用コンテナの起動（Vite dev server + API + PostgreSQL）
docker compose -f docker-compose.dev.yml up

# アクセス
# フロントエンド: http://localhost:5173 (Vite dev server with HMR)
# API: http://localhost:4000/api/health
```

コード変更が自動的に反映されます（Hot Module Replacement）。

### Docker で本番環境をテストする場合

**nginx + ビルド済みファイルを使用:**

```sh
# 環境変数の設定
cp .env.example .env

# 本番用コンテナの起動（nginx + API + PostgreSQL）
docker compose up -d

# アクセス
# フロントエンド: http://localhost (nginx)
# API: http://localhost/api/health
```

**データ永続化について**: データベースとアップロードファイルは Docker ボリューム（`postgres_data`, `uploads_data`）に保存されます。コンテナを停止・削除（`docker compose down`）してもデータは保持されます。データを完全に削除する場合のみ `docker compose down -v` を使用してください。

### ローカル開発の場合（Docker なし）

```sh
# Node.js v20.x を使用
nvm use

# 依存関係のインストール
npm install
cd api && npm install && cd ..

# API環境変数の設定
cd api && cp .env.example .env && cd ..

# PostgreSQL を起動（Docker推奨）
docker run -d --name airapj-postgres \
  -e POSTGRES_DB=airapj -e POSTGRES_USER=postgres \
  -e POSTGRES_PASSWORD=postgres -p 5432:5432 \
  postgres:16-alpine

# API サーバー起動（ターミナル1）
cd api && npm run dev

# フロントエンド起動（ターミナル2）
npm run dev
```

## 詳細なドキュメント

包括的な開発者向けドキュメントは **[doc/DEVELOPMENT.md](doc/DEVELOPMENT.md)** を参照してください。

- Docker を使用した環境構築
- ローカル開発環境の構築
- プロダクション環境への配置
- トラブルシューティング
- 開発ガイドライン

---

## 概要

### 技術スタック
- **フロントエンド**: React 19, Vite, TypeScript, React Router DOM
- **バックエンド**: Express 4, Sequelize, PostgreSQL 16
- **インフラ**: Docker, Docker Compose, nginx

### ディレクトリ構成
```
AiraPJ/
├── src/                  # フロントエンド（React+Vite）
│   ├── pages/           # 各画面
│   ├── components/      # コンポーネント
│   ├── context/         # Context API
│   └── assets/          # 静的アセット
│       └── sound/       # サウンドファイル（BGM/SE）
│           └── README.md  # サウンドファイル配置ガイド
├── api/                 # APIサーバー（Express）
│   ├── routes/          # API ルーティング
│   ├── models/          # Sequelize モデル
│   └── uploads/         # アップロードファイル
├── docker/              # Docker設定
├── doc/                 # ドキュメント
└── public/              # 静的ファイル
```

### 主な機能
- キャラクター着せ替え（顔・前髪・後髪・衣装・背景の組み合わせ）
- BGM/SE の継続再生
- 画面遷移演出
- フォト撮影機能（ステッカー配置、PNG保存）
- パーツアップロード機能

---

詳細な開発手順、トラブルシューティング、プロダクション環境への配置については **[doc/DEVELOPMENT.md](doc/DEVELOPMENT.md)** を参照してください。