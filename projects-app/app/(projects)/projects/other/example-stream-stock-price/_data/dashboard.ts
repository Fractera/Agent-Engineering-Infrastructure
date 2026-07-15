import type { DashboardConfig } from "../../../_shared/table-config";

// This automation's DASHBOARD (step 243) — ONE table, "history": every successful lookup this stream
// automation has ever recorded. Newest first is the API's own default (nothing declared here for it).
// `pageSize: 10` — "last 10 rows, then load more" (step 243's pagination upgrade to the shared table).
// The last column is `action:"live"` (step 243's new action kind): it re-fetches the CURRENT price for that
// row's own stored ticker and shows it in a modal — the stored `price` is a snapshot, this button proves it
// is not stale. It reuses the SAME lookup-price node logic through a thin, read-only, per-automation route
// (app/api/projects/other/example-stream-stock-price/price/route.ts) — no new row is ever written by it.
// TEN LANGUAGES (step 243.4, rule 4г) — title/description/headers are {en,ru,...} maps, our own default
// content; resolved at render time (_shared/localized-text.ts).
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
          options: { action: "live", liveUrl: "/api/projects/other/example-stream-stock-price/price?ticker={ticker}" },
        },
      ],
      rows: [],
    },
  ],
};
