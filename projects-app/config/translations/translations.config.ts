// config/translations/translations.config.ts

import { ALL_LANGUAGE_METADATA } from "./language-metadata";
import type { LanguageMetadata } from "./language-metadata";
export type { LanguageMetadata } from "./language-metadata";

// ============================================================================
// LANGUAGE METADATA - Complete database of all possible languages
// ============================================================================


// ============================================================================
// SUPPORTED LANGUAGES PARSER
// ============================================================================

const parseSupportedLanguages = (): readonly string[] => {
  const envLangs = process.env.NEXT_PUBLIC_SUPPORTED_LANGUAGES?.trim();

  if (!envLangs) {
    console.warn(
      '⚠️  NEXT_PUBLIC_SUPPORTED_LANGUAGES not set in .env. Using default: ["en"]'
    );
    return ["en"] as const;
  }

  const langs = envLangs
    .split(",")
    .map((lang) => lang.trim().toLowerCase())
    .filter((lang) => lang.length > 0);

  if (langs.length === 0) {
    console.warn(
      '⚠️  NEXT_PUBLIC_SUPPORTED_LANGUAGES is empty. Using default: ["en"]'
    );
    return ["en"] as const;
  }

  return langs as readonly string[];
};

/**
 * All supported languages from environment variable
 * Used for generateStaticParams in app/[lang]/layout.tsx
 */
export const SUPPORTED_LANGUAGES = parseSupportedLanguages() as readonly [
  string,
  ...string[],
];

/**
 * True when only one language is configured.
 * In this mode proxy.ts rewrites URLs to hide the lang segment.
 * URLs look like /about instead of /en/about.
 */
export const SINGLE_LANG_MODE = SUPPORTED_LANGUAGES.length === 1;

/**
 * Type representing a valid language code
 */
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

/**
 * Translation entry type - maps language codes to translated strings
 */
export type TranslationEntry = {
  [K in SupportedLanguage]: string;
};

/**
 * Translations object type - maps translation keys to language entries
 */
export type Translations = {
  [key: string]: TranslationEntry;
};

/**
 * Default language from environment variable
 * Falls back to 'en' if not configured or invalid
 */
export const DEFAULT_LANGUAGE: SupportedLanguage = (() => {
  const envLang = process.env.NEXT_PUBLIC_DEFAULT_LOCALE?.trim().toLowerCase();

  if (!envLang) {
    console.warn(
      '⚠️  NEXT_PUBLIC_DEFAULT_LOCALE not set in .env. Using default: "en"'
    );
    return "en" as SupportedLanguage;
  }

  if (!SUPPORTED_LANGUAGES.includes(envLang)) {
    console.warn(
      `⚠️  DEFAULT_LOCALE "${envLang}" is not in SUPPORTED_LANGUAGES. Using first supported: "${SUPPORTED_LANGUAGES[0]}"`
    );
    return SUPPORTED_LANGUAGES[0] as SupportedLanguage;
  }

  return envLang as SupportedLanguage;
})();

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Validate if a string is a supported language code
 */
export function isSupportedLanguage(lang: string): lang is SupportedLanguage {
  return SUPPORTED_LANGUAGES.includes(lang as SupportedLanguage);
}

/**
 * Get language label for UI display (English name)
 */
export function getLanguageLabel(lang: SupportedLanguage): string {
  const metadata = ALL_LANGUAGE_METADATA[lang];
  return metadata?.englishName || lang.toUpperCase();
}

/**
 * Get language native name (in its own language)
 */
export function getLanguageNativeName(lang: SupportedLanguage): string {
  const metadata = ALL_LANGUAGE_METADATA[lang];
  return metadata?.nativeName || lang;
}

/**
 * Get metadata for a specific language
 * Returns undefined if language metadata is not defined
 */
export function getLanguageMetadata(
  lang: string
): LanguageMetadata | undefined {
  return ALL_LANGUAGE_METADATA[lang];
}

/**
 * Get all available languages with full metadata
 * Only returns languages that are:
 * 1. Enabled in NEXT_PUBLIC_SUPPORTED_LANGUAGES
 * 2. Have metadata defined in ALL_LANGUAGE_METADATA
 */
export function getAvailableLanguages(): LanguageMetadata[] {
  return SUPPORTED_LANGUAGES.map((code) => ALL_LANGUAGE_METADATA[code]).filter(
    (metadata): metadata is LanguageMetadata => metadata !== undefined
  );
}

/**
 * Get flag emoji for a language
 */
export function getLanguageFlag(lang: SupportedLanguage): string {
  const metadata = ALL_LANGUAGE_METADATA[lang];
  return metadata?.flag || "🌐";
}
