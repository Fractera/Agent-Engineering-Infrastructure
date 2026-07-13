# groups — cross-category group-automations hub

This folder is a **hub route**, not a category and not a project — it holds only the three standard
hub files (`page.tsx`, `_components/index.tsx`, `_meta.ts`) plus this README, same shape as a
category hub (`app/(projects)/projects/other/README.md`), but it is NOT one of the four permanent
categories: it is never listed in `PROJECT_CATEGORIES` / `ProjectCategorySlug`, and
`POST /api/projects/categories` never touches it.

## What it lists

`/projects/groups` (`_shared/groups-hub.server.tsx`) lists every **chained**-type automation across
ALL real categories (`_shared/groups-manifest.ts` scans them) — a chained automation is a link in a
chain of automations, rendered on the global canvas as a group/subflow container (step 236/238), and
it still lives inside its own real category folder (e.g. `other/<slug>/`) exactly like a stream or
instanced automation. This page is only a cross-cutting VIEW over automations that already exist
elsewhere — it holds no projects of its own.

## No creation entry point here (deliberate)

Chained-type creation is canvas-only — the root/global-canvas "+" is the only place that offers it
(`create-automation-card.client.tsx`). This page stays read/navigate-only by design; do not add a
"+" card or a creation flow to it.
