// ФУНКЦИЯ УЗЛА «INPUT» (канал control-panel) — принимает сырое обращение и НАЗЫВАЕТ его для середины.
// Сценарий «цена акции» (эталон v1 parse-request): детерминированный словарь известных публичных
// компаний → тикер. Незнакомая компания или заведомо частная (SpaceX) — узел БРОСАЕТ с 10-языковым
// сообщением: провал на входе честно останавливает прогон до всякой записи (правило 4г).
//
// Контракт функции узла v2: (ctx) => частичный ctx, который сливается в общий bag. Бросок = провал
// цепочки. Имя функции `receiveRequest` — публичный контракт, менять нельзя; логику внутрь класть можно.
import type { NodeCtx } from "../executor";

type Company = { display: string; ticker: string | null };

const COMPANIES: Record<string, Company> = {
  apple: { display: "Apple", ticker: "AAPL" },
  tesla: { display: "Tesla", ticker: "TSLA" },
  microsoft: { display: "Microsoft", ticker: "MSFT" },
  google: { display: "Google", ticker: "GOOGL" },
  alphabet: { display: "Google", ticker: "GOOGL" },
  amazon: { display: "Amazon", ticker: "AMZN" },
  nvidia: { display: "Nvidia", ticker: "NVDA" },
  meta: { display: "Meta", ticker: "META" },
  netflix: { display: "Netflix", ticker: "NFLX" },
  spacex: { display: "SpaceX", ticker: null },
  "space x": { display: "SpaceX", ticker: null },
};

const NOT_RECOGNIZED = {
  en: "Could not recognize a supported company in the request. Try a public one like Apple, Tesla, Nvidia.",
  es: "No se reconoció ninguna empresa admitida. Prueba con una pública: Apple, Tesla, Nvidia.",
  fr: "Aucune entreprise prise en charge reconnue. Essayez une société cotée : Apple, Tesla, Nvidia.",
  it: "Nessuna azienda supportata riconosciuta. Prova con una quotata: Apple, Tesla, Nvidia.",
  ru: "Не удалось распознать поддерживаемую компанию. Попробуйте публичную: Apple, Tesla, Nvidia.",
  de: "Kein unterstütztes Unternehmen erkannt. Versuche ein börsennotiertes: Apple, Tesla, Nvidia.",
  pt: "Nenhuma empresa suportada reconhecida. Tente uma pública: Apple, Tesla, Nvidia.",
  pl: "Nie rozpoznano obsługiwanej firmy. Spróbuj spółki publicznej: Apple, Tesla, Nvidia.",
  tr: "Desteklenen bir şirket tanınamadı. Halka açık birini deneyin: Apple, Tesla, Nvidia.",
  nl: "Geen ondersteund bedrijf herkend. Probeer een beursgenoteerd bedrijf: Apple, Tesla, Nvidia.",
};

const privateCompany = (name: string) => ({
  en: `${name} is privately held — it has no public stock price.`,
  es: `${name} es una empresa privada: no tiene precio de acción público.`,
  fr: `${name} est une société privée : elle n'a pas de cours de bourse public.`,
  it: `${name} è una società privata: non ha un prezzo azionario pubblico.`,
  ru: `${name} — частная компания, у неё нет публичной цены акции.`,
  de: `${name} ist ein privates Unternehmen — es hat keinen öffentlichen Aktienkurs.`,
  pt: `${name} é uma empresa privada — não tem preço de ação público.`,
  pl: `${name} to firma prywatna — nie ma publicznej ceny akcji.`,
  tr: `${name} özel bir şirkettir — halka açık hisse fiyatı yoktur.`,
  nl: `${name} is een privébedrijf — het heeft geen openbare aandelenkoers.`,
});

export function receiveRequest(ctx: NodeCtx): { company: string; ticker: string } {
  const query = String(ctx.query ?? "").toLowerCase();
  for (const key of Object.keys(COMPANIES)) {
    if (query.includes(key)) {
      const { display, ticker } = COMPANIES[key];
      if (ticker === null) throw new Error(JSON.stringify(privateCompany(display)));
      return { company: display, ticker };
    }
  }
  throw new Error(JSON.stringify(NOT_RECOGNIZED));
}
