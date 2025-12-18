import React, { createContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Locale, SupportedLanguage } from '../types/locale';
import ja from '../locales/ja.json';

interface LocaleContextType {
  locale: SupportedLanguage;
  setLocale: (locale: SupportedLanguage) => void;
  t: Locale;
}

export const LocaleContext = createContext<LocaleContextType | undefined>(undefined);

interface LocaleProviderProps {
  children: ReactNode;
}

export const LocaleProvider: React.FC<LocaleProviderProps> = ({ children }) => {
  // ブラウザの言語設定またはlocalStorageから初期言語を取得
  const getInitialLocale = (): SupportedLanguage => {
    const stored = localStorage.getItem('locale') as SupportedLanguage | null;
    if (stored && ['ja'].includes(stored)) {
      return stored;
    }
    // デフォルトは日本語
    return 'ja';
  };

  const [locale, setLocaleState] = useState<SupportedLanguage>(getInitialLocale);
  const [translations, setTranslations] = useState<Locale>(ja);

  // 言語変更時に翻訳データを読み込み
  useEffect(() => {
    const loadTranslations = async () => {
      try {
        let newTranslations: Locale;
        switch (locale) {
          case 'ja':
          default:
            newTranslations = ja;
            break;
        }
        setTranslations(newTranslations);
        localStorage.setItem('locale', locale);
      } catch (error) {
        console.error('Failed to load translations:', error);
        // フォールバック
        setTranslations(ja);
      }
    };
    loadTranslations();
  }, [locale]);

  const setLocale = (newLocale: SupportedLanguage) => {
    setLocaleState(newLocale);
  };

  return (
    <LocaleContext.Provider value={{ locale, setLocale, t: translations }}>
      {children}
    </LocaleContext.Provider>
  );
};
