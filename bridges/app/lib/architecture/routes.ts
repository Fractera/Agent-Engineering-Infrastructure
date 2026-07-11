import type { ArchNode } from "./types"

// The route map of this app. Because you work in production you can't see the
// file tree — this is the "Road" that shows your project's pages and endpoints,
// each with its accompanying file: who can reach it, how it renders, the method.
// Curated for v1 (honestly hand-kept); a later step can derive it from the route
// manifest so it never drifts. Rendering/roles reflect the live Shell config.

export const ROUTES_TREE: ArchNode = {
  id: "routes",
  label: "Architecture — your app's structure",
  kind: "layer",
  description:
    "Every page and endpoint your app serves. Open a node to see who can reach " +
    "it, whether it is pre-rendered (static) or computed per request (dynamic), " +
    "and the HTTP method.",
  children: [
    {
      id: "projects",
      label: "Projects",
      kind: "group",
      description:
        "Independent lines of work this workspace runs — a Telegram assistant, a " +
        "procurement tracker, a language course, a sales automation. Each project " +
        "is a complete small application: its own pages, endpoints, local data and " +
        "workflow code, designed once and then run repeatedly. Since step 197 " +
        "projects are served by their OWN runtime (fractera-projects :3003, " +
        "projects.<your-domain> in secure mode) — a slot rebuild never interrupts " +
        "them. This folder is permanent (it cannot be deleted). Project names use " +
        "at least three words.",
      children: [
        {
          id: "projects-layer",
          label: "/projects — Projects layer",
          kind: "group",
          description:
            "The root of every project (§3.12): technical tools, business " +
            "solutions and logic for the architect or a project administrator " +
            "only (roles architect + manager; others are redirected). Monolingual " +
            "— the site's default language, outside the [lang] router. A project " +
            "is a NAMED folder /projects/<category>/<project-slug>; the folder " +
            "name is the project's slug (source of truth) — dynamic segments are " +
            "forbidden. Four permanent category folders below, present even when " +
            "empty; open one to see its projects, and open a project to see every " +
            "real file it is made of.",
          children: [
            page("r-projects-automation", "/projects/automation — business automations", "/projects/automation",
              "Automation category — a folder of repeatable business automations, each a finished-cycle tool designed once and run cheaply forever (a report collector, a channel watcher, a data pipeline): an n8n for one single task. Opens to one folder per automation project.",
              "Architect · Manager", "dynamic"),
            page("r-projects-fractera-pages", "/projects/fractera-pages — workspace page tools", "/projects/fractera-pages",
              "Fractera-pages category — a folder of projects that manage the pages of this workspace itself: content pipelines, page generators, site maintenance tools. Opens to one folder per project.",
              "Architect · Manager", "dynamic"),
            page("r-projects-personal", "/projects/personal — personal effectiveness", "/projects/personal",
              "Personal-effectiveness category — a folder of private productivity tools for the owner (e.g. a Telegram notes & reminders assistant with its calendar, records and finance tracking). Opens to one folder per project with its full file tree.",
              "Architect · Manager", "dynamic"),
            page("r-projects-other", "/projects/other — everything else", "/projects/other",
              "Catch-all category — a folder for projects outside the three fixed categories. Present even when empty.",
              "Architect · Manager", "dynamic"),
          ],
        },
      ],
    },
    {
      id: "pages",
      label: "Pages",
      kind: "group",
      description:
        "Pages a visitor can open in the browser. The admin-only introspection " +
        "tools are NOT part of your app — they live in the admin cockpit at " +
        "/service/* (:3002) and appear on the AI Core workspace map, not here.",
      children: [
        page("r-home", "/", "/", "Public landing — the starter template you turn into your product.", "Public"),
        page("r-dashboard", "/dashboard", "/dashboard", "Product catalogue demo (DB + media). Self-gates to a signed-in user in secure mode.", "User (secure) / open (IP)", "dynamic"),
      ],
    },
    {
      id: "api",
      label: "API",
      kind: "group",
      description:
        "Server endpoints. In secure mode the proxy requires a session for " +
        "everything except /api/health; in IP mode auth is bypassed.",
      children: [
        api("a-health", "Health probe", "/api/health", "Liveness probe — always open.", "GET", "Public"),
        api("a-me", "Current session", "/api/me", "Current session / identity used by client pages.", "GET", "Session"),
        api("a-products", "Products list / create", "/api/project/default/products", "List and create catalogue products (project-scoped, §3.12).", "GET · POST", "Session"),
        api("a-product-id", "Delete product", "/api/project/default/products/[id]", "Delete a single product.", "DELETE", "Session"),
        api("a-upload", "Media upload", "/api/media/upload", "Upload an image to the media service.", "POST", "Session"),
        api("a-media-file", "Media file", "/api/media/[id]/file", "Serve a stored media file.", "GET", "Session"),
        api("a-arch-requested", "Declare route", "/api/project/default/architecture/requested", "Declare and list requested pages (§3.11).", "GET · POST", "Session"),
        api("a-arch-tasks", "Route tasks", "/api/project/default/architecture/tasks", "Per-route to-dos and deletion requests.", "GET · POST", "Session"),
        api("a-arch-task-id", "Delete task", "/api/project/default/architecture/tasks/[id]", "Remove a single route task.", "DELETE", "Session"),
        api("a-src", "Route source", "/api/project/default/source", "Read-only source bundle for the code viewer (§3.13).", "GET", "Session"),
        api("a-routing", "Routing files", "/api/project/default/routing", "Read-only routing files of a route (folder view).", "GET", "Session"),
        api("a-sig", "Tree signature", "/api/project/default/architecture/signature", "Live-poll snapshot (per-path task signature) for the tree (§3.11).", "GET", "Session"),
        api("a-projects", "Projects list / create", "/api/projects", "List and create projects (§3.12, ≥3-word names).", "GET · POST", "Session"),
        api("a-glossary", "Glossary file", "/api/glossary", "Workspace glossary file (GLOSSARY.md) — list/add/remove terms (§3.11).", "GET · POST · DELETE", "Session"),
        api("a-req-id", "Remove declaration", "/api/project/default/architecture/requested/[id]", "Remove a declared route (Remove declaration).", "DELETE", "Session"),
        api("a-proj-id", "Remove project", "/api/projects/[id]", "Remove a declared project (Remove declaration).", "DELETE", "Session"),
      ],
    },
  ],
}

function page(
  id: string, label: string, href: string, description: string,
  roles: string, rendering: "static" | "dynamic" = "static", service = false,
): ArchNode {
  const node: ArchNode = { id, label, kind: "page", href, description, meta: { roles, rendering, method: "GET" } }
  if (service) node.badge = "service"
  return node
}

function api(
  id: string, name: string, label: string, description: string, method: string, roles: string,
): ArchNode {
  return { id, label, name, kind: "api", description, meta: { roles, rendering: "dynamic", method } }
}
