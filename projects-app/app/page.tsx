import { redirect } from "next/navigation";

// The projects service serves the /projects zone (route group (projects), which owns its own
// <html>). The bare host root "/" has no <html> of its own (pass-through root layout), so it
// simply redirects into the zone. redirect() throws before render, so no markup is produced here.
export default function ProjectsRoot() {
  redirect("/projects/personal");
}
