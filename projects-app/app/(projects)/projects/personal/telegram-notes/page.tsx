import TelegramNotesProjectEntry from "./_components";

// Request-time rendering (step 207.x — fix items 8 & 9). This is a PRIVATE architect/manager
// cockpit page (see _meta.ts roles), which the static-first canon explicitly allows to be
// dynamic. Without this the route is statically prerendered and its DB-backed sections
// (records / finances / calendar) freeze the build-time (empty) snapshot and never reflect
// runtime writes — the bot says "Saved" but the tables stay empty. force-dynamic re-reads the
// live DB every request; the AutoRefresh client (mounted in _components) keeps it live without
// a manual reload. This enforces the intent already declared as rendering:"dynamic" in _meta.ts.
export const dynamic = "force-dynamic";
export const runtime = "nodejs";

// Thin server entry — see app/CRUD-DOCS/workspace-standards/shell-component-architecture.md.
export default function Page() {
  return <TelegramNotesProjectEntry />;
}
