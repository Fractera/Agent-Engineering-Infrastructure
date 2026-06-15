import type { SupportedLanguage } from "@/config/translations/translations.config"
import type { FooterTranslationKey, FooterTranslations } from "./footer-enum.translations"
import translationsData from "./footer-translation.json"

type RawEntry = { key: FooterTranslationKey; translations: Record<string, string> }
type RawData = Record<string, RawEntry>

export async function getFooterTranslation(
  lang: SupportedLanguage
): Promise<FooterTranslations> {
  const data = translationsData as unknown as RawData
  const result: Partial<FooterTranslations> = {}
  for (const id in data) {
    const entry = data[id]
    result[entry.key] = entry.translations[lang] ?? entry.translations["en"] ?? entry.key
  }
  return result as FooterTranslations
}

export function useFooterTranslation(
  translations: FooterTranslations
): (key: FooterTranslationKey) => string {
  return (key) => translations[key] ?? key
}

export const FOOTER_TRANSLATIONS_EN: FooterTranslations = {
  "footer.go_home": "Go to home",
  "footer.footer_pages": "Footer pages",
  "footer.lang_switch": "Switch language",
  "footer.lang_search": "Search language...",
  "footer.lang_not_found": "No languages found",
  "footer.lang_dialog_title": "Switch language?",
  "footer.lang_dialog_desc": "All open tabs will reset to their default state.",
  "footer.cancel": "Cancel",
  "footer.continue": "Continue",
  "footer.content_not_found": "Content not found",
  "footer.add_page": "Add page",
  "footer.edit_page": "Edit page",
  "footer.delete_page": "Delete page",
  "footer.label": "Label",
  "footer.add": "Add",
  "footer.save": "Save",
  "footer.delete": "Delete",
  "footer.use_redirect": "Use redirect",
  "footer.save_redirect": "Save redirect",
  "footer.ai_hint": "Generate page content with AI. Copy the instruction, paste into your AI chat, then paste the JSON response back here.",
  "footer.page_content_html": "Page content (HTML)",
  "footer.save_content": "Save content",
  "footer.add_page_ai": "Add page with AI",
  "footer.width_toggle": "Toggle center width",
}
