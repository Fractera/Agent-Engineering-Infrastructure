import { DebugApp } from "./debug-app.client"

// Route entry component for /debug. Server by default; renders the client island
// that runs the live probes and reads runtime URLs.
export default function DebugEntry() {
  return <DebugApp />
}
