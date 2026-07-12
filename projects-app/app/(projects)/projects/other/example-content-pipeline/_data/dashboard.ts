import type { DashboardConfig } from "../../../_shared/table-config";

// The reference dashboard (step 228) — proves the standard at scale: TWO tables in ONE accordion, the first
// with 10+ columns of EVERY type (several hidden by default → the column picker + horizontal scroll are
// exercised). A column is DATA, not JSX; the shared table renders all of this through the closed cell
// registry. This is the "5x more columns" the owner asked to be possible.
export const EXAMPLE_DASHBOARD: DashboardConfig = {
  tables: [
    {
      id: "articles",
      title: "Articles",
      description: "Every column type, several hidden by default — open the Columns picker and scroll sideways.",
      columns: [
        { id: "status", header: "Status", type: "badge", source: "status", defaultVisible: true, options: { colorFrom: "statusColor" } },
        { id: "topic", header: "Topic", type: "text", source: "topic", defaultVisible: true },
        { id: "summary", header: "Summary", type: "longtext", source: "summary", defaultVisible: true, options: { expand: true } },
        { id: "words", header: "Words", type: "number", source: "words", defaultVisible: true },
        { id: "cost", header: "Cost", type: "number", source: "cost", defaultVisible: false, options: { suffix: "$" } },
        { id: "sources", header: "Sources", type: "number", source: "sources", defaultVisible: false },
        { id: "cover", header: "Cover", type: "image", source: "cover", defaultVisible: true },
        { id: "url", header: "Link", type: "link", source: "url", defaultVisible: false },
        { id: "publishAt", header: "Publish at", type: "date", source: "publishAt", defaultVisible: true, options: { emphasizeIfFuture: true } },
        { id: "created", header: "Created", type: "date", source: "created", defaultVisible: false },
        { id: "detail", header: "", type: "actions", source: "id", defaultVisible: true, options: { action: "detail" } },
        { id: "delete", header: "", type: "actions", source: "id", defaultVisible: false, options: { action: "delete" } },
      ],
      rows: [
        { id: "1", values: { status: "published", statusColor: "green", topic: "Coffee brewing", summary: "A long-form guide to pour-over coffee — click to expand this summary and read the whole thing.", words: 1840, cost: 0.42, sources: 7, cover: "https://picsum.photos/seed/coffee/80", url: "https://example.com/coffee", publishAt: "2026-07-10T08:00:00Z", created: "2026-07-08T12:00:00Z" } },
        { id: "2", values: { status: "scheduled", statusColor: "amber", topic: "Cold brew myths", summary: "Debunking five myths about cold brew.", words: 1200, cost: 0.28, sources: 4, cover: "https://picsum.photos/seed/coldbrew/80", url: "https://example.com/coldbrew", publishAt: "2026-07-20T08:00:00Z", created: "2026-07-11T09:30:00Z" } },
        { id: "3", values: { status: "draft", statusColor: "blue", topic: "Espresso basics", summary: "The fundamentals of pulling a good espresso shot.", words: 0, cost: 0, sources: 2, cover: "", url: "", publishAt: "", created: "2026-07-12T15:00:00Z" } },
      ],
    },
    {
      id: "sources",
      title: "Sources",
      description: "A second table in the same dashboard — proving one tab holds any number of tables.",
      columns: [
        { id: "name", header: "Source", type: "text", source: "name", defaultVisible: true },
        { id: "url", header: "URL", type: "link", source: "url", defaultVisible: true },
        { id: "used", header: "Used in", type: "number", source: "used", defaultVisible: true },
      ],
      rows: [
        { id: "1", values: { name: "Specialty Coffee Assoc.", url: "https://example.com/sca", used: 3 } },
        { id: "2", values: { name: "Barista Hustle", url: "https://example.com/bh", used: 5 } },
      ],
    },
  ],
};
