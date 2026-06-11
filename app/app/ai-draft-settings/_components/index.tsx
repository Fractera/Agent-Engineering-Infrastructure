import { AiDraftApp } from "./ai-draft-app.client"

// Route entry for /ai-draft-settings. Server by default; renders the client
// island. AI Draft Settings is the intermediate layer where the architect writes
// free-form wishes (supplement / replace) that an agent later applies to the real
// instruction / skill / MCP files of the six agents. Filesystem-backed (no DB),
// mirroring /patterns and /architecture.
export default function AiDraftEntry() {
  return <AiDraftApp />
}
