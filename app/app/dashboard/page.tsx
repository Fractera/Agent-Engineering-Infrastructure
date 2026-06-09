import DashboardEntry from "./_components"

// Thin server entry — a page is never a client component. All logic and markup
// live in the route's entry component (_components/index.tsx).
// See app/docs/shell-component-architecture.md.
export default function Page() {
  return <DashboardEntry />
}
