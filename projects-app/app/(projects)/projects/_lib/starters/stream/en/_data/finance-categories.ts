// Пресет финансовых категорий (перенос из v1 telegram-notes, шаг 207 → frozen-стартер, шаг 308.3).
// ФИКСИРОВАННЫЕ 10 доход + 10 расход. Модель сегментирует движение денег в одну ИЛИ несколько (мульти-
// флаг); неизвестные id отбрасываются, пустой результат → «other_*» своего вида. Метки двуязычны (ru/en);
// сам матчинг идёт по id, метки — для отображения. Данные, не логика (закон 2): новая категория = строка.
export type FinanceKind = "income" | "expense";
export type FinanceCategory = { id: string; kind: FinanceKind; ru: string; en: string };

export const FINANCE_CATEGORIES: FinanceCategory[] = [
  // ── Доход (10) ──
  { id: "main",         kind: "income",  ru: "Основной доход",     en: "Main income (salary)" },
  { id: "sponsorship",  kind: "income",  ru: "Спонсорство",        en: "Sponsorship" },
  { id: "sidegig",      kind: "income",  ru: "Подработка",         en: "Side gig" },
  { id: "sale",         kind: "income",  ru: "Продажа",            en: "Sale" },
  { id: "investment",   kind: "income",  ru: "Инвестиции",         en: "Investments / dividends" },
  { id: "loan",         kind: "income",  ru: "Кредит / займ",      en: "Loan / credit" },
  { id: "gift",         kind: "income",  ru: "Подарок",            en: "Gift" },
  { id: "debt_return",  kind: "income",  ru: "Возврат долга",      en: "Debt returned" },
  { id: "refund",       kind: "income",  ru: "Возврат / кэшбэк",   en: "Refund / cashback" },
  { id: "other_income", kind: "income",  ru: "Прочий доход",       en: "Other income" },
  // ── Расход (10) ──
  { id: "food",          kind: "expense", ru: "Питание",            en: "Food" },
  { id: "equipment",     kind: "expense", ru: "Оборудование",       en: "Equipment" },
  { id: "leisure",       kind: "expense", ru: "Отдых",              en: "Leisure / entertainment" },
  { id: "transport",     kind: "expense", ru: "Транспорт",          en: "Transport" },
  { id: "housing",       kind: "expense", ru: "Жильё / аренда",     en: "Housing / rent" },
  { id: "health",        kind: "expense", ru: "Здоровье",           en: "Health" },
  { id: "clothing",      kind: "expense", ru: "Одежда",             en: "Clothing" },
  { id: "subscriptions", kind: "expense", ru: "Подписки",           en: "Subscriptions / services" },
  { id: "education",     kind: "expense", ru: "Образование",        en: "Education" },
  { id: "other_expense", kind: "expense", ru: "Прочие расходы",     en: "Other expenses" },
];

const BY_ID = new Map(FINANCE_CATEGORIES.map((c) => [c.id, c]));

/** Оставить только валидные id заданного вида; пусто → «other_*» вида. Так галлюцинация модели не войдёт в реестр. */
export function normalizeCategories(kind: FinanceKind, ids: unknown): string[] {
  const arr = Array.isArray(ids) ? ids.map(String) : [];
  const valid = arr.filter((id) => BY_ID.get(id)?.kind === kind);
  const uniq = Array.from(new Set(valid));
  return uniq.length ? uniq : [kind === "income" ? "other_income" : "other_expense"];
}

/** Компактный перечень «id: en» для промпта модели — закрытый словарь, из которого она выбирает. */
export function categoryMenu(kind: FinanceKind): string {
  return FINANCE_CATEGORIES.filter((c) => c.kind === kind).map((c) => `${c.id} (${c.en})`).join(", ");
}
