# Aira PJ

This project is a web application built using TypeScript and Express. It serves as a template for creating web applications with a structured approach, including controllers, models, routes, and views.  
このプロジェクトは、TypeScriptとExpressを使用して構築されたWebアプリケーションです。コントローラー、モデル、ルート、ビューを含む構造化されたアプローチでWebアプリケーションを作成するためのテンプレートです。

---

## 🎮 Project Overview / プロジェクト概要

This project will be developed as a dress-up game where users can change a character's outfit, pose the character, capture the image, and save it on the client.  
本プロジェクトは、キャラクターに衣装の着せ替えをさせ、最終的にポーズをとってキャプチャ取得後、画像をクライアントに保存するゲームとして開発します。

### Main Screens / 主な画面構成（全8画面）

1. **Title Screen / タイトル画面**  
   - Generates a session.  
     セッションを生成します。  
   - If the session does not exist, any request to subsequent screens will redirect to the title and regenerate the session.  
     セッションが存在しない場合、後続画面へのリクエストはタイトル画面に強制リダイレクトし、セッションを再生成します。（存在する場合は変更しません）  
   - Center: [Start Game] button → goes to Character Select  
     画面中央に【ゲームをはじめる】ボタン（キャラクター選択画面へ遷移）  
   - Below: [Favorites] menu → goes to History  
     ボタン下に【おきにいり】メニュー（履歴管理画面へ遷移）  
   - Top-left: Gear icon → goes to Settings  
     左上に歯車アイコン（設定画面へ遷移）  
   - Bottom-left: Small link to Terms & Credits  
     左下に小さく規約・クレジット画面へのリンク  

2. **Character Select / キャラクター選択画面**  
3. **Background Select / 背景選択画面**  
4. **Costume Select / 衣装選択画面**  
5. **Free Photo Mode / フリー撮影モード画面**  
6. **History / 履歴管理画面**  
7. **Settings / 設定画面**  
   - 設定画面では、画像アセット（キャラクター・背景・衣装）のアップロードが可能です。
   - 管理者モードの場合のみ利用可能（現状は誰でも利用可、将来的にadmin判定で制御予定）。
   - どのアセット種別をアップロードするか選択し、ファイル選択ボタンでPNG画像を選択してアップロードできます。
   - PNG画像以外はエラーとなります。
   - アップロード後、DB側のIDと実際にアップロードされた画像が画面に表示されます。
   - 削除機能は今後実装予定（TBD）。

8. **Terms & Credits / 規約・クレジット画面**  

---

## Project Structure / プロジェクト構成

```
AiraPJ
├── assets/img/chr, bg, csm   # 画像アセット（キャラ・背景・衣装）
├── src/
│   ├── controllers/          # 各種コントローラ（アップロード含む）
│   ├── models/               # DBモデル（キャラ・背景・衣装・ユーザ等）
│   ├── middlewares/          # セッション・ユーザID管理
│   ├── routes/               # ルーティング
│   ├── views/                # 画面テンプレート（EJS/HTML）
│   └── app.ts                # エントリーポイント
├── package.json
├── tsconfig.json
└── README.md
```

---

## Getting Started / はじめに

To get started with this project, follow these steps:  
このプロジェクトを始めるには、以下の手順に従ってください。

1. **Clone the repository / リポジトリをクローンする**:
   ```
   git clone <repository-url>
   cd AiraPJ
   ```

2. **Install dependencies / 依存パッケージのインストール**:
   ```
   npm install
   ```

3. **Set up the database / データベースの設定**:
   Configure your database settings in `config/database.ts`.  
   `config/database.ts`でデータベース設定を行ってください。

4. **Run the application / アプリケーションの起動**:
   ```
   npm start
   ```

---

## Features / 特徴

- Modular structure with controllers, models, routes, and views.  
  コントローラー、モデル、ルート、ビューによるモジュール構造
- TypeScript for type safety and better development experience.  
  型安全性と開発体験向上のためのTypeScript採用
- Express framework for handling HTTP requests.  
  HTTPリクエスト処理のためのExpressフレームワーク
- Session management for game flow.  
  ゲーム進行のためのセッション管理
- 8 screens for various game features.  
  ゲーム機能ごとの8画面構成

---

## Assets & Upload / アセット管理・アップロード

- 画像アセットは `assets/img/chr`（キャラクター）、`assets/img/bg`（背景）、`assets/img/csm`（衣装）に格納します。
- 設定画面からキャラクター・背景・衣装画像をアップロードできます（PNGのみ対応、現状は誰でも利用可能。将来的に管理者限定予定）。
- アップロード後、DBのIDと画像が画面に表示されます。
- 画像ファイルのパスはDBの各テーブル（character, background, costume）の `assetPath` カラムと紐づきます。
- `assets` フォルダはExpressの静的ファイルとして公開され、画像等に直接アクセスできます。

---

## Database Auto-Setup / データベース自動構築

- PostgreSQLを利用し、アプリ起動時にDB本体・テーブルが自動作成されます。
- DB接続情報は `src/config/database.ts` で設定してください。
- `.env` ファイルで環境変数管理も推奨です。

---

## User & Favorites Management / ユーザ・お気に入り管理

- セッションごとに一意なユーザIDを自動発行し、ユーザごとにデータ（お気に入り等）を管理します。
- お気に入り（例：衣装）は `favorites` テーブルで `userId` と `costumeId` を紐づけて保存します。

---

## License / ライセンス

This project is licensed under the MIT License. See the LICENSE file for more details.  
このプロジェクトはMITライセンスです。詳細はLICENSEファイルをご覧ください。