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
  VITE_API_BASE_URL=http://localhost:4000
  ```

### 4. サーバーの起動

#### フロントエンド（Vite）
```sh
npm run dev
```
- デフォルト: http://localhost:5173
- Viteの `vite.config.ts` で `/api` へのリクエストは `.env` の `VITE_API_BASE_URL` へプロキシされます。

#### APIサーバー（Express）
```sh
cd api
nvm use   # .nvmrcがある場合
npm run build
npm start
```
- デフォルト: http://localhost:4000（`.env` の `VITE_API_BASE_URL` で変更可）
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
- DB接続情報・APIサーバーポート・ViteのAPIプロキシ先は `.env` の `VITE_API_BASE_URL` で一元管理します。
- フロントエンドのAPIリクエストは `/api/xxx` の相対パスで記述してください。
- CORSエラーが出る場合はAPIサーバー側のCORS設定を見直してください。

### 7. スマートフォン実機からのアクセス（開発環境）
Windows + WSL2環境でスマートフォン実機から開発サーバーにアクセスする場合は、特別な設定が必要です。
詳細な手順については **[DEVELOPMENT.md](./DEVELOPMENT.md)** を参照してください。

- ポートフォワーディングの設定（WSL2環境）
- ファイアウォールの設定
- ネットワーク設定の調整（環境変数 `HOST=0.0.0.0` の設定等）
- トラブルシューティング

**重要**: これらの設定は開発環境専用です。本番環境では適切なセキュリティ対策を行ってください。詳細は [DEVELOPMENT.md](./DEVELOPMENT.md) のセキュリティセクションを参照してください。

## 型エラー対策（Express/TypeScript）
- `express`はv4.x、`@types/express`もv4.17.21に固定してください。
- v5系型が混在するとAPIルートで型エラーが発生します。
- 例: `npm install --save-dev @types/express@4.17.21`

## アセット削除仕様
- 各アセット（顔・前髪・後髪・背景・衣装）は物理削除＋データベースは論理削除（deleted, deletedAt）対応。
- GET APIは論理削除されていないもののみ返却。
- DELETE APIは画像ファイルを物理削除し、DBレコードは論理削除。

## DBマイグレーション
- `.env` のDB接続情報を `config/config.js` で自動参照します（`config.json`は不要です）。
- マイグレーション例: `npx sequelize-cli db:migrate`

## セットアップ注意
- Node.js 18以上推奨
- APIサーバ起動: `npm run dev` または `npm run build && npm start`
- フロントのAPI_BASE_URLは`.env`の`VITE_API_BASE_URL`で一元管理

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

## 画面仕様・photo（フォト撮影）機能
- セッションで選択したパーツ情報（背景・衣装・後髪・顔・前髪）をContext API等で記憶し、各画面で引き継ぐ。
- photo画面では、選択中パーツを「背景→後髪→衣装→顔→前髪」の順でdiv+background-imageで重ね合わせ。
    - どちらも透過PNGのアルファチャンネルを正しく合成可能。
    - 複数divを`position: absolute`で重ね、各divに`backgroundImage`でパーツ画像を指定する。
- 顔系パーツと衣装は一体化して拡縮可（スライダーで倍率調整）、背景は固定。
- 拡縮スライダーでキャラクターの拡大率を変更可能。
- 「PNGで保存」ボタンで統合画像を1枚のPNGとしてダウンロード可能。
    - `html2canvas`方式（画面の見た目をそのままキャプチャ）
    - canvas API手動合成方式（全パーツ画像をレイヤー順に透過合成し高精度PNG化）
- 透過PNG精度向上のため、div+background-imageで`crossOrigin="anonymous"`を付与し、サーバー側でCORSヘッダを有効化。

---
> 詳細なAPI設計や画面仕様は今後追記予定
