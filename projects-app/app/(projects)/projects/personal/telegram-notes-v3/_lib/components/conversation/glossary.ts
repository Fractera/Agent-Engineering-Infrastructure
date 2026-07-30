// ПОЛЬЗОВАТЕЛЬСКИЙ ГЛОССАРИЙ (309, требование владельца) — словарь алиасов/сокращений владельца: «чеки
// SODO ADEJE — это Mercadona». Хранится СТРОКАМИ в таблице `glossary` (`rows.ts`), пополняется вручную
// (вкладка «Глоссарий») И автоматически (узел `defineGlossary` из сообщений-определений). Инжектится
// ПРЕАМБУЛОЙ в системный промпт КАЖДОГО модельного узла («в формате первого сообщения» — слова владельца),
// чтобы «сколько потратил в Меркадоне» находило чеки store=SODO ADEJE, а модель понимала сокращения.
import { addRow, listRows } from "../../rows";

export type GlossaryEntry = { id: string; term: string; meaning: string; source: "manual" | "auto"; createdAt: string };

/** Строки глоссария (свежие сверху), нормализованные. */
export async function listGlossary(): Promise<GlossaryEntry[]> {
  const rows = await listRows("glossary", Infinity);
  return rows
    .map((r) => ({
      id: r.id,
      term: String(r.term ?? "").trim(),
      meaning: String(r.meaning ?? "").trim(),
      source: (r.source === "auto" ? "auto" : "manual") as "manual" | "auto",
      createdAt: String(r.createdAt ?? ""),
    }))
    .filter((e) => e.term && e.meaning);
}

/** Преамбула для модели: «User's glossary (aliases): X = Y; …». Пустой словарь → "". */
export async function loadGlossary(): Promise<string> {
  const entries = await listGlossary();
  if (!entries.length) return "";
  const pairs = entries.map((e) => `${e.term} = ${e.meaning}`).join("; ");
  return `User's glossary (aliases/abbreviations — treat these as equal, expand them when answering): ${pairs}.`;
}

/** Добавить алиас (авто из прогона или вручную). Дубль по term (без регистра) не создаём. */
export async function addGlossary(term: string, meaning: string, source: "manual" | "auto"): Promise<GlossaryEntry | null> {
  const t = term.trim(), m = meaning.trim();
  if (!t || !m) return null;
  const existing = await listGlossary();
  if (existing.some((e) => e.term.toLowerCase() === t.toLowerCase() && e.meaning.toLowerCase() === m.toLowerCase())) return null;
  const row = await addRow("glossary", { term: t, meaning: m, source });
  return { id: row.id, term: t, meaning: m, source, createdAt: String(row.createdAt) };
}
