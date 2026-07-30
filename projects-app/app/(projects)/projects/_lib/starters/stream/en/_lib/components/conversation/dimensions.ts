// ЖИВАЯ СТРУКТУРА ТАБЛИЦЫ — ПОЛЬЗОВАТЕЛЬСКИЕ ИЗМЕРЕНИЯ (шаг 310, требование владельца). Владелец фразой
// «давай собирать отдельно расходы по дому и работе» заводит НОВОЕ измерение (поле) финансовой таблицы, и с
// этого момента ассистент уточняет, к какому значению отнести трату. Измерение — простая категориальная
// метка (НЕ полноценная аналитика; см. дисклеймер «это не бухгалтерия»): {field, label, values[], question}.
// Хранится СТРОКАМИ в таблице `finance-dimensions` (`rows.ts`) — источник истины; дашборд рисует по ней
// колонку, а `dimension-tag` спрашивает/проставляет значение на строке finance.
import { addRow, listRows } from "../../rows";
import { normalizeText } from "./dedupe";

export type Dimension = { id: string; field: string; label: string; values: string[]; question: string; createdAt: string };

/** Активные измерения (свежие сверху), нормализованные. */
export async function listDimensions(): Promise<Dimension[]> {
  const rows = await listRows("finance-dimensions", Infinity);
  return rows
    .map((r) => ({
      id: r.id,
      field: String(r.field ?? "").trim(),
      label: String(r.label ?? r.field ?? "").trim(),
      values: Array.isArray(r.values) ? (r.values as unknown[]).map((v) => String(v).trim()).filter(Boolean) : [],
      question: String(r.question ?? "").trim(),
      createdAt: String(r.createdAt ?? ""),
    }))
    .filter((d) => d.field && d.values.length);
}

/** Завести измерение (из фразы владельца). Дубль по field (без регистра) не создаём. */
export async function addDimension(field: string, label: string, values: string[], question: string): Promise<Dimension | null> {
  const f = field.trim();
  const vals = values.map((v) => v.trim()).filter(Boolean);
  if (!f || !vals.length) return null;
  const existing = await listDimensions();
  if (existing.some((d) => d.field.toLowerCase() === f.toLowerCase())) return null;
  const row = await addRow("finance-dimensions", { field: f, label: label.trim() || f, values: vals, question: question.trim() });
  return { id: row.id, field: f, label: label.trim() || f, values: vals, question: question.trim(), createdAt: String(row.createdAt) };
}

/** Определить значение измерения из текста (детерминированно, стем 4 симв.): «на ремонт дома» → «дом».
 *  Совпало ровно одно значение → оно; ноль или неоднозначно (≥2) → null (тогда спросим). */
export function inferValue(text: string, dim: Dimension): string | null {
  const t = normalizeText(text);
  const hits = dim.values.filter((v) => {
    const stem = normalizeText(v).slice(0, Math.max(3, Math.min(normalizeText(v).length, 4)));
    return stem && t.includes(stem);
  });
  return hits.length === 1 ? hits[0] : null;
}
