# AiraSPA - 着せ替えゲームSPA

このプロジェクトはReact + Vite + TypeScriptによるSPA（シングルページアプリケーション）です。
Express APIサーバーと連携し、キャラクター・背景・衣装の着せ替えやBGM/SEの継続再生、リッチな画面遷移演出を実現します。

## セットアップ手順

1. 依存パッケージのインストール
   ```sh
   npm install
   ```
2. 開発サーバーの起動
   ```sh
   npm run dev
   ```

## ディレクトリ構成（例）

```
AiraSPA/
├── src/
│   ├── components/      # Reactコンポーネント群
│   ├── pages/           # 各画面（ルーティング単位）
│   ├── App.tsx          # ルーティング/状態管理のエントリ
│   ├── main.tsx         # エントリポイント
│   └── ...
├── public/              # 静的アセット（BGM/SE/画像等）
├── .github/copilot-instructions.md
├── README.md
└── ...
```

## 主な技術
- React 18+
- Vite
- TypeScript
- react-router-dom
- Context API（状態管理）
- Express（APIサーバー、別リポジトリ/ディレクトリ）

## 開発・設計ポイント
- 画面遷移はreact-router-domで制御し、BGM/SEはApp直下で管理して継続再生
- API通信はfetch/axiosで実装
- 画面遷移時の演出や連打防止もSPAで制御
- Express APIサーバーは `/api` 配下でRESTエンドポイントを提供

## 今後のTODO
- 既存EJSテンプレートのReactコンポーネント化
- APIサーバーの分離・設計
- BGM/SE管理用の共通コンポーネント作成
- 画面遷移アニメーションの実装
- DB連携・認証・お気に入り管理

---

> 詳細なAPI設計や画面仕様は今後追記予定
