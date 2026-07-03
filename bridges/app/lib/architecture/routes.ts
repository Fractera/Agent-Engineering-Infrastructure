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
        "Independent lines of work this workspace runs — a site, a procurement " +
        "tracker, a language course, a sales automation. The default project holds " +
        "everything today; grow new ones for any purpose. This folder is permanent " +
        "(it cannot be deleted). Project names use at least three words.",
      children: [
        {
          id: "project-my-telegram-reminder",
          label: "my telegram reminder",
          kind: "page",
          href: "/project/my-telegram-reminder",
          description:
            "A project that ingests your Telegram messages into a vector store so " +
            "you can later ask what you had planned. Its pages are real named " +
            "routes — dynamic routes are forbidden inside a project (§3.12).",
        },
      ],
    },
    {
      id: "pages",
      label: "Pages",
      kind: "group",
      description:
        "Pages a visitor can open in the browser. The service pages (tagged " +
        "\"service\") are the admin-only introspection tools — reached from the " +
        "Service pages menu in the admin App Preview, not the public home.",
      children: [
        page("r-home", "/", "/", "Public landing — the starter template you turn into your product.", "Public"),
        page("r-dashboard", "/dashboard", "/dashboard", "Product catalogue demo (DB + media). Self-gates to a signed-in user in secure mode.", "User (secure) / open (IP)", "dynamic"),
        // Service pages grouped under (service) — mirroring the real route group on
        // disk (app/(service)/…), so the tree reflects the folder structure (as on GitHub),
        // not a flat list. Records for each page are derived from its _meta.ts (route-manifest).
        {
          id: "service-pages",
          label: "(service)",
          kind: "group",
          description:
            "Admin-only introspection tools — the Shell's own control surfaces. On disk they " +
            "live in the (service) route group (app/(service)/…); route groups are transparent " +
            "to the URL, so e.g. /architecture is reached at /architecture, not /(service)/architecture.",
          children: [
            page("r-ai-core", "/ai-core", "/ai-core", "Live state of your AI core — agents, bridges, memory, MCP, tools. A live mirror of the real files on disk.", "Admin (secure) / open (IP)", "dynamic", true),
            page("r-architecture", "/architecture", "/architecture", "This page — the map of your app's pages and endpoints.", "Admin (secure) / open (IP)", "dynamic", true),
            page("r-debug", "/debug", "/debug", "Runtime diagnostics scratch surface.", "Admin (secure) / open (IP)", "dynamic", true),
            page("r-glossary", "/glossary", "/glossary", "Glossary editor — your term map (key→meaning) every agent reads.", "Admin (secure) / open (IP)", "dynamic", true),
            page("r-dev-steps", "/development-steps", "/development-steps", "Development steps — the project work log as real files (NEW / COMPLETED).", "Admin (secure) / open (IP)", "dynamic", true),
            page("r-patterns", "/patterns", "/patterns", "Patterns & anti-patterns — the reuse library the AI consults while building.", "Admin (secure) / open (IP)", "dynamic", true),
            page("r-ai-draft", "/ai-draft-settings", "/ai-draft-settings", "AI Draft Settings — the draft layer for the six agents' instruction / skill / MCP files.", "Admin (secure) / open (IP)", "dynamic", true),
            page("r-documents", "/documents", "/documents", "Documents — the knowledge-base file manager (CRUD-DOCS), activated into Company Memory.", "Admin (secure) / open (IP)", "dynamic", true),
          ],
        },
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
