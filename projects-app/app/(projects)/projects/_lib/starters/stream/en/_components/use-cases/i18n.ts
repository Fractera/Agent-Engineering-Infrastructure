// Строки РАНТАЙМ-вида кейсов — десять языков (закон 4г), англ. фолбэк. Живёт в папке автоматизации
// (закон 0). «Пока без описания» скопировано дословно из v1 `_shared/use-cases-i18n.ts` (`noDescription`).
const NO_DESC: Record<string, string> = {
  en: "No description yet.", ru: "Пока без описания.", es: "Aún sin descripción.",
  fr: "Pas encore de description.", it: "Ancora nessuna descrizione.", de: "Noch keine Beschreibung.",
  pt: "Ainda sem descrição.", pl: "Jeszcze bez opisu.", tr: "Henüz açıklama yok.", nl: "Nog geen beschrijving.",
};

export function noDescription(lang: string): string {
  return NO_DESC[lang.toLowerCase().slice(0, 2)] ?? NO_DESC.en;
}

// Заголовок секции — дословно v1 `_shared/use-cases-i18n.ts` (`sectionTitle`).
const SECTION_TITLE: Record<string, string> = {
  en: "Use cases", ru: "Пользовательские кейсы", es: "Casos de uso", fr: "Cas d'usage",
  it: "Casi d'uso", de: "Anwendungsfälle", pt: "Casos de uso", pl: "Przypadki użycia",
  tr: "Kullanım senaryoları", nl: "Use cases",
};

export function useCasesSectionTitle(lang: string): string {
  return SECTION_TITLE[lang.toLowerCase().slice(0, 2)] ?? SECTION_TITLE.en;
}
