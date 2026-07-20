import type { DashboardConfig } from "../_types/table-config";

// STARTING PATTERN (step 243) — a REAL table wired to what "record-result" actually writes, not a demo seed
// disconnected from the nodes. `pageSize` + the `live` action column are the step-243 upgrades to the
// universal table (pagination/search-debounce/live-refresh) — every automation gets them automatically the
// moment it declares them here; nothing to build. Full contract: app/(projects)/README.md, "The dashboard
// tables & columns standard". ADAPT the columns for the owner's real task.
//
// TEN LANGUAGES (step 243.2, rule 4г) — title/description/headers are {en,ru,...} maps, our own default
// content; resolved at render time (_shared/localized-text.ts). A real automation may just write one string.
export const PROJECT_DASHBOARD: DashboardConfig = {
  tables: [
    {
      id: "history",
      title: {
        en: "History", ru: "История", es: "Historial", fr: "Historique", it: "Cronologia",
        de: "Verlauf", pt: "Histórico", pl: "Historia", tr: "Geçmiş", nl: "Geschiedenis",
      },
      description: {
        en: "Every successful lookup. A failed ask is never recorded here.",
        ru: "Каждый успешный запрос. Неудачный запрос сюда никогда не записывается.",
        es: "Cada consulta exitosa. Una consulta fallida nunca se registra aquí.",
        fr: "Chaque recherche réussie. Une demande échouée n'est jamais enregistrée ici.",
        it: "Ogni ricerca riuscita. Una richiesta fallita non viene mai registrata qui.",
        de: "Jede erfolgreiche Abfrage. Eine fehlgeschlagene Anfrage wird hier nie aufgezeichnet.",
        pt: "Cada consulta bem-sucedida. Um pedido malsucedido nunca é registrado aqui.",
        pl: "Każde udane zapytanie. Nieudane zapytanie nigdy nie jest tu zapisywane.",
        tr: "Her başarılı sorgu. Başarısız bir istek buraya asla kaydedilmez.",
        nl: "Elke succesvolle opzoeking. Een mislukt verzoek wordt hier nooit vastgelegd.",
      },
      pageSize: 10,
      columns: [
        {
          id: "date", type: "date", source: "date", defaultVisible: true,
          header: { en: "Date", ru: "Дата", es: "Fecha", fr: "Date", it: "Data", de: "Datum", pt: "Data", pl: "Data", tr: "Tarih", nl: "Datum" },
        },
        {
          id: "company", type: "text", source: "company", defaultVisible: true,
          header: { en: "Company", ru: "Компания", es: "Empresa", fr: "Entreprise", it: "Azienda", de: "Unternehmen", pt: "Empresa", pl: "Firma", tr: "Şirket", nl: "Bedrijf" },
        },
        {
          id: "ticker", type: "text", source: "ticker", defaultVisible: true,
          header: { en: "Ticker", ru: "Тикер", es: "Ticker", fr: "Symbole", it: "Ticker", de: "Ticker", pt: "Ticker", pl: "Ticker", tr: "Sembol", nl: "Ticker" },
        },
        {
          id: "price", type: "number", source: "price", defaultVisible: true, options: { suffix: "$" },
          header: { en: "Price", ru: "Цена", es: "Precio", fr: "Prix", it: "Prezzo", de: "Preis", pt: "Preço", pl: "Cena", tr: "Fiyat", nl: "Prijs" },
        },
        {
          id: "live", header: "", type: "actions", source: "ticker", defaultVisible: true,
          // actionDescription (2026-07-16) — REQUIRED alongside every cell action: the plain-language
          // statement of what the opened modal does, read by a coding agent from the architecture bundle.
          options: {
            action: "live",
            liveUrl: "/projects/other/test-stream-frozen-starter/api/price?ticker={ticker}",
            actionDescription: {
              en: "Opens a modal that fetches the CURRENT live price for this row's ticker (the stored price is a snapshot). Read-only.",
              ru: "Открывает модальное окно, которое запрашивает ТЕКУЩУЮ живую цену по тикеру строки (сохранённая цена — снимок). Только чтение.",
            },
          },
        },
      ],
      rows: [],
    },
  ],
};
