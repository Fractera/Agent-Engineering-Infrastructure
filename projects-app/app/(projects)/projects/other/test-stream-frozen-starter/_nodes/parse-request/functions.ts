import type { NodeFunction } from "../../_types/node-contract";

// STARTING PATTERN (step 243) — deterministic, no AI. A small CLOSED dictionary of well-known public
// companies + a couple of common aliases. Deliberately NOT an intent classifier: a request that mentions no
// known company gets the SAME honest rejection whether it's an unrelated question or a company outside this
// tiny demo dictionary. ADAPT this for the real task: replace the dictionary/lookup with whatever the
// automation actually needs to recognize — keep the two-function shape (extract → resolve) if it fits.
type CompanyEntry = { display: string; ticker: string | null };

// `ticker: null` marks a real, well-known company that is simply not publicly traded — kept here on
// PURPOSE as a demonstration of a realistic, specific rejection path (not a generic "unrecognized").
const COMPANIES: Record<string, CompanyEntry> = {
  apple: { display: "Apple", ticker: "AAPL" },
  tesla: { display: "Tesla", ticker: "TSLA" },
  microsoft: { display: "Microsoft", ticker: "MSFT" },
  google: { display: "Google", ticker: "GOOGL" },
  amazon: { display: "Amazon", ticker: "AMZN" },
  nvidia: { display: "Nvidia", ticker: "NVDA" },
  spacex: { display: "SpaceX", ticker: null },
  "space x": { display: "SpaceX", ticker: null },
};

/** Finds the first known company mentioned in free text (case-insensitive substring match) and returns its
 *  dictionary key. Throws when none is found. */
export async function extractCompanyMention(query: string): Promise<{ companyKey: string }> {
  const q = query.toLowerCase();
  for (const key of Object.keys(COMPANIES)) {
    if (q.includes(key)) return { companyKey: key };
  }
  // TEN LANGUAGES (step 243.4, rule 4г): a node's thrown message is normally a plain string (a real
  // automation's own language) — but OUR OWN starting pattern's user-facing errors are our default content,
  // so they throw JSON.stringify({en,ru,...}) instead. The shared ActivationLayer already recognizes this
  // shape (resolveErrorText, _shared/localized-text.ts) and resolves it; a plain string still works exactly
  // as before for any node that does not bother.
  throw new Error(JSON.stringify({
    en: "Could not recognize a supported company in your request.",
    ru: "Не удалось распознать компанию по акциям в вашем запросе.",
    es: "No se pudo reconocer una empresa admitida en tu solicitud.",
    fr: "Impossible de reconnaître une entreprise prise en charge dans votre demande.",
    it: "Impossibile riconoscere un'azienda supportata nella tua richiesta.",
    de: "In Ihrer Anfrage konnte kein unterstütztes Unternehmen erkannt werden.",
    pt: "Não foi possível reconhecer uma empresa suportada no seu pedido.",
    pl: "Nie udało się rozpoznać obsługiwanej firmy w Twoim zapytaniu.",
    tr: "İsteğinizde desteklenen bir şirket tanınamadı.",
    nl: "Kon geen ondersteund bedrijf herkennen in uw verzoek.",
  }));
}

/** Maps a recognized company key to its ticker. Throws a SPECIFIC message for a known-but-private company. */
export async function resolveTicker(companyKey: string): Promise<{ company: string; ticker: string }> {
  const entry = COMPANIES[companyKey];
  if (!entry) throw new Error(`Unknown company key "${companyKey}".`);
  if (!entry.ticker) {
    const name = entry.display;
    throw new Error(JSON.stringify({
      en: `${name} is privately held — it has no public stock price.`,
      ru: `${name} — частная компания, у неё нет публичной цены акций.`,
      es: `${name} es una empresa privada — no tiene precio de acción público.`,
      fr: `${name} est une entreprise privée — elle n'a pas de prix d'action public.`,
      it: `${name} è un'azienda privata — non ha un prezzo azionario pubblico.`,
      de: `${name} ist privat gehalten — es gibt keinen öffentlichen Aktienkurs.`,
      pt: `${name} é uma empresa privada — não tem preço de ação público.`,
      pl: `${name} jest spółką prywatną — nie ma publicznej ceny akcji.`,
      tr: `${name} özel bir şirkettir — halka açık hisse fiyatı yoktur.`,
      nl: `${name} is een particulier bedrijf — er is geen publieke aandelenkoers.`,
    }));
  }
  return { company: entry.display, ticker: entry.ticker };
}

export const FUNCTIONS: NodeFunction[] = [
  {
    name: "extractCompanyMention",
    paramsIn: { query: "string" },
    returns: "{ companyKey: string }",
    rules: ["deterministic; no AI inside the app", "throws when no known company is mentioned"],
  },
  {
    name: "resolveTicker",
    paramsIn: { companyKey: "string" },
    returns: "{ company: string; ticker: string }",
    rules: ["throws a specific message for a known-but-private company"],
  },
];
