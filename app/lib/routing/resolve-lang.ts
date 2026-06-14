import {
  SUPPORTED_LANGUAGES,
  DEFAULT_LANGUAGE,
} from "@/config/translations/translations.config";

/**
 * Validate the lang from params and return a correct language code.
 * Call ONCE at the page.tsx / default.tsx level and pass the result (validLang)
 * down as a prop.
 *
 * Priority:
 *   1. lang from params — if it is in SUPPORTED_LANGUAGES
 *   2. DEFAULT_LANGUAGE from env (NEXT_PUBLIC_DEFAULT_LOCALE)
 *   3. 'en' — hard fallback
 */
export function resolveLang(lang: string): string {
  if (SUPPORTED_LANGUAGES.includes(lang)) return lang;
  if (SUPPORTED_LANGUAGES.includes(DEFAULT_LANGUAGE)) return DEFAULT_LANGUAGE;
  return "en";
}
