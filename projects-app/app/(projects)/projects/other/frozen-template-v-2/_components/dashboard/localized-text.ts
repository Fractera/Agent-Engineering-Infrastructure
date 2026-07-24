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

/** Resolve a NODE ERROR message (step 243.4). A node's thrown `Error.message` is normally a plain string
 *  (a real automation's own code, in whatever language its author used — never forced to translate). The
 *  frozen starter's OWN nodes may instead throw `JSON.stringify({en, ru, ...})` — a LocalizedText payload —
 *  when the message is our own default content and rule 4г applies. This tries that shape first and falls
 *  back to the raw string untouched, so ANY node's plain-string error keeps working exactly as before. */
export function resolveErrorText(raw: string | undefined, lang: string): string {
  if (!raw) return "";
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      const values = Object.values(parsed as Record<string, unknown>);
      if (values.length && values.every((v) => typeof v === "string")) {
        return resolveLocalized(parsed as Record<string, string>, lang);
      }
    }
  } catch { /* not JSON — a plain error message, use it as-is */ }
  return raw;
}
