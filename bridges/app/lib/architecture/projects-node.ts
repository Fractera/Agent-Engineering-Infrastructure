import type { ArchNode } from "./types"

// Projects & Design layers — own top-level layers since the step-197 migration.
// Projects no longer live inside the App Shell slot: they run as their own PM2
// process (fractera-projects :3003, code /opt/fractera/projects-app), so a slot
// rebuild or swap never touches a running automation. Design (:3004) is the
// reserved future layer that replaces the old Patterns concept.

export const PROJECTS_LAYER: ArchNode = {
  id: "projects-layer",
  label: "Projects layer",
  kind: "group",
  description:
    "Independent lines of work the workspace runs for PRIVATE use by the " +
    "architect or a project administrator — unlike App-layer pages (open to any " +
    "role), projects are restricted to service needs. Since step 197 this is its " +
    "OWN runtime, fully separated from the App Shell: automations keep running " +
    "even while the slot is being rebuilt or swapped. Fractera agents do not run " +
    "an automation once per request — they build a platform for repeatable " +
    "automations (visual interface, local DB + vector memory, one-click reuse " +
    "from the UI): an n8n for one single task.",
  children: [
    {
      id: "projects-service",
      label: "fractera-projects — Projects runtime",
      kind: "service",
      port: ":3003",
      description:
        "The dedicated Next.js process that serves every project: its own PM2 " +
        "process (fractera-projects), code at /opt/fractera/projects-app, reached " +
        "directly by port in IP mode and at projects.<your-domain> in secure " +
        "mode. Deployed independently of the slot (deploy target=projects), so a " +
        "slot rebuild never interrupts a running automation. Holds the four " +
        "permanent categories below plus each project's pages, APIs, local data " +
        "and workflow code.",
      children: [
        {
          id: "projects-cat-automation",
          label: "/projects/automation",
          kind: "group",
          description:
            "Automation category — repeatable business automations, each a " +
            "finished-cycle tool designed once and then run cheaply forever: " +
            "an n8n for one single task (a report collector, a channel watcher, " +
            "a data pipeline).",
        },
        {
          id: "projects-cat-fractera-pages",
          label: "/projects/fractera-pages",
          kind: "group",
          description:
            "Fractera-pages category — projects that manage the pages of this " +
            "workspace itself: content pipelines, page generators, site " +
            "maintenance tools.",
        },
        {
          id: "projects-cat-personal",
          label: "/projects/personal",
          kind: "group",
          description:
            "Personal-effectiveness category — private productivity tools for " +
            "the owner (e.g. a Telegram notes & reminders assistant with its own " +
            "calendar, records table and finance tracking).",
        },
        {
          id: "projects-cat-other",
          label: "/projects/other",
          kind: "group",
          description:
            "Catch-all category — projects that do not fit the three fixed " +
            "categories. Present even when empty.",
        },
      ],
    },
    {
      id: "projects-cron",
      label: "fractera-cron — schedule runner",
      kind: "service",
      description:
        "The projects-layer scheduler: a small zero-dependency PM2 process (no " +
        "port) that wakes on each project's cron declarations and calls the " +
        "project's run endpoints on :3003. This is what makes an automation run " +
        "on time with zero load on any agent.",
    },
    {
      id: "projects-listener",
      label: "Telegram listener — inbound channel",
      kind: "note",
      description:
        "The inbound message channel of the Projects layer: incoming Telegram " +
        "messages (text and voice) are routed to the automation that owns the " +
        "bot and land in its endpoints on :3003. Works independently of the App " +
        "Shell and of Hermes.",
    },
  ],
}

export const DESIGN_LAYER: ArchNode = {
  id: "design-layer",
  label: "Design layer",
  kind: "group",
  description:
    "The reserved design layer of the workspace — the successor of the retired " +
    "Patterns concept. Reusable visual patterns, brandbook and UI language will " +
    "live here as their own product surface.",
  children: [
    {
      id: "design-service",
      label: "fractera-design — Design runtime",
      kind: "service",
      port: ":3004",
      description:
        "An architect-only PM2 process reserved for the future Design layer " +
        "(deploy target=design). Currently an empty shell: it exists so the " +
        "runtime, port and deploy path are already in place when the design " +
        "surface is built. In secure mode it is reached at design.<your-domain>.",
    },
  ],
}
