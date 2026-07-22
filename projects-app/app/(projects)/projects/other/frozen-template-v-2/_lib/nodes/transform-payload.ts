// ФУНКЦИЯ УЗЛА «LOGIC» (transform) — срединная работа: по тикеру берёт ЖИВУЮ цену акции.
// Реальный внешний вызов Yahoo Finance (без ключа, без AI, детерминированно). Нет цены → БРОСАЕТ:
// это и есть настоящий гейт успеха/провала — упавший прогон не доходит до записи (эталон v1 lookup-price).
//
// Контракт: (ctx) => частичный ctx. company/ticker уже в bag (их положил receiveRequest); сюда добавляем
// price/asOf. Имя `transformPayload` — публичный контракт, не переименовывать.
import type { NodeCtx } from "../executor";

const quoteUrl = (ticker: string) =>
  `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`;

const serviceError = (status: number) => ({
  en: `The quote service returned an error (${status}). Try again in a moment.`,
  es: `El servicio de cotizaciones devolvió un error (${status}). Inténtalo de nuevo.`,
  fr: `Le service de cotation a renvoyé une erreur (${status}). Réessayez plus tard.`,
  it: `Il servizio quotazioni ha restituito un errore (${status}). Riprova tra poco.`,
  ru: `Сервис котировок вернул ошибку (${status}). Попробуйте ещё раз.`,
  de: `Der Kursdienst gab einen Fehler zurück (${status}). Versuche es gleich erneut.`,
  pt: `O serviço de cotações retornou um erro (${status}). Tente novamente.`,
  pl: `Serwis notowań zwrócił błąd (${status}). Spróbuj ponownie.`,
  tr: `Fiyat servisi bir hata döndürdü (${status}). Birazdan tekrar deneyin.`,
  nl: `De koersdienst gaf een fout (${status}). Probeer het zo opnieuw.`,
});

const noPrice = {
  en: "No live price is available for this ticker right now.",
  es: "No hay precio en vivo disponible para este ticker ahora mismo.",
  fr: "Aucun cours en direct n'est disponible pour ce symbole pour le moment.",
  it: "Nessun prezzo in tempo reale disponibile per questo ticker al momento.",
  ru: "Живой цены по этому тикеру сейчас нет.",
  de: "Für dieses Kürzel ist derzeit kein Live-Kurs verfügbar.",
  pt: "Não há preço ao vivo disponível para este ticker agora.",
  pl: "Brak aktualnej ceny dla tego symbolu w tej chwili.",
  tr: "Bu sembol için şu anda canlı fiyat yok.",
  nl: "Er is momenteel geen live koers beschikbaar voor dit symbool.",
};

export async function transformPayload(ctx: NodeCtx): Promise<{ price: number; asOf: string }> {
  const ticker = String(ctx.ticker ?? "");
  const r = await fetch(quoteUrl(ticker), {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FracteraStockPriceLookup/1.0)" },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(JSON.stringify(serviceError(r.status)));
  const data = (await r.json().catch(() => null)) as
    | { chart?: { result?: Array<{ meta?: { regularMarketPrice?: unknown } }> } }
    | null;
  const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (typeof price !== "number") throw new Error(JSON.stringify(noPrice));
  return { price, asOf: new Date().toISOString() };
}
