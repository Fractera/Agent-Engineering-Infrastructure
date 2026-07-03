import AiDraftEntry from "./_components"

// Thin server entry — see app/CRUD-DOCS/workspace-standards/shell-component-architecture.md.
// Forwards ?agent=&object=&target= (deep-link from /ai-core "+" / pencil) so the entry can preselect.

// Architect-only service page — the static-first canon's allowed exception (STATIC-FIRST.md).
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  return <AiDraftEntry agent={one(sp.agent)} object={one(sp.object)} target={one(sp.target)} />
}
