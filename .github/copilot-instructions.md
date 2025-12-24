<!-- Use this file to provide workspace-specific custom instructions to Copilot. For more details, visit https://code.visualstudio.com/docs/copilot/copilot-customization#_use-a-githubcopilotinstructionsmd-file -->

# Copilot Instructions for AiraPJ

## プロジェクト概要
- このプロジェクトはReact+ViteによるSPA（着せ替えゲームエンジン）です。
- Express APIサーバーとPostgreSQLデータベースを連携し、着せ替えゲームのUI/UXを実現します。
- BGM/SEの継続再生や画面遷移演出もSPAで実装します。

## アーキテクチャと技術スタック

### フロントエンド
- **React 19** + **Vite** + **TypeScript** でSPAを構築
- **React Router DOM** で画面遷移（ページ遷移なしでBGMを継続再生）
- **Context API** で状態管理（PartsContext等）
- **Axios** でAPI通信
- **html2canvas** でPNG画像出力

### バックエンド
- **Express 4** でREST API提供
- **Sequelize ORM** でPostgreSQL操作
- **PostgreSQL 16** でデータ永続化
- **nginx** で本番環境のリバースプロキシ

### インフラ
- **Docker Compose** で開発/本番環境を構築
- 開発環境: Vite dev server (HMR対応)
- 本番環境: nginx + ビルド済みファイル

## 開発ガイドライン

### API設計
- BASE_API_URLは環境変数から取得する（localhost:4000をハードコードしない）
- 本番環境では `/api` パスでAPIにアクセス
- 各パーツのAPIエンドポイント: `/api/face`, `/api/costume`, `/api/background`, `/api/sticker` 等
- アップロード/削除/順序変更のエンドポイントには認証ミドルウェアを適用

### データベース設計
- 開発環境ではSequelizeの `sync({ alter: true })` で自動マイグレーション
- 本番環境では `npx sequelize-cli db:migrate` でマイグレーション実行
- 各パーツテーブルには `offsetX`, `offsetY`, `width`, `height` カラムがあり、画像の位置・サイズを柔軟に管理
- マイグレーションファイル名の形式: `YYYYMMDD_description.js`

### フロントエンド開発
- **状態管理**: Context APIを使用（例: PartsContext, AuthContext, SoundContext）
- **画面遷移**: react-router-domのLinkコンポーネントを使用（`<a>`タグは使わない）
- **サウンド**: SPAなのでBGM/SEは画面遷移をまたいで継続再生可能
- **多言語化**: `src/locales/ja.json` からテキストを読み込む仕組みを活用（useTranslation hook）
- **CSS設計**: 
  - `src/index.css` - グローバルスタイル（リセット、共通定義）
  - `src/App.css` - アプリケーション全体のスタイル
  - コンポーネント固有のスタイルは各コンポーネント内で定義
- **型安全性**: TypeScriptの型定義を厳格に使用

### Docker開発
- 開発環境: `docker compose -f docker/docker-compose.dev.yml up`
  - Vite dev server (HMR) - http://localhost:5173
  - API - http://localhost:4000
- 本番環境テスト: `docker compose -f docker/docker-compose.yml up`
  - nginx - http://localhost
  - API - http://localhost/api
- データ永続化: Docker volume (`postgres_data`, `uploads_data`) を使用
- コンテナ名の規則: `docker-compose.yml`の`container_name`に従う

### 画像アセット管理
- 各パーツは位置・サイズメタデータを持ち、余白なしで柔軟に合成可能
- デフォルト: 240×320、offset (0,0)
- アップロード時に `offsetX`, `offsetY`, `width`, `height` を指定可能
- 既存アセットの編集: Settings画面の編集ボタンから位置・サイズを更新可能
- ビジュアルエディタ: ドラッグ&ドロップで直感的に位置調整

### 認証・認可
- Google OAuth認証を使用
- 2段階の権限システム:
  - **System Administrator**: `SYSTEM_ADMIN_EMAILS` 環境変数で設定（全機能アクセス可能）
  - **Game Master**: データベースで管理（設定画面へのアクセス可能、Game Master管理は不可）
- Settings画面は認証必須
- API保護: `requireAdmin`, `requireSystemAdmin` ミドルウェア

## よくある問題と解決策

### API 500エラー（本番環境）
- **原因**: BASE_API_URLがlocalhost:4000にハードコード
- **解決**: 環境変数や相対パスを使用してAPI URLを設定

### Docker環境でAPIが500エラー
- **原因**: PostgreSQLへの接続設定が不正
- **解決**: `.env` ファイルの `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` を確認

### マイグレーションエラー
- **原因**: 既に適用済みのマイグレーションを再実行しようとしている
- **解決**: SequelizeMeta テーブルを確認し、未適用のマイグレーションのみ実行

### アセット一覧が取得できない
- **原因**: 連続アップロード後の画面リフレッシュ不足
- **解決**: アップロード成功後に `await fetch()` でアセット一覧を再取得

### BGMが停止する
- **原因**: ページ遷移（`<a>`タグ使用）
- **解決**: SPAなので react-router-dom の Link コンポーネントを使用

### 画像が見切れる・縦横比が異なる
- **原因**: CSSのobject-fit未指定、またはキャンバスサイズ計算ミス
- **解決**: 適切なobject-fit設定と、PNG保存時はデバイスピクセル比を考慮

### WSL2+スマホ実機アクセス
- **原因**: WSL2はデフォルトでホストマシンのネットワークから分離
- **解決**: ポートフォワーディングスクリプト（`scripts/`配下）を使用

## ドキュメント参照
- **開発環境構築**: [doc/DEVELOPMENT.md](../doc/DEVELOPMENT.md)
- **画像アセット作成**: [doc/IMAGE_ASSETS.md](../doc/IMAGE_ASSETS.md)
- **ボイス実装**: [doc/VOICE_IMPLEMENTATION.md](../doc/VOICE_IMPLEMENTATION.md)
- **CSS管理**: [doc/CSS.md](../doc/CSS.md)
- **多言語対応**: [doc/MULTILINGUAL.md](../doc/MULTILINGUAL.md)

## コーディング規約
- **TypeScript**: 厳格な型定義を使用
- **命名規則**: キャメルケース（変数・関数）、パスカルケース（コンポーネント・型）
- **インポート**: React hookやライブラリは明示的にインポート
- **エラーハンドリング**: try-catchで適切にエラーをキャッチし、ユーザーにフィードバック
- **セキュリティ**: 
  - ファイルアップロードは拡張子・MIMEタイプをチェック
  - APIエンドポイントは適切に認証・認可
  - 環境変数で秘密情報を管理（`.env`ファイル、リポジトリにコミットしない）
