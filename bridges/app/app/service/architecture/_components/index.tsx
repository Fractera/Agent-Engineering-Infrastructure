import { ArchitectureApp } from "./architecture-app.client"

// Route entry component for /architecture. Server by default; admin-only service page.
export default async function ArchitectureEntry() {
  return <ArchitectureApp />
}
