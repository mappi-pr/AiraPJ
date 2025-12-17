# Google OAuth Setup Guide

このガイドでは、Google認証と管理者権限機能のセットアップ方法を説明します。

## 1. Google Cloud Console でプロジェクトを作成

1. [Google Cloud Console](https://console.cloud.google.com/) にアクセス
2. 新しいプロジェクトを作成するか、既存のプロジェクトを選択
3. 「APIとサービス」→「認証情報」に移動

## 2. OAuth 2.0 クライアントIDを作成

1. 「認証情報を作成」→「OAuth クライアント ID」を選択
2. アプリケーションの種類: 「ウェブアプリケーション」を選択
3. 承認済みのJavaScript生成元を追加:
   - `http://localhost:5173` (開発環境)
   - 本番環境のURL (例: `https://yourdomain.com`)
4. 承認済みのリダイレクトURIを追加:
   - `http://localhost:5173` (開発環境)
   - 本番環境のURL
5. 「作成」をクリック
6. クライアントIDをコピー

## 3. 環境変数を設定

### フロントエンド (.env)

プロジェクトルートに `.env` ファイルを作成:

```
VITE_GOOGLE_CLIENT_ID=あなたのクライアントID.apps.googleusercontent.com
VITE_API_BASE_URL=http://localhost:4000
```

### バックエンド (api/.env)

`api/` ディレクトリに `.env` ファイルを作成:

```
DB_NAME=airapj
DB_USER=postgres
DB_PASS=yourpassword
DB_HOST=localhost
DB_PORT=5432
PORT=4000
GOOGLE_CLIENT_ID=あなたのクライアントID.apps.googleusercontent.com
ADMIN_EMAILS=admin@example.com,anotheradmin@example.com
```

**重要**: `ADMIN_EMAILS` には管理者として登録したいGoogleアカウントのメールアドレスをカンマ区切りで指定してください。

## 4. 動作確認

### サーバーを起動

#### APIサーバー
```bash
cd api
npm install
npm run build
npm start
```

#### フロントエンド
```bash
npm install
npm run dev
```

### ログインテスト

1. ブラウザで `http://localhost:5173` にアクセス
2. タイトル画面でGoogleログインボタンをクリック
3. Googleアカウントでログイン
4. 管理者メールアドレスでログインした場合は「管理者権限」と表示される
5. 歯車アイコン（設定画面）は管理者のみ表示される

### 管理画面アクセステスト

1. 管理者アカウントでログイン後、歯車アイコンをクリック
2. 設定画面が表示される
3. アセットのアップロード・削除が可能

### 非管理者アクセステスト

1. 管理者リストに含まれていないGoogleアカウントでログイン
2. 歯車アイコンは表示されない
3. `/settings` に直接アクセスしてもタイトル画面にリダイレクトされる
4. APIエンドポイント（アップロード・削除）へのアクセスも403エラーになる

## セキュリティ上の注意事項

- **絶対に** `.env` ファイルをGitにコミットしないでください
- 本番環境では必ず `ADMIN_EMAILS` を適切に設定してください
- Google Cloud Consoleで承認済みドメインを正しく設定してください
- 本番環境では HTTPS を使用してください

## トラブルシューティング

### ログインできない場合

1. Google Cloud Consoleで承認済みのJavaScript生成元が正しく設定されているか確認
2. `.env` ファイルの `VITE_GOOGLE_CLIENT_ID` が正しいか確認
3. ブラウザのコンソールでエラーメッセージを確認

### 管理画面にアクセスできない場合

1. `api/.env` の `ADMIN_EMAILS` にログインしたメールアドレスが含まれているか確認
2. APIサーバーが起動しているか確認
3. ブラウザの開発者ツールでネットワークタブを確認し、APIレスポンスを確認

### API呼び出しで401/403エラーが出る場合

1. ログインしているか確認
2. 管理者権限が必要な操作の場合、管理者としてログインしているか確認
3. ブラウザの開発者ツールでAuthorizationヘッダーが正しく送信されているか確認
