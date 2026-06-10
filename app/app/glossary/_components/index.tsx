import { GlossaryApp } from "./glossary-app.client"

// Route entry component for /glossary. Server by default; renders the client
// island that edits the workspace glossary.
export default function GlossaryEntry() {
  return <GlossaryApp />
}
