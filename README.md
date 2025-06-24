# AiraSPA - 着せ替えゲームSPA

このプロジェクトはReact + Vite + TypeScriptによるSPA（シングルページアプリケーション）です。
Express APIサーバーと連携し、キャラクター・背景・衣装の着せ替えやBGM/SEの継続再生、リッチな画面遷移演出を実現します。

## セットアップ手順

### 1. Node.jsバージョンの統一
- プロジェクトルートに `.nvmrc`（例: `20`）があり、`nvm use` でNode.js v20系を自動選択できます。
- nvm未使用の場合も、**必ずNode.js v20.x** を利用してください。

### 2. 依存パッケージのインストール
```sh
npm install
cd api
npm install
```

### 3. 環境変数ファイルの作成
- `api/.env.example` を参考に `api/.env` を作成し、DBやAPIサーバーの設定を記入します。
- 例:
  ```
  DB_NAME=airapj
  DB_USER=youruser
  DB_PASS=yourpassword
  DB_HOST=localhost
  DB_PORT=5432
  API_PORT=4000
  ```

### 4. サーバーの起動

#### フロントエンド（Vite）
```sh
npm run dev
```
- デフォルト: http://localhost:5173
- Viteの `vite.config.ts` で `/api` へのリクエストは http://localhost:4000 へプロキシされます。

#### APIサーバー（Express）
```sh
cd api
nvm use   # .nvmrcがある場合
npm run build
npm start
```
- デフォルト: http://localhost:4000
- アップロード画像は `api/dist/uploads/` 配下に保存されます。
- ビルド時に `uploads` ディレクトリが `dist/uploads` へ自動コピーされます。
- アップロード時、必要なサブディレクトリ（chr/bg/csm）は自動生成されます。

### 5. APIエンドポイント例
- `/api/face/upload` 顔パーツ画像アップロード
- `/api/front-hair/upload` 前髪パーツ画像アップロード
- `/api/back-hair/upload` 後髪パーツ画像アップロード
- `/api/background/upload` 背景画像アップロード
- `/api/costume/upload` 衣装画像アップロード

### 6. 注意点
- Node.js v22系などではAPIサーバーは起動できません。必ずv20系で実行してください。
- DB接続情報・APIサーバーポートは `.env` で管理します。
- フロントエンドのAPIリクエストは `/api/xxx` の相対パスで記述してください。
- CORSエラーが出る場合はAPIサーバー側のCORS設定を見直してください。

## ディレクトリ構成（例）
```
AiraSPA/
├── src/                  # フロントエンド（React+Vite）
│   ├── components/      # Reactコンポーネント群
│   ├── pages/           # 各画面
│   ├── App.tsx          # ルーティング/状態管理のエントリ
│   ├── main.tsx         # エントリポイント
│   └── ...
├── public/              # 静的アセット
├── api/                 # APIサーバー
│   ├── routes/          # APIルーティング
│   ├── models/          # DBモデル
│   ├── uploads/         # 画像アップロード保存先
│   ├── dist/uploads/    # 本番用アップロード保存先
│   ├── index.ts         # APIサーバーエントリ
│   └── ...
├── .nvmrc               # Node.jsバージョン指定
├── README.md
└── ...
```

## 主な技術
- React 18+
- Vite
- TypeScript
- react-router-dom
- Context API
- Express
- Sequelize
- PostgreSQL

## 開発・設計ポイント
- 画面遷移はreact-router-domで制御し、BGM/SEはApp直下で管理して継続再生
- API通信はfetch/axiosで実装
- 画面遷移時の演出や連打防止もSPAで制御
- Express APIサーバーは `/api` 配下でRESTエンドポイントを提供
- DB登録・アップロード時のディレクトリ自動生成に対応
- **キャラクター選択画面は「顔・前髪・後髪」3パーツ選択式（`CharacterPartsSelect.tsx`）**

---
> 詳細なAPI設計や画面仕様は今後追記予定
