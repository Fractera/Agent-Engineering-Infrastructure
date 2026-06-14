import { DashboardApp } from "./dashboard-app.client"

// Route entry component (the default _meta.ts entryComponent). Server by
// default: it composes the route and is where server-side data loading would
// land. The interactive surface is the client island it renders.
export default function DashboardEntry() {
  return <DashboardApp />
}
