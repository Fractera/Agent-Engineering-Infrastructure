import type { ActivationSchema } from "../../../_shared/activation";

// THIS AUTOMATION'S ACTIVATION (step 243) — what ONE ask takes. It is a STREAM automation: no fork, no
// instance — the launch console (generalized in step 243) POSTs this single param straight to
// /api/projects/run and shows the result inline. The key below is exactly what the "parse-request" node's
// first function expects by name (its `paramsIn`) — that is the whole wiring, same contract as instanced.
// TEN LANGUAGES (step 243.4, rule 4г): this is OUR own default content, not a real automation's — title/
// description/label/help are {en,ru,...} maps, resolved at render time (see _shared/localized-text.ts).
export const ACTIVATION: ActivationSchema = {
  title: {
    en: "Ask for a stock price", ru: "Спросить цену акции", es: "Preguntar el precio de una acción",
    fr: "Demander le prix d'une action", it: "Chiedi il prezzo di un'azione", de: "Nach einem Aktienkurs fragen",
    pt: "Perguntar o preço de uma ação", pl: "Zapytaj o cenę akcji", tr: "Hisse fiyatı sor", nl: "Vraag naar een aandelenkoers",
  },
  description: {
    en: "Name a public company (e.g. \"how much is Apple stock\") and get its current price.",
    ru: "Назовите публичную компанию (например, «сколько стоит акция Apple») и получите её текущую цену.",
    es: "Nombra una empresa pública (p. ej. «cuánto vale la acción de Apple») y obtén su precio actual.",
    fr: "Nommez une entreprise cotée (p. ex. « combien vaut l'action Apple ») et obtenez son prix actuel.",
    it: "Indica un'azienda quotata (es. «quanto vale l'azione Apple») e ottieni il suo prezzo attuale.",
    de: "Nennen Sie ein börsennotiertes Unternehmen (z. B. „wie viel kostet die Apple-Aktie\") und erhalten Sie den aktuellen Kurs.",
    pt: "Indique uma empresa pública (ex.: «quanto vale a ação da Apple») e obtenha o preço atual.",
    pl: "Podaj spółkę giełdową (np. „ile kosztuje akcja Apple\") i uzyskaj jej aktualną cenę.",
    tr: "Halka açık bir şirket adı verin (ör. \"Apple hissesi ne kadar\") ve güncel fiyatını öğrenin.",
    nl: "Noem een beursgenoteerd bedrijf (bijv. \"wat kost het Apple-aandeel\") en krijg de actuele koers.",
  },
  params: [
    {
      key: "query",
      label: {
        en: "Your question", ru: "Ваш вопрос", es: "Tu pregunta", fr: "Votre question", it: "La tua domanda",
        de: "Ihre Frage", pt: "Sua pergunta", pl: "Twoje pytanie", tr: "Sorunuz", nl: "Uw vraag",
      },
      type: "longtext",
      required: true,
      help: {
        en: "Type or speak a company name — e.g. Apple, Tesla, SpaceX.",
        ru: "Введите или произнесите название компании — например, Apple, Tesla, SpaceX.",
        es: "Escribe o di el nombre de una empresa — p. ej. Apple, Tesla, SpaceX.",
        fr: "Tapez ou dites le nom d'une entreprise — p. ex. Apple, Tesla, SpaceX.",
        it: "Scrivi o pronuncia il nome di un'azienda — es. Apple, Tesla, SpaceX.",
        de: "Geben Sie den Namen eines Unternehmens ein oder sprechen Sie ihn — z. B. Apple, Tesla, SpaceX.",
        pt: "Digite ou fale o nome de uma empresa — ex.: Apple, Tesla, SpaceX.",
        pl: "Wpisz lub wypowiedz nazwę firmy — np. Apple, Tesla, SpaceX.",
        tr: "Bir şirket adı yazın veya söyleyin — örn. Apple, Tesla, SpaceX.",
        nl: "Typ of spreek een bedrijfsnaam in — bijv. Apple, Tesla, SpaceX.",
      },
    },
  ],
};
