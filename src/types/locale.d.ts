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
 * Type for translation keys (for dynamic access)
 */
export type TranslationKeys = keyof Locale;
