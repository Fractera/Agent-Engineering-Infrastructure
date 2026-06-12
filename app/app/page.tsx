import HomeEntry from "./_components"

// Thin server entry — a page is never a client component. All logic and markup
// live in the route's entry component (_components/index.tsx).
// See app/CRUD-DOCS/workspace-standards/shell-component-architecture.md.
export default function Page() {
  return <HomeEntry />
}
