import { DevelopmentStepsApp } from "./development-steps-app.client"

// Route entry for /service/development-steps. Admin-only — access enforced by the
// admin proxy.ts (no requireAdmin() guard here, unlike the slot version).
export default function DevelopmentStepsEntry() {
  return <DevelopmentStepsApp />
}
