import { createContext } from 'react';
import type { Locale, SupportedLanguage } from '../types/locale';

export interface LocaleContextType {
  locale: SupportedLanguage;
  setLocale: (locale: SupportedLanguage) => void;
  t: Locale;
}

export const LocaleContext = createContext<LocaleContextType | undefined>(undefined);
