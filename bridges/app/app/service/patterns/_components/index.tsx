import { PatternsApp } from "./patterns-app.client"

// Route entry for /service/patterns. Admin-only — access enforced by the admin
// proxy.ts (no requireAdmin() guard here, unlike the slot version).
export default function PatternsEntry() {
  return <PatternsApp />
}
