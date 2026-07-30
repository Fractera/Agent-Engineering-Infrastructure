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
import { telegramFileUrl } from "../transport";
import { normalizeCategories, categoryMenu, type FinanceKind } from "../../_data/finance-categories";

export type MoneyItem = { name: string; qty: number | null; price: number | null };
export type MoneyRecord = {
  kind: FinanceKind; amount: number | null; categories: string[]; summary: string;
  store: string; date: string; currency: string; items: MoneyItem[]; fullText: string;
};

// ПОЛНАЯ КОПИЯ ЧЕКА (309, требование владельца): извлекаем ВСЁ, что можно достать из чека — магазин, дату,
// валюту, КАЖДУЮ позицию с количеством и ценой, итог. Это нужно, чтобы память хранила чек полной копией и
// recall мог ответить «сколько я потратил на черешню» по конкретной позиции.
const systemPrompt = () =>
  `You digitize a money movement into STRICT JSON and nothing else — a COMPLETE copy of everything readable ` +
  `on the receipt. Output exactly one JSON object: {` +
  `"kind":"income"|"expense",` +
  `"store":"<merchant/store name, or "">",` +
  `"date":"<date on the receipt YYYY-MM-DD if present, else "">",` +
  `"currency":"<currency symbol or code, e.g. € or EUR>",` +
  `"items":[{"name":"<line item exactly as printed>","qty":<number or null>,"price":<line total number or null>}...],` +
  `"amount":<the receipt TOTAL as a number, the sum of line items>,` +
  `"categories":[<one or more ids>],` +
  `"summary":"<one short human sentence naming the store and main items>"}. ` +
  `Extract EVERY line item you can read — do not omit any. expense category ids: ${categoryMenu("expense")}. ` +
  `income category ids: ${categoryMenu("income")}. Pick only ids from that list. Use null for any number you ` +
  `cannot read. No prose, no markdown fences — JSON only.`;

/** Достаёт первый JSON-объект из ответа модели (модель иногда добавляет прозу/```-обёртку). */
function extractJson(raw: string): Record<string, unknown> | null {
  const s = raw.indexOf("{");
  const e = raw.lastIndexOf("}");
  if (s < 0 || e <= s) return null;
  try { return JSON.parse(raw.slice(s, e + 1)) as Record<string, unknown>; } catch { return null; }
}

const numOrNull = (v: unknown): number | null => {
  const n = typeof v === "number" ? v : Number(String(v ?? "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
};

/** Человекочитаемая ПОЛНАЯ копия чека — она уходит в векторную память, чтобы recall отвечал по позициям. */
function receiptFullText(r: Omit<MoneyRecord, "fullText">): string {
  const head = [r.store && `Store: ${r.store}`, r.date && `Date: ${r.date}`].filter(Boolean).join(" · ");
  const lines = r.items.map((it) => `- ${it.name}${it.qty != null ? ` ×${it.qty}` : ""}${it.price != null ? ` = ${it.price}${r.currency}` : ""}`);
  const total = r.amount != null ? `Total: ${r.amount}${r.currency}` : "";
  return [`Receipt (${r.kind}). ${head}`.trim(), ...lines, total].filter(Boolean).join("\n");
}

/** ДЕТЕРМИНИРОВАННАЯ нормализация ответа модели в запись — никакой веры «на слово». */
function toRecord(j: Record<string, unknown>, fallbackSummary: string): MoneyRecord {
  const kind: FinanceKind = j.kind === "income" ? "income" : "expense";
  const amount = numOrNull(j.amount);
  const categories = normalizeCategories(kind, j.categories);
  const summary = String(j.summary ?? "").trim() || fallbackSummary;
  const store = String(j.store ?? "").trim();
  const date = String(j.date ?? "").trim();
  const currency = String(j.currency ?? "").trim();
  const items: MoneyItem[] = Array.isArray(j.items)
    ? j.items.map((it) => {
        const o = (it && typeof it === "object" ? it : {}) as Record<string, unknown>;
        return { name: String(o.name ?? "").trim(), qty: numOrNull(o.qty), price: numOrNull(o.price) };
      }).filter((it) => it.name)
    : [];
  const base = { kind, amount, categories, summary, store, date, currency, items };
  return { ...base, fullText: receiptFullText(base) };
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
    // Больше токенов на выход: полная итемизация чека длиннее краткой сводки.
    raw = await askModelVision({ system: systemPrompt(), user: text || "Digitize this receipt fully, itemize everything.", imageUrl: url, maxTokens: 900 });
  } else {
    raw = await askModel({ system: systemPrompt(), user: text, maxTokens: 500 });
  }

  if (raw === null) return { financeUsed: false, financeError: "model unavailable — money not fabricated" };
  const j = extractJson(raw);
  if (!j) return { financeUsed: false, financeError: "model reply was not JSON" };

  const finance = toRecord(j, fallbackSummary);
  // Сводка — в `text` (подтверждение). ПОЛНАЯ КОПИЯ чека (`financeMemory`) — для векторной памяти:
  // deliverVectorMemory предпочтёт её, чтобы recall отвечал по позициям («сколько на черешню»).
  return { finance, financeUsed: true, text: finance.summary, financeMemory: finance.fullText };
}
