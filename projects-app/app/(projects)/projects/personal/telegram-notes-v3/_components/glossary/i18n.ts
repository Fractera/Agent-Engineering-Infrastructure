// Строки вкладки «Глоссарий» (кокпит). Основные ru/en; прочие → en-фолбэк.
type Dict = {
  subtitle: string; empty: string;
  term: string; meaning: string; source: string; auto: string; manual: string;
  add: string; termPh: string; meaningPh: string; del: string; confirmDelete: string;
};
const en: Dict = {
  subtitle: "Aliases you define — the assistant expands them everywhere (e.g. a store name → its brand).",
  empty: "No aliases yet. Add one, or just tell the bot: “remember that X is Y”.",
  term: "Term / abbreviation", meaning: "Means", source: "Source", auto: "auto", manual: "manual",
  add: "Add alias", termPh: "e.g. SODO ADEJE", meaningPh: "e.g. Mercadona", del: "Delete",
  confirmDelete: "Delete this alias?",
};
const ru: Dict = {
  subtitle: "Сокращения, которые вы задаёте — ассистент раскрывает их везде (напр. название магазина → бренд).",
  empty: "Алиасов пока нет. Добавьте, или просто скажите боту: «запомни, что X это Y».",
  term: "Термин / сокращение", meaning: "Означает", source: "Источник", auto: "авто", manual: "вручную",
  add: "Добавить алиас", termPh: "напр. SODO ADEJE", meaningPh: "напр. Mercadona", del: "Удалить",
  confirmDelete: "Удалить этот алиас?",
};
const BY: Record<string, Dict> = { en, ru };
export function glossaryStrings(lang: string): Dict {
  return BY[(lang || "en").toLowerCase().slice(0, 2)] ?? en;
}
