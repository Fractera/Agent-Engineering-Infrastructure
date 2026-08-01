// Строки вкладки «Финансы» (кокпит). Основные ru/en; прочие языки → en-фолбэк.
type Dict = {
  subtitle: string; empty: string;
  date: string; type: string; income: string; expense: string; amount: string;
  categories: string; summary: string; receipt: string; del: string; confirmDelete: string; open: string;
  total: string; totalIncome: string; totalExpense: string;
};
const en: Dict = {
  subtitle: "Money movements recorded from receipts and messages.", empty: "No records yet.",
  date: "Date", type: "Type", income: "Income", expense: "Expense", amount: "Amount",
  categories: "Categories", summary: "Summary", receipt: "Receipt", del: "Delete",
  confirmDelete: "Delete this record?", open: "open",
  total: "Total", totalIncome: "income", totalExpense: "expense",
};
const ru: Dict = {
  subtitle: "Движения денег, учтённые из чеков и сообщений.", empty: "Записей пока нет.",
  date: "Дата", type: "Тип", income: "Доход", expense: "Расход", amount: "Сумма",
  categories: "Категории", summary: "Описание", receipt: "Чек", del: "Удалить",
  confirmDelete: "Удалить эту запись?", open: "открыть",
  total: "Итого", totalIncome: "доход", totalExpense: "расход",
};
const BY: Record<string, Dict> = { en, ru };
export function financeStrings(lang: string): Dict {
  return BY[(lang || "en").toLowerCase().slice(0, 2)] ?? en;
}
