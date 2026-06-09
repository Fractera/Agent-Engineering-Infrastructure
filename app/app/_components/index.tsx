import { ShellHome } from "./shell-home.client"

// Route entry component for "/" (the default _meta.ts entryComponent). Server by
// default; it renders the client island that holds the animated landing.
export default function HomeEntry() {
  return <ShellHome />
}
