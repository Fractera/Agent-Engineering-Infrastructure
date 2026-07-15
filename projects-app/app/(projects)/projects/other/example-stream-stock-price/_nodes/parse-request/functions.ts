import type { NodeFunction } from "../../../../_shared/node-contract";

// Deterministic application functions of "parse-request" (step 243) — no AI. A small CLOSED dictionary of
// well-known public companies + a couple of common aliases. Deliberately NOT an intent classifier: a request
// that mentions no known company gets the SAME honest rejection whether it's an unrelated question ("what's
// the weather") or a company outside this tiny demo dictionary — the owner's explicit instruction not to
// develop this case further.
type CompanyEntry = { display: string; ticker: string | null };

// `ticker: null` marks a real, well-known company that is simply not publicly traded. SpaceX is kept here on
// PURPOSE as the deliberate proof of this exact path: asking about it must fail with a specific, honest
// reason ("privately held"), not a generic "unrecognized" — a realistic named-company rejection, not a
// random-word one.
const COMPANIES: Record<string, CompanyEntry> = {
  apple: { display: "Apple", ticker: "AAPL" },
  tesla: { display: "Tesla", ticker: "TSLA" },
  microsoft: { display: "Microsoft", ticker: "MSFT" },
  google: { display: "Google", ticker: "GOOGL" },
  alphabet: { display: "Alphabet", ticker: "GOOGL" },
  amazon: { display: "Amazon", ticker: "AMZN" },
  nvidia: { display: "Nvidia", ticker: "NVDA" },
  meta: { display: "Meta", ticker: "META" },
  facebook: { display: "Meta", ticker: "META" },
  netflix: { display: "Netflix", ticker: "NFLX" },
  spacex: { display: "SpaceX", ticker: null },
  "space x": { display: "SpaceX", ticker: null },
};

/** Finds the first known company mentioned in free text (case-insensitive substring match) and returns its
 *  dictionary key. Throws when none is found — this is the ONLY rejection path in this node; it covers both
 *  an off-topic question and a company outside the dictionary identically, on purpose. */
export async function extractCompanyMention(query: string): Promise<{ companyKey: string }> {
  const q = query.toLowerCase();
  for (const key of Object.keys(COMPANIES)) {
    if (q.includes(key)) return { companyKey: key };
  }
  throw new Error("Could not recognize a supported company in your request.");
}

/** Maps a recognized company key to its ticker. Throws a SPECIFIC, honest message for a known-but-private
 *  company (SpaceX) — never the generic "unrecognized" message for a company the dictionary DOES know. */
export async function resolveTicker(companyKey: string): Promise<{ company: string; ticker: string }> {
  const entry = COMPANIES[companyKey];
  if (!entry) throw new Error(`Unknown company key "${companyKey}".`);
  if (!entry.ticker) throw new Error(`${entry.display} is privately held — it has no public stock price.`);
  return { company: entry.display, ticker: entry.ticker };
}

export const FUNCTIONS: NodeFunction[] = [
  {
    name: "extractCompanyMention",
    paramsIn: { query: "string" },
    returns: "{ companyKey: string }",
    rules: ["deterministic; no AI inside the app", "throws when no known company is mentioned — no NLP intent classification"],
  },
  {
    name: "resolveTicker",
    paramsIn: { companyKey: "string" },
    returns: "{ company: string; ticker: string }",
    rules: ["throws a specific message for a known-but-private company (e.g. SpaceX)"],
  },
];
