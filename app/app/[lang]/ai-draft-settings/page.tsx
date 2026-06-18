import AiDraftEntry from "./_components"

// Thin server entry — see app/CRUD-DOCS/workspace-standards/shell-component-architecture.md.
// Forwards ?agent=&object= (deep-link from /ai-core "+") so the entry can preselect.
export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const sp = await searchParams
  const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)
  return <AiDraftEntry agent={one(sp.agent)} object={one(sp.object)} />
}
