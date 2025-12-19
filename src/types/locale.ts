/**
 * Locale type definitions
 * 
 * These types ensure type safety when accessing translation keys
 */

// Import the actual locale structure from ja.json
import type ja from '../locales/ja.json';

/**
 * Type for the complete locale structure
 */
export type Locale = typeof ja;

/**
 * Supported languages
 * Add new language codes here when adding new translations
 */
export type SupportedLanguage = 'ja';
// Future: export type SupportedLanguage = 'ja' | 'en' | 'zh' | ...;

/**
 * Array of all supported languages
 * Used for validation and language selection
 */
export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['ja'] as const;
// Future: export const SUPPORTED_LANGUAGES: readonly SupportedLanguage[] = ['ja', 'en', 'zh'] as const;

/**
 * Type for translation keys (for dynamic access)
 */
export type TranslationKeys = keyof Locale;
