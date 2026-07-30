// ФУНКЦИЯ УЗЛА «LOGIC» (transform) — ОПРЕДЕЛЕНИЕ АЛИАСА (309, узловой навык). Сообщение-определение
// («запомни, что чеки SODO ADEJE — это Меркадона», «X значит Y») → извлекает пару term→meaning МОДЕЛЬЮ со
// строгим форматом, СРАЗУ пишет строку в глоссарий (`addRow`, source auto) и кладёт `ctx.glossaryAdded`
// для подтверждения в чат («✅ запомнил: X = Y»). Это НЕ заметка (закон 309: определение алиаса ≠ факт).
// Само-гейт `glossary`. Мусор модели (нет чёткой пары) → не пишем (не портим словарь), честный флаг.
// Имя `defineGlossary` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { askModel } from "../ai";
import { servesIntent } from "../message";
import { addGlossary } from "../components/conversation/glossary";

const SYSTEM =
  `The user is defining an ALIAS/abbreviation. Extract the pair as STRICT JSON and nothing else: ` +
  `{"term":"<the short form / what appears on data, e.g. a store name on a receipt>","meaning":"<the full/` +
  `canonical name the user means>"}. Example: "remember that receipts SODO ADEJE are Mercadona" → ` +
  `{"term":"SODO ADEJE","meaning":"Mercadona"}. If there is no clear alias pair, output {}. JSON only.`;

function extractJson(raw: string): Record<string, unknown> | null {
  const s = raw.indexOf("{"), e = raw.lastIndexOf("}");
  if (s < 0 || e <= s) return null;
  try { return JSON.parse(raw.slice(s, e + 1)) as Record<string, unknown>; } catch { return null; }
}

export async function defineGlossary(ctx: NodeCtx): Promise<NodeCtx> {
  if (!servesIntent(ctx, "glossary")) return {}; // не определение — узел молчит
  const text = String(ctx.text ?? "").trim();
  if (!text) return { glossaryError: "nothing to define" };

  let raw: string | null;
  try { raw = await askModel({ system: SYSTEM, user: text, maxTokens: 80 }); }
  catch { return { glossaryError: "model refused" }; }
  if (raw === null) return { glossaryError: "model unavailable" };

  const j = extractJson(raw);
  const term = String(j?.term ?? "").trim();
  const meaning = String(j?.meaning ?? "").trim();
  if (!term || !meaning) return { glossaryError: "no clear alias pair — not saved" };

  const entry = await addGlossary(term, meaning, "auto");
  // Структурный результат для composeReply/converse (режим записи → «✅ запомнил: X = Y»).
  return { glossaryAdded: { term, meaning, isNew: Boolean(entry) } };
}
