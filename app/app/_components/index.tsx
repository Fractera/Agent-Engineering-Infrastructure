import { ShellHome } from "./shell-home.client"
import { getAppConfig } from "@/config/app-config"

// Route entry component for "/" (the default _meta.ts entryComponent). Server by
// default: it reads the live site config (Admin -> Site Settings) and hands it to the
// client island so the landing reflects the owner's branding without a rebuild.
export default function HomeEntry() {
  return <ShellHome config={getAppConfig()} />
}
