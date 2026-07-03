import { DebugApp } from "./debug-app.client"

// Route entry component for /debug. Server by default; admin-only service page.
export default async function DebugEntry() {
  return <DebugApp />
}
