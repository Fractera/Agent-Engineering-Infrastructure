import DebugEntry from "./_components"

// Thin server entry — see app/CRUD-DOCS/workspace-standards/shell-component-architecture.md.

// Architect-only service page — the static-first canon's allowed exception (STATIC-FIRST.md).
export const dynamic = "force-dynamic";

export default function Page() {
  return <DebugEntry />
}
