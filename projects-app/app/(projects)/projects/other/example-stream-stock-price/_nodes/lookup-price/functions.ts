import type { NodeFunction } from "../../../../_shared/node-contract";

// REAL, deterministic application function of "lookup-price" (step 243) — a plain external HTTP fetch, no
// AI. There was no existing convention for this in the codebase (only _shared/external-ai.ts's callExternalAi
// for the ONE allowed AI path) — this establishes the first one, keeping the same style as the rest of the
// _nodes/ standard: typed, throws loudly on failure, never silently succeeds.
//
// The endpoint is Yahoo Finance's unofficial (undocumented, no API key, no SLA) chart API — verified live
// during planning (returned a real regularMarketPrice for AAPL with no auth). Fine for a reference/demo
// automation (test projects are disposable); a production automation needing an SLA could swap in a keyed
// provider (e.g. Finnhub) here without changing this node's shape (same `ticker in -> {price, asOf} out`).
export type PriceQuote = { price: number; asOf: string };

function yahooChartUrl(ticker: string): string {
  return `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(ticker)}`;
}

export async function fetchPrice(ticker: string): Promise<PriceQuote> {
  const r = await fetch(yahooChartUrl(ticker), {
    headers: { "User-Agent": "Mozilla/5.0 (compatible; FracteraStockPriceLookup/1.0)" },
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`fetchPrice: the quote service returned ${r.status} for "${ticker}".`);
  const data = (await r.json().catch(() => null)) as
    | { chart?: { result?: { meta?: { regularMarketPrice?: number } }[] } }
    | null;
  const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice;
  if (typeof price !== "number") {
    throw new Error(`fetchPrice: no live price was returned for "${ticker}".`);
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
