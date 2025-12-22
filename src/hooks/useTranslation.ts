import { useContext } from 'react';
import { LocaleContext } from '../context/LocaleContext';

/**
 * 翻訳テキストを取得するためのカスタムフック
 * 
 * @returns {object} 翻訳オブジェクトと言語設定関数
 * @example
 * ```tsx
 * const { t, locale, setLocale } = useTranslation();
 * return <h1>{t.title.mainTitle}</h1>;
 * ```
 */
export const useTranslation = () => {
  const context = useContext(LocaleContext);
  if (!context) {
    throw new Error('useTranslation must be used within LocaleProvider');
  }
  return context;
};
