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
      children: [],
    },
    {
      id: "pages",
      label: "Pages",
      kind: "group",
      description: "Pages a visitor can open in the browser.",
      children: [
        page("r-home", "/", "/", "Public landing — the starter template you turn into your product.", "Public"),
        page("r-dashboard", "/dashboard", "/dashboard", "Product catalogue demo (DB + media). Self-gates to a signed-in user in secure mode.", "User (secure) / open (IP)", "dynamic"),
        page("r-ai-core", "/ai-core", "/ai-core", "Live state of your AI core — agents, bridges, memory, MCP, tools.", "Public"),
        page("r-architecture", "/architecture", "/architecture", "This page — the map of your app's pages and endpoints.", "Public"),
        page("r-debug", "/debug", "/debug", "Runtime diagnostics scratch surface.", "Public"),
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
        api("a-health", "/api/health", "Liveness probe — always open.", "GET", "Public"),
        api("a-me", "/api/me", "Current session / identity used by client pages.", "GET", "Session"),
        api("a-products", "/api/products", "List and create catalogue products.", "GET · POST", "Session"),
        api("a-product-id", "/api/products/[id]", "Delete a single product.", "DELETE", "Session"),
        api("a-upload", "/api/media/upload", "Upload an image to the media service.", "POST", "Session"),
        api("a-media-file", "/api/media/[id]/file", "Serve a stored media file.", "GET", "Session"),
        api("a-config-env", "/api/config/env", "Read non-secret runtime config.", "GET", "Session"),
        api("a-config-or", "/api/config/openrouter", "OpenRouter config for the app.", "GET", "Session"),
        api("a-arch-requested", "/api/architecture/requested", "Declare and list requested pages (§3.11).", "GET · POST", "Session"),
        api("a-arch-tasks", "/api/architecture/tasks", "Per-route to-dos and deletion requests.", "GET · POST", "Session"),
        api("a-arch-task-id", "/api/architecture/tasks/[id]", "Remove a single route task.", "DELETE", "Session"),
        api("a-projects", "/api/projects", "List and create projects (§3.12, ≥3-word names).", "GET · POST", "Session"),
      ],
    },
  ],
}

function page(
  id: string, label: string, href: string, description: string,
  roles: string, rendering: "static" | "dynamic" = "static",
): ArchNode {
  return { id, label, kind: "page", href, description, meta: { roles, rendering, method: "GET" } }
}

function api(
  id: string, label: string, description: string, method: string, roles: string,
): ArchNode {
  return { id, label, kind: "api", description, meta: { roles, rendering: "dynamic", method } }
}
