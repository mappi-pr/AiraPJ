# 多言語化対応ガイド / Multilingual Support Guide

[日本語](#日本語) | [English](#english)

---

# 日本語

このドキュメントでは、AiraPJの多言語化システムについて説明します。

## 目次

1. [概要](#概要-ja)
2. [システムアーキテクチャ](#システムアーキテクチャ-ja)
3. [新しい言語の追加方法](#新しい言語の追加方法-ja)
4. [翻訳キーの追加方法](#翻訳キーの追加方法-ja)
5. [開発者向け使用方法](#開発者向け使用方法-ja)
6. [ベストプラクティス](#ベストプラクティス-ja)
7. [トラブルシューティング](#トラブルシューティング-ja)

---

## 概要 {#概要-ja}

AiraPJは、React Context APIを使用した多言語化システムを実装しています。このシステムにより、以下が可能になります：

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

## システムアーキテクチャ {#システムアーキテクチャ-ja}

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
export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['ja'] as const;
```

---

## 新しい言語の追加方法 {#新しい言語の追加方法-ja}

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
export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['ja'] as const;

// 変更後（英語を追加）
export type SupportedLanguage = 'ja' | 'en';
export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['ja', 'en'] as const;
```

### ステップ3: LocaleContextの更新

`src/context/LocaleContext.tsx` を編集し、新しい言語のimportとswitch文を追加します：

```typescript
// 1. ファイルの先頭にimportを追加
import ja from '../locales/ja.json';
import en from '../locales/en.json';  // 追加

// 2. loadTranslations関数内のswitch文を更新
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

## 翻訳キーの追加方法 {#翻訳キーの追加方法-ja}

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

## 開発者向け使用方法 {#開発者向け使用方法-ja}

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
const assetTypes = useMemo(() => [
  { key: 'face', label: t.settings.faceLabel },
  { key: 'frontHair', label: t.settings.frontHairLabel },
  { key: 'backHair', label: t.settings.backHairLabel },
], [t]);

return (
  <ul>
    {assetTypes.map(({ key, label }) => (
      <li key={key}>{label}</li>
    ))}
  </ul>
);
```

---

## ベストプラクティス {#ベストプラクティス-ja}

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

### 5. パフォーマンス最適化

- `useMemo` を使用して、翻訳キーに依存する配列やオブジェクトの再生成を防ぐ

```tsx
const assetTypes = useMemo(() => [
  { key: 'face', label: t.settings.faceLabel },
  // ...
], [t]);
```

---

## トラブルシューティング {#トラブルシューティング-ja}

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

このガイドに従うことで、AiraPJに新しい言語を追加し、効果的に多言語化を管理できます。

### チェックリスト

新しい言語を追加する際のチェックリスト：

- [ ] `src/locales/<lang>.json` ファイルを作成
- [ ] `src/types/locale.d.ts` の `SupportedLanguage` 型と `SUPPORTED_LANGUAGES` 配列を更新
- [ ] `src/context/LocaleContext.tsx` にimport文を追加
- [ ] `LocaleContext.tsx` の `loadTranslations` 関数を更新
- [ ] 言語切り替えUIを追加（オプション）
- [ ] すべてのページでテキストが正しく表示されることを確認

---

# English

This document explains the multilingual system of AiraPJ.

## Table of Contents

1. [Overview](#overview-en)
2. [System Architecture](#system-architecture-en)
3. [How to Add a New Language](#how-to-add-a-new-language-en)
4. [How to Add Translation Keys](#how-to-add-translation-keys-en)
5. [Developer Usage Guide](#developer-usage-guide-en)
6. [Best Practices](#best-practices-en)
7. [Troubleshooting](#troubleshooting-en)

---

## Overview {#overview-en}

AiraPJ implements a multilingual system using React Context API. This system enables:

- Support for multiple languages (currently Japanese only, expandable in the future)
- Type-safe translation key usage
- Runtime language switching
- Language setting persistence via browser language detection and localStorage

### Currently Supported Languages

- **Japanese (ja)** - Default language

### Main Technology Stack

- React Context API (state management)
- TypeScript (type safety)
- LocalStorage (language setting persistence)

---

## System Architecture {#system-architecture-en}

### Directory Structure

```
src/
├── context/
│   └── LocaleContext.tsx      # Multilingual Context (language state management)
├── hooks/
│   └── useTranslation.ts      # Custom hook for retrieving translation text
├── locales/
│   ├── ja.json                # Japanese translation file
│   └── en.json.example        # English translation template (for future use)
├── types/
│   └── locale.d.ts            # Multilingual type definitions
└── pages/
    ├── Title.tsx              # Uses useTranslation
    ├── CharacterPartsSelect.tsx
    └── ...
```

### Main Components

#### 1. LocaleContext (`src/context/LocaleContext.tsx`)

The core Context for multilingualization. Provides the following features:

- Management of current language state
- Loading and providing translation data
- Language switching functionality
- Persistence to localStorage

```typescript
export interface LocaleContextType {
  locale: SupportedLanguage;  // Current language
  setLocale: (locale: SupportedLanguage) => void;  // Language change function
  t: Locale;  // Translation object
}
```

#### 2. useTranslation Hook (`src/hooks/useTranslation.ts`)

A custom hook for easily retrieving translation text:

```typescript
const { t, locale, setLocale } = useTranslation();
```

#### 3. Type Definitions (`src/types/locale.d.ts`)

Ensures TypeScript type safety:

```typescript
export type Locale = typeof ja;  // Define ja.json structure as a type
export type SupportedLanguage = 'ja';  // List of supported languages
export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['ja'] as const;
```

---

## How to Add a New Language {#how-to-add-a-new-language-en}

### Step 1: Create Translation File

1. Copy `src/locales/en.json.example` to create a new language file:

```bash
# For English
cp src/locales/en.json.example src/locales/en.json

# For Simplified Chinese
cp src/locales/en.json.example src/locales/zh-CN.json
```

2. Translate all text in the new file. **Make sure to maintain the same JSON structure as ja.json.**

### Step 2: Update Type Definitions

Edit `src/types/locale.d.ts` and add the new language code:

```typescript
// Before
export type SupportedLanguage = 'ja';
export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['ja'] as const;

// After (adding English)
export type SupportedLanguage = 'ja' | 'en';
export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['ja', 'en'] as const;
```

### Step 3: Update LocaleContext

Edit `src/context/LocaleContext.tsx` and add import and switch statement for the new language:

```typescript
// 1. Add import at the top of the file
import ja from '../locales/ja.json';
import en from '../locales/en.json';  // Add

// 2. Update switch statement in loadTranslations function
const loadTranslations = async () => {
  try {
    let newTranslations: Locale;
    switch (locale) {
      case 'ja':
        newTranslations = ja;
        break;
      case 'en':  // Add
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

### Step 4: Add Language Switcher UI (Optional)

To add language switching buttons:

```tsx
// Example: App.tsx or dedicated language switcher component
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

## How to Add Translation Keys {#how-to-add-translation-keys-en}

When adding new screens or features, here's how to add translation keys:

### Step 1: Add to Translation Files

Add the same key to all language files (`ja.json`, `en.json`, etc.):

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

### Step 2: Use in Component

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

### Step 3: TypeScript Type Checking

TypeScript automatically performs type checking, so referencing a non-existent key will result in a compile error:

```typescript
// ✅ Correct
t.newFeature.title

// ❌ Error (non-existent key)
t.newFeature.nonExistentKey  // TypeScript error!
```

---

## Developer Usage Guide {#developer-usage-guide-en}

### Basic Usage

```tsx
import { useTranslation } from '../hooks/useTranslation';

const MyComponent: React.FC = () => {
  const { t } = useTranslation();
  
  return <h1>{t.title.mainTitle}</h1>;
};
```

### Getting Language Information

```tsx
const { t, locale } = useTranslation();

console.log(locale);  // 'ja' or 'en' etc.
console.log(t.title.mainTitle);  // Text in current language
```

### Switching Languages

```tsx
const { setLocale } = useTranslation();

// Switch to English
setLocale('en');
```

### Dynamic Text

For text with variables, use template literals:

```tsx
// Translation file
{
  "greeting": {
    "hello": "Hello"
  }
}

// Component
const userName = "Taro";
const greeting = `${t.greeting.hello}, ${userName}!`;
// Result: "Hello, Taro!"
```

### Mapping Arrays and Objects

```tsx
const assetTypes = useMemo(() => [
  { key: 'face', label: t.settings.faceLabel },
  { key: 'frontHair', label: t.settings.frontHairLabel },
  { key: 'backHair', label: t.settings.backHairLabel },
], [t]);

return (
  <ul>
    {assetTypes.map(({ key, label }) => (
      <li key={key}>{label}</li>
    ))}
  </ul>
);
```

---

## Best Practices {#best-practices-en}

### 1. Translation File Structure

- **Logical Grouping**: Group keys by feature or screen
- **Consistent Naming**: Use camelCase (e.g., `mainTitle`, `startBtn`)
- **Separate Common Text**: Place common text in the `common` section

```json
{
  "common": {
    "next": "Next",
    "cancel": "Cancel",
    "save": "Save"
  },
  "specificFeature": {
    "title": "Feature Title",
    "description": "Description"
  }
}
```

### 2. Translation Key Naming Conventions

- **Descriptive Names**: Use `startBtn` instead of `btn1`
- **Include Context**: Use `pageTitle` instead of just `title`
- **Use Verbs**: Use verbs for buttons (`save`, `delete`, `upload`)

### 3. Leverage Type Safety

- Always use the `t` object instead of hardcoding strings
- Leverage TypeScript's autocomplete and error checking

```tsx
// ✅ Recommended
<h1>{t.title.mainTitle}</h1>

// ❌ Not recommended (hardcoding)
<h1>Aira PJ</h1>
```

### 4. Default Language Setup

- Keep `ja.json` always up-to-date and complete
- Create other language files based on `ja.json`

### 5. Performance Optimization

- Use `useMemo` to prevent regeneration of arrays or objects that depend on translation keys

```tsx
const assetTypes = useMemo(() => [
  { key: 'face', label: t.settings.faceLabel },
  // ...
], [t]);
```

---

## Troubleshooting {#troubleshooting-en}

### Issue: TypeScript Error "Property does not exist"

**Cause**: Translation key doesn't exist in all language files

**Solution**:
1. Add the same key to all language files (ja.json, en.json, etc.)
2. Check the type definition file (`locale.d.ts`)

### Issue: Translations Not Displayed

**Cause 1**: `LocaleProvider` is not placed high enough in the component tree

**Solution**: Check `LocaleProvider` in `App.tsx`

```tsx
// App.tsx
return (
  <LocaleProvider>
    <PartsProvider>
      {/* Other components */}
    </PartsProvider>
  </LocaleProvider>
);
```

**Cause 2**: Using `useTranslation` outside of `LocaleProvider`

**Solution**: Ensure the component is a descendant of `LocaleProvider`

### Issue: Language Switch Not Saved

**Cause**: localStorage is disabled or browser is in private mode

**Solution**:
- Check browser localStorage settings
- Disable private mode

### Issue: Build Error "Cannot find module"

**Cause**: New translation file is not imported

**Solution**: Add import statement to `LocaleContext.tsx`

```typescript
import en from '../locales/en.json';
```

---

## Summary

By following this guide, you can add new languages to AiraPJ and effectively manage multilingualization.

### Checklist

Checklist when adding a new language:

- [ ] Create `src/locales/<lang>.json` file
- [ ] Update `SupportedLanguage` type and `SUPPORTED_LANGUAGES` array in `src/types/locale.d.ts`
- [ ] Add import statement to `src/context/LocaleContext.tsx`
- [ ] Update `loadTranslations` function in `LocaleContext.tsx`
- [ ] Add language switcher UI (optional)
- [ ] Verify text displays correctly on all pages

---

**Last Updated**: 2025-12-19
