// Preset finance categories (step 207) — FIXED 10 income + 10 expense (not user-editable yet, owner
// decision). The model segments a money movement into one OR MORE of these (multi-flag); unknown ids
// are dropped and an empty result falls back to the kind's "other_*". Labels are bilingual (ru/en);
// the ru label is the primary one the Telegram automation speaks.
export type FinanceKind = "income" | "expense";
export type FinanceCategory = { id: string; kind: FinanceKind; ru: string; en: string };

export const FINANCE_CATEGORIES: FinanceCategory[] = [
  // ── Income (10) ──
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
  // ── Expense (10) ──
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

export const INCOME_CATEGORIES = FINANCE_CATEGORIES.filter((c) => c.kind === "income");
export const EXPENSE_CATEGORIES = FINANCE_CATEGORIES.filter((c) => c.kind === "expense");

const BY_ID = new Map(FINANCE_CATEGORIES.map((c) => [c.id, c]));

// Keep only valid ids for the given kind; empty → the kind's "other_*". Used when persisting the
// model's segmentation (multi-flag) so a bad/hallucinated id can never enter the ledger.
export function normalizeCategories(kind: FinanceKind, ids: unknown): string[] {
  const arr = Array.isArray(ids) ? ids.map(String) : [];
  const valid = arr.filter((id) => BY_ID.get(id)?.kind === kind);
  const uniq = Array.from(new Set(valid));
  return uniq.length ? uniq : [kind === "income" ? "other_income" : "other_expense"];
}

export function categoryLabel(id: string, lang: "ru" | "en" = "ru"): string {
  const c = BY_ID.get(id);
  return c ? c[lang] : id;
}
