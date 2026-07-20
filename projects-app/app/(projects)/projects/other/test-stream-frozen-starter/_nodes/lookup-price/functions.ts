import type { NodeFunction } from "../../_types/node-contract";

// STARTING PATTERN (step 243) — a plain external HTTP fetch, no AI. Deterministic, throws loudly on
// failure, never silently succeeds. ADAPT the endpoint/logic for the owner's real task — keep the shape:
// one clear external call, a typed return, a thrown error when nothing usable came back.
export type PriceQuote = { price: number; asOf: string };

function yahooChartUrl(ticker: string): string {
  return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`;
}

export async function fetchPrice(ticker: string): Promise<PriceQuote> {
  const r = await fetch(yahooChartUrl(ticker), {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FracteraStockPriceLookup/1.0)" },
    cache: "no-store",
  });
  // TEN LANGUAGES (step 243.4, rule 4г) — see the identical note in parse-request/functions.ts.
  if (!r.ok) {
    const status = r.status;
    throw new Error(JSON.stringify({
      en: `The quote service returned an error (${status}) for "${ticker}".`,
      ru: `Сервис котировок вернул ошибку (${status}) для «${ticker}».`,
      es: `El servicio de cotizaciones devolvió un error (${status}) para «${ticker}».`,
      fr: `Le service de cotation a renvoyé une erreur (${status}) pour « ${ticker} ».`,
      it: `Il servizio quotazioni ha restituito un errore (${status}) per «${ticker}».`,
      de: `Der Kursdienst hat einen Fehler (${status}) für „${ticker}\" zurückgegeben.`,
      pt: `O serviço de cotações devolveu um erro (${status}) para «${ticker}».`,
      pl: `Usługa notowań zwróciła błąd (${status}) dla „${ticker}\".`,
      tr: `"${ticker}" için fiyat servisi bir hata (${status}) döndürdü.`,
      nl: `De koersendienst gaf een fout (${status}) voor "${ticker}".`,
    }));
  }
  const data = (await r.json().catch(() => null)) as
    | { chart?: { result?: { meta?: { regularMarketPrice?: number } }[] } }
    | null;
  const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (typeof price !== "number") {
    throw new Error(JSON.stringify({
      en: `No live price was returned for "${ticker}".`,
      ru: `Для «${ticker}» не пришла актуальная цена.`,
      es: `No se recibió un precio en vivo para «${ticker}».`,
      fr: `Aucun cours en direct n'a été renvoyé pour « ${ticker} ».`,
      it: `Nessun prezzo in tempo reale restituito per «${ticker}».`,
      de: `Für „${ticker}\" wurde kein aktueller Kurs zurückgegeben.`,
      pt: `Não foi devolvido um preço em tempo real para «${ticker}».`,
      pl: `Nie zwrócono aktualnej ceny dla „${ticker}\".`,
      tr: `"${ticker}" için canlı fiyat alınamadı.`,
      nl: `Er is geen actuele koers ontvangen voor "${ticker}".`,
    }));
  }
  return { price, asOf: new Date().toISOString() };
}

export const FUNCTIONS: NodeFunction[] = [
  {
    name: "fetchPrice",
    paramsIn: { ticker: "string" },
    returns: "PriceQuote",
    rules: ["deterministic; no AI inside the app", "throws when the quote service has no live price for this ticker"],
  },
];
