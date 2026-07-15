import type { DashboardConfig } from "../../../_shared/table-config";

// This automation's DASHBOARD (step 243) — ONE table, "history": every successful lookup this stream
// automation has ever recorded. Newest first is the API's own default (nothing declared here for it).
// `pageSize: 10` — "last 10 rows, then load more" (step 243's pagination upgrade to the shared table).
// The last column is `action:"live"` (step 243's new action kind): it re-fetches the CURRENT price for that
// row's own stored ticker and shows it in a modal — the stored `price` is a snapshot, this button proves it
// is not stale. It reuses the SAME lookup-price node logic through a thin, read-only, per-automation route
// (app/api/projects/other/example-stream-stock-price/price/route.ts) — no new row is ever written by it.
export const PROJECT_DASHBOARD: DashboardConfig = {
  tables: [
    {
      id: "history",
      title: "History",
      description: "Every successful stock-price lookup. A failed ask (unknown company, no live price) is never recorded here.",
      pageSize: 10,
      columns: [
        { id: "date", header: "Date", type: "date", source: "date", defaultVisible: true },
        { id: "company", header: "Company", type: "text", source: "company", defaultVisible: true },
        { id: "ticker", header: "Ticker", type: "text", source: "ticker", defaultVisible: true },
        { id: "price", header: "Price", type: "number", source: "price", defaultVisible: true, options: { suffix: "$" } },
        {
          id: "live", header: "", type: "actions", source: "ticker", defaultVisible: true,
          options: { action: "live", liveUrl: "/api/projects/other/example-stream-stock-price/price?ticker={ticker}" },
        },
      ],
      rows: [],
    },
  ],
};
