// LOCALIZED TEXT (step 243.2) — a plain string stays valid (a real automation's coding agent writes its
// content in ONE language, the owner's — never forced to translate); a `{en, ru, ...}` map is used where WE
// author the content ourselves and must ship it in all ten (the frozen starter's own default content:
// activation title/description/param labels, dashboard table titles/headers). Two-letter language keys,
// same convention as every `*-i18n.ts` dictionary (`useUiLang()`'s value, sliced to 2 chars).
export type LocalizedText = string | Record<string, string>;

/** Resolve a LocalizedText for the current language: exact match → English → first available → "". */
export function resolveLocalized(text: LocalizedText | undefined, lang: string): string {
  if (!text) return "";
  if (typeof text === "string") return text;
  const key = lang.slice(0, 2);
  return text[key] ?? text.en ?? Object.values(text)[0] ?? "";
}
