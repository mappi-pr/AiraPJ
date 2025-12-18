# 多言語化対応ガイド (Multilingual Support Guide)

このドキュメントでは、AiraPJプロジェクトの多言語化システムについて説明します。

## 目次

1. [概要](#概要)
2. [システムアーキテクチャ](#システムアーキテクチャ)
3. [新しい言語の追加方法](#新しい言語の追加方法)
4. [翻訳キーの追加方法](#翻訳キーの追加方法)
5. [開発者向け使用方法](#開発者向け使用方法)
6. [ベストプラクティス](#ベストプラクティス)
7. [トラブルシューティング](#トラブルシューティング)

---

## 概要

AiraPJプロジェクトは、React Context APIを使用した多言語化システムを実装しています。このシステムにより、以下が可能になります：

- 複数言語のサポート（現在は日本語のみ、将来的に拡張可能）
- 型安全な翻訳キーの使用
- 実行時の言語切り替え
- ブラウザの言語設定とlocalStorageによる言語の永続化

### 現在サポートされている言語

- **日本語 (ja)** - デフォルト言語

### 主要な技術スタック

- React Context API（状態管理）
- TypeScript（型安全性）
- LocalStorage（言語設定の永続化）

---

## システムアーキテクチャ

### ディレクトリ構造

```
src/
├── context/
│   └── LocaleContext.tsx      # 多言語化Context（言語状態管理）
├── hooks/
│   └── useTranslation.ts      # 翻訳テキスト取得用カスタムフック
├── locales/
│   ├── ja.json                # 日本語翻訳ファイル
│   └── en.json.example        # 英語翻訳テンプレート（将来用）
├── types/
│   └── locale.d.ts            # 多言語化型定義
└── pages/
    ├── Title.tsx              # useTranslationを使用
    ├── CharacterPartsSelect.tsx
    └── ...
```

### 主要コンポーネント

#### 1. LocaleContext (`src/context/LocaleContext.tsx`)

多言語化の中核となるContext。以下の機能を提供します：

- 現在の言語状態の管理
- 翻訳データの読み込みと提供
- 言語切り替え機能
- LocalStorageへの永続化

```typescript
export interface LocaleContextType {
  locale: SupportedLanguage;  // 現在の言語
  setLocale: (locale: SupportedLanguage) => void;  // 言語変更関数
  t: Locale;  // 翻訳オブジェクト
}
```

#### 2. useTranslation Hook (`src/hooks/useTranslation.ts`)

翻訳テキストを簡単に取得するためのカスタムフック：

```typescript
const { t, locale, setLocale } = useTranslation();
```

#### 3. 型定義 (`src/types/locale.d.ts`)

TypeScriptの型安全性を保証：

```typescript
export type Locale = typeof ja;  // ja.jsonの構造を型として定義
export type SupportedLanguage = 'ja';  // サポート言語のリスト
```

---

## 新しい言語の追加方法

### ステップ1: 翻訳ファイルの作成

1. `src/locales/en.json.example` をコピーして新しい言語ファイルを作成します：

```bash
# 英語の場合
cp src/locales/en.json.example src/locales/en.json

# 中国語（簡体字）の場合
cp src/locales/en.json.example src/locales/zh-CN.json
```

2. 新しいファイル内のすべてのテキストを翻訳します。**必ずja.jsonと同じJSON構造を維持してください。**

### ステップ2: 型定義の更新

`src/types/locale.d.ts` を編集し、新しい言語コードを追加します：

```typescript
// 変更前
export type SupportedLanguage = 'ja';

// 変更後（英語を追加）
export type SupportedLanguage = 'ja' | 'en';

// 変更後（英語と中国語を追加）
export type SupportedLanguage = 'ja' | 'en' | 'zh-CN';
```

### ステップ3: LocaleContextの更新

`src/context/LocaleContext.tsx` を編集し、新しい言語のimportとswitch文を追加します：

```typescript
// 1. ファイルの先頭にimportを追加
import ja from '../locales/ja.json';
import en from '../locales/en.json';  // 追加

// 2. getInitialLocale関数内のチェックを更新
const getInitialLocale = (): SupportedLanguage => {
  const stored = localStorage.getItem('locale') as SupportedLanguage | null;
  if (stored && ['ja', 'en'].includes(stored)) {  // 'en'を追加
    return stored;
  }
  return 'ja';
};

// 3. loadTranslations関数内のswitch文を更新
const loadTranslations = async () => {
  try {
    let newTranslations: Locale;
    switch (locale) {
      case 'ja':
        newTranslations = ja;
        break;
      case 'en':  // 追加
        newTranslations = en;
        break;
      default:
        newTranslations = ja;
        break;
    }
    setTranslations(newTranslations);
    localStorage.setItem('locale', locale);
  } catch (error) {
    console.error('Failed to load translations:', error);
    setTranslations(ja);
  }
};
```

### ステップ4: 言語切り替えUIの追加（オプション）

言語切り替えボタンを追加する場合：

```tsx
// 例: App.tsx または専用の言語切り替えコンポーネント
import { useTranslation } from './hooks/useTranslation';

function LanguageSwitcher() {
  const { locale, setLocale } = useTranslation();
  
  return (
    <div>
      <button onClick={() => setLocale('ja')} disabled={locale === 'ja'}>
        日本語
      </button>
      <button onClick={() => setLocale('en')} disabled={locale === 'en'}>
        English
      </button>
    </div>
  );
}
```

---

## 翻訳キーの追加方法

新しい画面や機能を追加する際に、翻訳キーを追加する方法：

### ステップ1: 翻訳ファイルへの追加

すべての言語ファイル（`ja.json`, `en.json` など）に同じキーを追加します：

```json
// src/locales/ja.json
{
  "common": { ... },
  "newFeature": {
    "title": "新機能",
    "description": "これは新しい機能です",
    "button": "実行"
  }
}
```

```json
// src/locales/en.json
{
  "common": { ... },
  "newFeature": {
    "title": "New Feature",
    "description": "This is a new feature",
    "button": "Execute"
  }
}
```

### ステップ2: コンポーネントでの使用

```tsx
import { useTranslation } from '../hooks/useTranslation';

const NewFeaturePage: React.FC = () => {
  const { t } = useTranslation();
  
  return (
    <div>
      <h1>{t.newFeature.title}</h1>
      <p>{t.newFeature.description}</p>
      <button>{t.newFeature.button}</button>
    </div>
  );
};
```

### ステップ3: TypeScriptの型チェック

TypeScriptが自動的に型チェックを行うため、存在しないキーを参照するとコンパイルエラーになります：

```typescript
// ✅ 正しい
t.newFeature.title

// ❌ エラー（存在しないキー）
t.newFeature.nonExistentKey  // TypeScript error!
```

---

## 開発者向け使用方法

### 基本的な使い方

```tsx
import { useTranslation } from '../hooks/useTranslation';

const MyComponent: React.FC = () => {
  const { t } = useTranslation();
  
  return <h1>{t.title.mainTitle}</h1>;
};
```

### 言語情報の取得

```tsx
const { t, locale } = useTranslation();

console.log(locale);  // 'ja' or 'en' etc.
console.log(t.title.mainTitle);  // 現在の言語のテキスト
```

### 言語の切り替え

```tsx
const { setLocale } = useTranslation();

// 言語を英語に切り替え
setLocale('en');
```

### 動的なテキスト

変数を含むテキストが必要な場合は、テンプレートリテラルを使用：

```tsx
// 翻訳ファイル
{
  "greeting": {
    "hello": "こんにちは"
  }
}

// コンポーネント
const userName = "太郎";
const greeting = `${t.greeting.hello}、${userName}さん！`;
// 結果: "こんにちは、太郎さん！"
```

### 配列やオブジェクトのマッピング

```tsx
const assetTypes = [
  { key: 'face', label: t.settings.faceLabel },
  { key: 'frontHair', label: t.settings.frontHairLabel },
  { key: 'backHair', label: t.settings.backHairLabel },
];

return (
  <ul>
    {assetTypes.map(({ key, label }) => (
      <li key={key}>{label}</li>
    ))}
  </ul>
);
```

---

## ベストプラクティス

### 1. 翻訳ファイルの構造

- **論理的なグルーピング**: 機能や画面ごとにキーをグループ化
- **一貫性のある命名**: キャメルケースを使用（例: `mainTitle`, `startBtn`）
- **共通テキストの分離**: `common` セクションに共通のテキストを配置

```json
{
  "common": {
    "next": "次へ",
    "cancel": "キャンセル",
    "save": "保存"
  },
  "specificFeature": {
    "title": "機能タイトル",
    "description": "説明"
  }
}
```

### 2. 翻訳キーの命名規則

- **説明的な名前**: `btn1` ではなく `startBtn`
- **コンテキストを含む**: `title` ではなく `pageTitle`
- **動詞の使用**: ボタンには動詞を使う（`save`, `delete`, `upload`）

### 3. 型安全性の活用

- 直接文字列を使わず、必ず `t` オブジェクトを使用
- TypeScriptの自動補完とエラーチェックを活用

```tsx
// ✅ 推奨
<h1>{t.title.mainTitle}</h1>

// ❌ 非推奨（ハードコーディング）
<h1>Aira PJ</h1>
```

### 4. デフォルト言語の設定

- `ja.json` を常に最新かつ完全な状態に保つ
- 他の言語ファイルは `ja.json` を基準に作成

### 5. エラーハンドリング

`LocaleContext.tsx` では、翻訳の読み込みに失敗した場合に日本語にフォールバックします：

```typescript
try {
  // 翻訳読み込み
} catch (error) {
  console.error('Failed to load translations:', error);
  setTranslations(ja);  // 日本語にフォールバック
}
```

### 6. パフォーマンス

- 翻訳ファイルは静的にimportされるため、ビルド時にバンドルされます
- 言語切り替え時のみ再レンダリングが発生します

---

## トラブルシューティング

### 問題: TypeScriptエラー「Property does not exist」

**原因**: 翻訳キーがすべての言語ファイルに存在しない

**解決方法**:
1. すべての言語ファイル（ja.json, en.json等）に同じキーを追加
2. 型定義ファイルを確認（`locale.d.ts`）

### 問題: 翻訳が表示されない

**原因1**: `LocaleProvider` がコンポーネントツリーの上位に配置されていない

**解決方法**: `App.tsx` で `LocaleProvider` を確認

```tsx
// App.tsx
return (
  <LocaleProvider>
    <PartsProvider>
      {/* 他のコンポーネント */}
    </PartsProvider>
  </LocaleProvider>
);
```

**原因2**: `useTranslation` を `LocaleProvider` の外で使用している

**解決方法**: コンポーネントが `LocaleProvider` の子孫であることを確認

### 問題: 言語切り替えが保存されない

**原因**: LocalStorageが無効化されている、またはブラウザのプライベートモード

**解決方法**:
- ブラウザのLocalStorage設定を確認
- プライベートモードを解除

### 問題: ビルドエラー「Cannot find module」

**原因**: 新しい翻訳ファイルがimportされていない

**解決方法**: `LocaleContext.tsx` にimport文を追加

```typescript
import en from '../locales/en.json';
```

---

## まとめ

このガイドに従うことで、AiraPJプロジェクトに新しい言語を追加し、効果的に多言語化を管理できます。

### チェックリスト

新しい言語を追加する際のチェックリスト：

- [ ] `src/locales/<lang>.json` ファイルを作成
- [ ] `src/types/locale.d.ts` の `SupportedLanguage` 型を更新
- [ ] `src/context/LocaleContext.tsx` にimport文を追加
- [ ] `LocaleContext.tsx` の `getInitialLocale` 関数を更新
- [ ] `LocaleContext.tsx` の `loadTranslations` 関数を更新
- [ ] 言語切り替えUIを追加（オプション）
- [ ] すべてのページでテキストが正しく表示されることを確認

### 参考リンク

- [React Context API](https://react.dev/reference/react/useContext)
- [TypeScript型定義](https://www.typescriptlang.org/docs/handbook/2/types-from-types.html)
- [LocalStorage API](https://developer.mozilla.org/ja/docs/Web/API/Window/localStorage)

---

**最終更新日**: 2025-12-18
