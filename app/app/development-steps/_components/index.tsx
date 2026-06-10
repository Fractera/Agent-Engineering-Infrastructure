import { DevelopmentStepsApp } from "./development-steps-app.client"

// Route entry component for /development-steps. Server by default; renders the
// client island that lists and edits the project's development steps (filesystem-
// backed, mirroring /architecture).
export default function DevelopmentStepsEntry() {
  return <DevelopmentStepsApp />
}
