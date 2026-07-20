import type { ActivationSchema } from "../_types/activation";

// STARTING PATTERN (step 243) — NOT empty: this is what makes the launch console (below the diagram) work
// the moment this automation is created. The key ("query") matches "parse-request"'s first function's
// paramsIn — that is the whole wiring. Full contract: app/(projects)/README.md, "The activation (launch
// console) standard". ADAPT this for the owner's real task — change the label/help, add/remove params —
// keeping each `key` in sync with whatever the first node's paramsIn expects.
//
// TEN LANGUAGES (step 243.2, rule 4г): this is OUR own default content, not a real automation's — title/
// description/label/help are {en,ru,...} maps, resolved at render time (see _shared/localized-text.ts). A
// real automation a coding agent designs later may keep it simple and just write ONE string in the owner's
// own language — the type accepts both.
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
    // SCHEDULED ASK (step 254.8e, owner's law: «напомни через час» must fire in an hour, not instantly).
    // "when" is consumed by the RUN ROUTE, never by the nodes: a future value stores the request and the
    // in-process ticker executes it on time; the Processes timeline shows it grey until then.
    {
      key: "when",
      label: {
        en: "When (optional)", ru: "Когда (необязательно)", es: "Cuándo (opcional)", fr: "Quand (facultatif)",
        it: "Quando (facoltativo)", de: "Wann (optional)", pt: "Quando (opcional)", pl: "Kiedy (opcjonalnie)",
        tr: "Ne zaman (isteğe bağlı)", nl: "Wanneer (optioneel)",
      },
      type: "datetime",
      required: false,
      help: {
        en: "Leave empty to run now, or pick a future time — the request runs then and shows on the Processes timeline.",
        ru: "Оставьте пустым для запуска сейчас или выберите время в будущем — запрос выполнится тогда и появится на таймлайне «Процессы».",
        es: "Déjalo vacío para ejecutar ahora, o elige un momento futuro — la solicitud se ejecutará entonces y aparecerá en «Procesos».",
        fr: "Laissez vide pour exécuter maintenant, ou choisissez un moment futur — la demande s'exécutera alors et apparaîtra dans « Processus ».",
        it: "Lascia vuoto per eseguire ora, o scegli un momento futuro — la richiesta verrà eseguita allora e apparirà in «Processi».",
        de: "Leer lassen für sofort, oder eine künftige Zeit wählen — die Anfrage läuft dann und erscheint in der Prozess-Zeitleiste.",
        pt: "Deixe vazio para executar agora, ou escolha um momento futuro — o pedido será executado então e aparecerá em «Processos».",
        pl: "Zostaw puste, aby uruchomić teraz, lub wybierz przyszły czas — zapytanie uruchomi się wtedy i pojawi na osi «Procesy».",
        tr: "Şimdi çalıştırmak için boş bırakın veya gelecekte bir zaman seçin — istek o zaman çalışır ve «Süreçler» zaman çizelgesinde görünür.",
        nl: "Laat leeg om nu uit te voeren, of kies een toekomstig tijdstip — het verzoek draait dan en verschijnt op de «Processen»-tijdlijn.",
      },
    },
  ],
};
