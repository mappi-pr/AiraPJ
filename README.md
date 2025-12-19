# AiraSPA - 着せ替えゲームSPA

このプロジェクトはReact + Vite + TypeScriptによるSPA（シングルページアプリケーション）です。
Express APIサーバーと連携し、キャラクター・背景・衣装の着せ替えやBGM/SEの継続再生、リッチな画面遷移演出を実現します。

## クイックスタート

### Docker を使用する場合（推奨）

```sh
# 環境変数の設定
cp .env.example .env

# コンテナの起動
docker compose up -d

# アクセス
# フロントエンド: http://localhost
# API: http://localhost/api/health
```

**データ永続化について**: データベースとアップロードファイルは Docker ボリューム（`postgres_data`, `uploads_data`）に保存されます。コンテナを停止・削除（`docker compose down`）してもデータは保持されます。データを完全に削除する場合のみ `docker compose down -v` を使用してください。

### ローカル開発の場合

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


# フロントエンド起動（ターミナル2）npm run dev
```


包括的な開発者向けドキュメントは **[doc/DEVELOPMENT.md](doc/DEVELOPMENT.md)** を参照してください。



## 概要

### 技術スタック
- **フロントエンド**: React 19, Vite, TypeScript, React Router DOM
- **バックエンド**: Express 4, Sequelize, PostgreSQL 16
- **インフラ**: Docker, Docker Compose, nginx

```
AiraPJ/
├── src/                  # フロントエンド（React+Vite）
│   ├── pages/           # 各画面
│   ├── components/      # コンポーネント
│   ├── context/         # Context API
│   └── assets/          # 静的アセット
├── api/                 # APIサーバー（Express）
│   ├── routes/          # API ルーティング
│   ├── models/          # Sequelize モデル
│   └── uploads/         # アップロードファイル
├── docker/              # Docker設定
├── doc/                 # ドキュメント
└── public/              # 静的ファイル
```




詳細な開発手順、トラブルシューティング、プロダクション環境への配置については **[doc/DEVELOPMENT.md](doc/DEVELOPMENT.md)** を参照してください。
