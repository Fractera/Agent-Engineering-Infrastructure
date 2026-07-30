// ФУНКЦИЯ УЗЛА «LOGIC» (transform) — ЗАВЕДЕНИЕ ИЗМЕРЕНИЯ (шаг 310, узловой навык). Фраза владельца «давай
// собирать отдельно расходы по дому и работе» → извлекает {field, label, values, question} строгим JSON,
// пишет измерение (`addDimension`) и кладёт `ctx.dimensionAdded` для подтверждения в чат. С этого момента
// дашборд рисует по нему колонку, а `dimensionTag` уточняет значение у каждой траты.
// Само-гейт `dimension`. Мусор модели (нет ясной пары field+values) → не пишем (не портим структуру).
// Имя `defineDimension` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { askModel } from "../ai";
import { servesIntent } from "../message";
import { addDimension } from "../components/conversation/dimensions";

const SYSTEM =
  `The owner wants to START SPLITTING expenses by a new attribute. Extract it as STRICT JSON and nothing ` +
  `else: {"field":"<short machine key, latin lowercase, e.g. scope>","label":"<human label in the owner's ` +
  `language, e.g. Назначение>","values":["<value1>","<value2>",...],"question":"<a short question to ask ` +
  `which value a spend belongs to, in the owner's language>"}. Example: "давай собирать отдельно расходы ` +
  `по дому и работе" → {"field":"scope","label":"Тип расхода","values":["дом","работа"],"question":"Это ` +
  `по дому или по работе?"}. If there is no clear attribute with at least two values, output {}. JSON only.`;

function extractJson(raw: string): Record<string, unknown> | null {
  const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
  if (s < 0 || e <= s) return null;
  try { return JSON.parse(raw.slice(s, e + 1)) as Record<string, unknown>; } catch { return null; }
}

export async function defineDimension(ctx: NodeCtx): Promise<NodeCtx> {
  if (!servesIntent(ctx, "dimension")) return {}; // не про измерение — узел молчит
  const text = String(ctx.text ?? "").trim();
  if (!text) return { dimensionError: "nothing to define" };

  let raw: string | null;
  try { raw = await askModel({ system: SYSTEM, user: text, maxTokens: 120 }); }
  catch { return { dimensionError: "model refused" }; }
  if (raw === null) return { dimensionError: "model unavailable" };

  const j = extractJson(raw);
  const field = String(j?.field ?? "").trim();
  const label = String(j?.label ?? "").trim();
  const values = Array.isArray(j?.values) ? (j!.values as unknown[]).map((v) => String(v).trim()).filter(Boolean) : [];
  const question = String(j?.question ?? "").trim();
  if (!field || values.length < 2) return { dimensionError: "no clear attribute with values — not saved" };

  const dim = await addDimension(field, label, values, question);
  return { dimensionAdded: { field, label: label || field, values, isNew: Boolean(dim) } };
}
