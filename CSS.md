# CSSアーキテクチャドキュメント

このドキュメントでは、AiraPJプロジェクトにおけるCSSファイルの管理方針と定義について説明します。

## 目次

- [概要](#概要)
- [CSSファイルの役割分担](#cssファイルの役割分担)
- [index.css - グローバルスタイル](#indexcss---グローバルスタイル)
- [App.css - アプリケーションスタイル](#appcss---アプリケーションスタイル)
- [スタイル管理の原則](#スタイル管理の原則)
- [新しいスタイルを追加する際のガイドライン](#新しいスタイルを追加する際のガイドライン)

## 概要

AiraPJプロジェクトでは、2つの主要なCSSファイルを使用してスタイルを管理しています：

1. **`/src/index.css`** - グローバルスタイル・基礎スタイル
2. **`/src/App.css`** - アプリケーション固有のスタイル

これらのファイルは明確な責任分担を持ち、保守性と拡張性を確保しています。

## CSSファイルの役割分担

### ファイル構成

```
src/
├── index.css      # グローバルスタイル（基礎層）
├── App.css        # アプリケーションスタイル（アプリケーション層）
├── main.tsx       # index.cssをインポート
└── App.tsx        # App.cssをインポート
```

### インポート順序

1. `main.tsx` で `index.css` をインポート
2. `App.tsx` で `App.css` をインポート

この順序により、グローバルスタイルが先に適用され、アプリケーション固有のスタイルで必要に応じてオーバーライドできます。

## index.css - グローバルスタイル

### 役割

`index.css` は**アプリケーション全体の基礎となるスタイル**を定義します。すべてのページ・コンポーネントに共通する基本的な見た目とふるまいを規定します。

### 定義内容

#### 1. ルート変数とフォント設定（`:root`）

```css
:root {
  font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;
  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background: linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

**目的:**
- アプリケーション全体のフォントファミリー
- 基本的な行間・文字色
- ダークテーマのグラデーション背景
- `color-scheme`でブラウザのUI要素（スクロールバー、フォームコントロールなど）の配色を制御
- フォントレンダリング最適化（アンチエイリアス、サブピクセルレンダリング制御）

#### 2. 基本要素のスタイル

##### リンク（`a`）

```css
a {
  font-weight: 600;
  color: #ffffff;
  text-decoration: underline;
  text-decoration-color: rgba(255, 255, 255, 0.4);
  text-underline-offset: 4px;
  transition: all 0.3s ease;
  position: relative;
}

a:hover {
  color: #ffffff;
  text-decoration-color: rgba(255, 255, 255, 0.8);
  text-shadow: 0 0 10px rgba(255, 255, 255, 0.5);
}
```

**目的:**
- リンクの視認性確保
- 下線の色とオフセットのカスタマイズ
- インタラクティブなホバー効果（光彩効果）

##### ボディ（`body`）

```css
body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
  position: relative;
  overflow-x: hidden;
}
```

**目的:**
- ページ全体のレイアウト基盤
- 最小サイズの保証
- 横スクロール防止

##### 見出し（`h1`）

```css
h1 {
  font-size: 3.2em;
  line-height: 1.1;
  color: #ffffff;
  text-shadow: 0 2px 10px rgba(102, 126, 234, 0.3);
  font-weight: 700;
}
```

**目的:**
- 見出しの統一された外観
- 光彩効果によるファンタジー感の演出

##### ボタン（`button`）

```css
button {
  border-radius: 12px;
  border: 2px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 600;
  font-family: inherit;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
  position: relative;
  overflow: hidden;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.3);
}

button::before {
  content: '';
  position: absolute;
  top: 50%;
  left: 50%;
  width: 0;
  height: 0;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.5);
  transform: translate(-50%, -50%);
  transition: width 0.6s, height 0.6s;
}

button:hover {
  transform: translateY(-2px) scale(1.05);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
  border-color: rgba(255, 255, 255, 0.3);  /* 透明だったボーダーが白く光る */
}

button:active::before {
  width: 300px;
  height: 300px;
  transition: width 0s, height 0s;
}

button:focus,
button:focus-visible {
  outline: 3px solid rgba(102, 126, 234, 0.5);
  outline-offset: 2px;
}

button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
  transform: none;
}
```

**目的:**
- すべてのボタンの統一されたデザイン
- グラデーション背景とホバー時の浮き上がり効果
- クリック時のリップル効果（`::before` 疑似要素で実装）
- アクセシビリティ対応（フォーカス表示）
- 無効状態の視覚的表現

#### 3. 背景エフェクト

##### キラキラ背景（`body::before`）

```css
body::before {
  content: '';
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-image: 
    radial-gradient(2px 2px at 20% 30%, white, transparent),
    radial-gradient(2px 2px at 60% 70%, white, transparent),
    radial-gradient(1px 1px at 50% 50%, white, transparent),
    radial-gradient(1px 1px at 80% 10%, white, transparent),
    radial-gradient(2px 2px at 90% 60%, white, transparent),
    radial-gradient(1px 1px at 33% 80%, white, transparent),
    radial-gradient(1px 1px at 15% 90%, white, transparent);
  background-size: 200% 200%;
  background-position: 0% 0%;
  animation: sparkle 20s ease-in-out infinite;
  opacity: 0.3;
  pointer-events: none;
  z-index: 0;
}

@keyframes sparkle {
  0%, 100% {
    opacity: 0.2;
    background-position: 0% 0%;
  }
  50% {
    opacity: 0.5;
    background-position: 100% 100%;
  }
}
```

**目的:**
- ファンタジー世界観の演出
- 静的でない動的な背景効果
- 7つの異なるradial-gradientレイヤーで星のような効果を生成
- アニメーションで位置と透明度を変化させてキラキラ感を演出

#### 4. ページ遷移アニメーション

```css
.page-fade-enter {
  opacity: 0;
  transform: translateY(20px);
}

.page-fade-enter-active {
  opacity: 1;
  transform: translateY(0);
  transition: opacity 0.5s ease, transform 0.5s ease;
}
```

**目的:**
- ページ遷移時のフェードイン・スライドアップ効果
- スムーズな画面切り替え

#### 5. カラーモード対応（ライトテーマ）

```css
@media (prefers-color-scheme: light) {
  :root {
    color: #213547;
    background: linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%);
  }
  /* 他の要素の色調整 */
}
```

**目的:**
- システムのカラーモード設定に対応
- ライトモード時の明るいグラデーション背景

### 管理方針

- **変更する場合**: アプリケーション全体に影響する基本的な見た目を変更したい場合
- **例**: フォントファミリー変更、全体の配色変更、ボタンの基本デザイン変更
- **注意**: 影響範囲が大きいため、変更時は十分にテストを実施

## App.css - アプリケーションスタイル

### 役割

`App.css` は**アプリケーション固有のUIコンポーネントやレイアウト**のスタイルを定義します。着せ替えゲームの機能に特化したスタイルを管理します。

### 定義内容

#### 1. ルートコンテナ（`#root`）

```css
#root {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
  position: relative;
  z-index: 1;
}
```

**目的:**
- アプリケーションコンテナの最大幅制限
- 中央寄せレイアウト
- z-index管理の基準点

#### 2. アニメーション効果

##### フェードイン（`.main-container`）

```css
.main-container {
  animation: fadeIn 0.5s ease-in;
  position: relative;
  z-index: 1;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
```

**目的:**
- コンテンツ表示時のフェードイン効果
- ページ読み込み時のスムーズな表示

##### キラキラパーティクル（`.sparkle-particle`）

```css
.sparkle-particle {
  position: fixed;
  width: 4px;
  height: 4px;
  background: white;
  border-radius: 50%;
  pointer-events: none;
  animation: float 3s ease-in-out infinite;
  box-shadow: 0 0 10px rgba(255, 255, 255, 0.8);
}
```

**目的:**
- 画面上を漂うキラキラエフェクト
- ファンタジー感の演出

#### 3. 機能的UIコンポーネント

##### セレクトコンテナ（`.select-container`）

```css
.select-container {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  margin: 24px 0;
  padding: 20px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
}
```

**目的:**
- 背景・衣装選択エリアのグラスモーフィズムデザイン
- 半透明背景とぼかし効果

##### 情報表示エリア（`#background-info`, `#costume-info`）

```css
#background-info,
#costume-info {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 12px;
  transition: all 0.3s ease;
}
```

**目的:**
- 選択中のアイテム情報表示
- ホバー時のインタラクティブ効果

#### 4. 特殊な入力要素

##### レンジスライダー（`input[type="range"]`）

```css
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
  width: 200px;
  height: 8px;
  border-radius: 5px;
  background: linear-gradient(90deg, #667eea, #764ba2);
  outline: none;
  margin: 0 1em;
}
```

**目的:**
- キャラクター拡縮スライダーのカスタムデザイン
- グラデーション背景とカスタムつまみ

##### テキスト入力・セレクト（`input[type="text"]`, `select`）

```css
input[type="text"],
input[type="file"],
select {
  padding: 0.5em;
  border-radius: 8px;
  border: 2px solid rgba(102, 126, 234, 0.3);
  background: rgba(255, 255, 255, 0.05);
  color: inherit;
  transition: all 0.3s ease;
  margin: 0.5em;
}
```

**目的:**
- フォーム要素の統一されたデザイン
- フォーカス時の光彩効果

#### 5. 特定機能のスタイル

##### 設定アイコン（`#settings-icon`）

```css
#settings-icon {
  display: inline-block;
  transition: all 0.3s ease;
}

#settings-icon:hover img {
  filter: drop-shadow(0 4px 8px rgba(102, 126, 234, 0.6)) brightness(1.2);
  transform: rotate(90deg) scale(1.1);
}
```

**目的:**
- 設定アイコンのホバー時の回転・拡大効果
- 視覚的なフィードバック

##### サウンドトグルボタン（`#sound-toggle button`）

```css
#sound-toggle button {
  font-size: 0.9em;
  padding: 0.5em 1em;
  background: rgba(102, 126, 234, 0.3);
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.2);
}
```

**目的:**
- BGM/SEトグルボタンの専用デザイン
- 半透明でぼかし効果のあるボタン

##### アセットリスト（`.asset-list`）

```css
.asset-list {
  list-style: none;
  padding: 0;
}

.asset-list li {
  background: rgba(255, 255, 255, 0.05);
  padding: 12px;
  border-radius: 8px;
  margin-bottom: 8px;
  transition: all 0.3s ease;
}
```

**目的:**
- 管理画面でのアセット一覧表示
- ホバー時のスライドアニメーション

#### 6. その他のスタイル

##### ロゴアニメーション（`.logo`）

```css
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}

@keyframes logo-spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

@media (prefers-reduced-motion: no-preference) {
  a:nth-of-type(2) .logo {
    animation: logo-spin infinite 20s linear;
  }
}
```

**目的:**
- ロゴの回転アニメーション
- 視覚的な動きによる注目喚起
- モーション設定への配慮

### 管理方針

- **変更する場合**: 特定の機能やコンポーネントのデザインを変更したい場合
- **例**: セレクトボックスのデザイン変更、スライダーの色変更、アニメーション調整
- **注意**: 特定のID・クラス名に依存しているため、HTML構造との整合性を保つ

## スタイル管理の原則

### 1. 責任の分離

- **`index.css`**: グローバル・基礎スタイル（全体に影響）
- **`App.css`**: アプリケーション固有スタイル（特定機能に影響）

### 2. カスケードの活用

`index.css` → `App.css` の順にインポートされるため、必要に応じて `App.css` で `index.css` のスタイルをオーバーライドできます。

### 3. 一貫性の維持

#### 色の使用

両ファイルで共通して使用される色：
- **プライマリグラデーション**: `#667eea` から `#764ba2`
- **背景透過**: `rgba(255, 255, 255, 0.05)` など
- **光彩効果**: `rgba(102, 126, 234, 0.x)` のバリエーション

#### トランジション

多くの要素で `transition: all 0.3s ease` を使用し、統一感のあるアニメーションを実現

#### ボーダーラジウス

角丸の度合いは `8px` ～ `16px` を基準に使い分け

### 4. アクセシビリティへの配慮

- `:focus-visible` でキーボード操作時のフォーカス表示
- `prefers-reduced-motion` でモーション抑制設定に対応
- `prefers-color-scheme` でシステムのカラーモードに対応

### 5. パフォーマンス最適化

- `will-change` プロパティでアニメーション最適化
- `backdrop-filter` でグラスモーフィズム効果
- CSS Animationで滑らかな動き

## 新しいスタイルを追加する際のガイドライン

### どちらのファイルに追加すべきか？

#### `index.css` に追加する場合

- アプリケーション全体で使用される要素のスタイル
- 新しいHTML基本要素のスタイル（例: `ul`, `ol`, `table` など）
- 全ページで共通するアニメーション・トランジション
- グローバルなCSS変数の追加

**例:**
```css
/* 新しいグローバル要素 */
table {
  width: 100%;
  border-collapse: collapse;
  /* ... */
}
```

#### `App.css` に追加する場合

- 特定の画面・機能に固有のスタイル
- ID・クラス名で特定されるコンポーネントのスタイル
- 特定の機能に関連するアニメーション
- 既存のグローバルスタイルのオーバーライド

**例:**
```css
/* 新しい機能固有のスタイル */
.photo-preview {
  max-width: 800px;
  /* ... */
}
```

### スタイル追加のベストプラクティス

1. **既存のパターンに従う**
   - 既存のスタイルと同じ命名規則・記述方法を使用
   - 既存の色・サイズ・アニメーションの値を再利用

2. **特異性を適切に管理**
   - 必要最小限のセレクタを使用
   - `!important` の使用は避ける

3. **コメントを追加**
   - 複雑なスタイルには目的を説明するコメントを追加
   - セクション区切りのコメントで可読性を向上

4. **レスポンシブ対応**
   - 必要に応じてメディアクエリを追加
   - モバイル・タブレット・デスクトップでの表示を確認

5. **ブラウザ互換性**
   - ベンダープレフィックスが必要な場合は追加（例: `-webkit-`, `-moz-`）
   - 新しいCSS機能を使用する場合はフォールバックを検討

### 例: 新しいスタイルの追加

```css
/* App.css に追加 */

/* 写真プレビュー機能 */
.photo-preview-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 16px;
  padding: 24px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 16px;
  backdrop-filter: blur(10px);
  /* 既存のselect-containerと同様のデザインパターン */
}

.photo-preview-image {
  max-width: 100%;
  height: auto;
  border-radius: 12px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  transition: all 0.3s ease;
}

.photo-preview-image:hover {
  transform: scale(1.02);
  box-shadow: 0 12px 48px rgba(0, 0, 0, 0.3);
}
```

## まとめ

### index.css

- **役割**: グローバルスタイル・基礎スタイル
- **対象**: HTML基本要素、全体の配色・フォント、共通アニメーション
- **変更頻度**: 低（アプリ全体のデザイン刷新時のみ）

### App.css

- **役割**: アプリケーション固有スタイル
- **対象**: 特定機能のコンポーネント、ID/クラス指定要素
- **変更頻度**: 中〜高（機能追加・改善時）

### 管理のポイント

1. **責任を明確に分離**: グローバル vs アプリケーション固有
2. **一貫性を保つ**: 色・サイズ・アニメーションの値を統一
3. **既存パターンに従う**: 新規追加時は既存スタイルを参考に
4. **影響範囲を理解**: 変更前に影響範囲を確認
5. **テストを実施**: 変更後は複数の画面・デバイスで動作確認

このドキュメントを参考に、保守性の高いCSS管理を実現してください。
