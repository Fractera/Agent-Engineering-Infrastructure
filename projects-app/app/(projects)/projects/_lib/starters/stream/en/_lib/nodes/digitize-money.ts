// ФУНКЦИЯ УЗЛА «LOGIC» (transform) — ОЦИФРОВКА ДЕНЕГ (шаг 308.3, узловой навык). Превращает чек-ФОТО
// или слова о трате/доходе в структурированную запись `{kind, amount, categories, summary, items}`.
// Паритет v1 (шаг 207, узел parse-document): фото → ОДИН vision-вызов даёт позиции и сумму (пирожок 5.50
// + кофе 2.00 → 7.00), слова → та же модель по тексту. Категории — из ФИКСИРОВАННОГО пресета 10+10
// (`_data/finance-categories`, мульти-флаг), галлюцинация id отбрасывается `normalizeCategories`.
//
// САМО-ГЕЙТ (308.0): узел работает только когда `finance` в `ctx.intent`; иначе пропускает поток без
// изменений (`{}`), не мешая другим веткам. Три исхода (закон): это СВОЙ КОД платформы (не внешний
// инструмент). Модель недоступна/нет ключа → мягкая деградация (`financeUsed:false`, факт не выдумываем);
// провайдер отверг (vision-модель не выбрана и т.п.) → бросок пробрасывается наверх честно.
// Имя `digitizeMoney` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";
import { askModel, askModelVision } from "../ai";
import { servesIntent } from "../message";
import { normalizeCategories, categoryMenu, type FinanceKind } from "../../_data/finance-categories";

export type MoneyRecord = { kind: FinanceKind; amount: number | null; categories: string[]; summary: string; items: string[] };

const systemPrompt = () =>
  `You digitize a money movement into STRICT JSON and nothing else. Output exactly one JSON object: ` +
  `{"kind":"income"|"expense","amount":<number in the receipt's main currency, the SUM of line items when itemized>,` +
  `"categories":[<one or more ids>],"summary":"<short human summary incl. item names>","items":[<"name price" strings>]}. ` +
  `expense category ids: ${categoryMenu("expense")}. income category ids: ${categoryMenu("income")}. ` +
  `Pick only ids from that list. If you cannot read an amount, use null. No prose, no markdown fences — JSON only.`;

/** Достаёт первый JSON-объект из ответа модели (модель иногда добавляет прозу/```-обёртку). */
function extractJson(raw: string): Record<string, unknown> | null {
  const s = raw.indexOf("{");
  const e = raw.lastIndexOf("}");
  if (s < 0 || e <= s) return null;
  try { return JSON.parse(raw.slice(s, e + 1)) as Record<string, unknown>; } catch { return null; }
}

/** ДЕТЕРМИНИРОВАННАЯ нормализация ответа модели в запись — никакой веры «на слово». */
function toRecord(j: Record<string, unknown>, fallbackSummary: string): MoneyRecord {
  const kind: FinanceKind = j.kind === "income" ? "income" : "expense";
  const amtRaw = typeof j.amount === "number" ? j.amount : Number(String(j.amount ?? "").replace(",", "."));
  const amount = Number.isFinite(amtRaw) ? amtRaw : null;
  const categories = normalizeCategories(kind, j.categories);
  const summary = String(j.summary ?? "").trim() || fallbackSummary;
  const items = Array.isArray(j.items) ? j.items.map(String).map((s) => s.trim()).filter(Boolean) : [];
  return { kind, amount, categories, summary, items };
}

/** Временный file-URL картинки из Telegram getFile (для vision). Токен — общий ключ сервиса (как у доставки). */
async function telegramFileUrl(fileId: string): Promise<string | null> {
  const token = (process.env.TELEGRAM_BOT_TOKEN ?? "").trim();
  if (!token) return null;
  try {
    const r = await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(fileId)}`, { signal: AbortSignal.timeout(15_000) });
    const d = (await r.json().catch(() => null)) as { ok?: boolean; result?: { file_path?: string } } | null;
    const path = d?.ok ? d.result?.file_path : undefined;
    return path ? `https://api.telegram.org/file/bot${token}/${path}` : null;
  } catch {
    return null;
  }
}

export async function digitizeMoney(ctx: NodeCtx): Promise<NodeCtx> {
  if (!servesIntent(ctx, "finance")) return {}; // не финансовое намерение — ветка молчит, поток идёт дальше

  const text = String(ctx.text ?? "").trim();
  const photoFileId = String(ctx.photoFileId ?? "").trim();
  if (!text && !photoFileId) return { financeUsed: false, financeError: "nothing to digitize (no text, no photo)" };

  const fallbackSummary = text || "Receipt photo";
  let raw: string | null;

  if (photoFileId) {
    const url = await telegramFileUrl(photoFileId);
    if (!url) return { financeUsed: false, financeError: "receipt photo unreachable (no bot token or getFile failed)" };
    raw = await askModelVision({ system: systemPrompt(), user: text || "Digitize this receipt.", imageUrl: url, maxTokens: 400 });
  } else {
    raw = await askModel({ system: systemPrompt(), user: text, maxTokens: 400 });
  }

  if (raw === null) return { financeUsed: false, financeError: "model unavailable — money not fabricated" };
  const j = extractJson(raw);
  if (!j) return { financeUsed: false, financeError: "model reply was not JSON" };

  const finance = toRecord(j, fallbackSummary);
  // Сводка кладётся в text (подтверждение/память её увидят); полный оригинал — если был — не трогаем.
  return { finance, financeUsed: true, text: finance.summary };
}
