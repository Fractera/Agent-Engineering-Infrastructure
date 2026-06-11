import { PatternsApp } from "./patterns-app.client"

// Route entry component for /patterns. Server by default; renders the client
// island that browses and edits the project's reusable code patterns and the
// deployment anti-patterns (filesystem-backed, mirroring /architecture).
export default function PatternsEntry() {
  return <PatternsApp />
}
