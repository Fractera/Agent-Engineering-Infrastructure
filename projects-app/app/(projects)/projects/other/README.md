# other — category hub (empty, catch-all)

This folder is a **category hub**, not a project — it holds only the three standard hub files
(`page.tsx`, `_components/index.tsx`, `_meta.ts`) plus this README. It is the permanent, always-empty
reference: what a brand-new category looks like before any project exists in it. See
`app/(projects)/README.md` for how to create a **sibling category** instead of dumping a project
here.

## Creating a project in this category

**Development of a new project ALWAYS starts by calling the frozen-automation starter — never by
hand-writing `page.tsx` / `_components` / `_meta.ts` yourself.** That function is the single point
that unfreezes the starter template into a real, buildable project folder:

- Function: `createFrozenProject` — `app/(projects)/projects/_lib/frozen-project-starter.ts`
- HTTP: `POST /api/projects/create` with `{"category":"other","project":"<slug>","title":"<Name>"}`

Calling it materializes the frozen skeleton (today: v1 — a page with the standard header/footer and
a centered "Project coming soon") and triggers a rebuild. The result is a real, live, blank page —
proof the plumbing works before a single line of automation logic is written.

Once the project folder exists, its own `README.md` (emitted alongside it) is the next required
reading — it carries the step-by-step development skill for turning the blank skeleton into a full,
repeatable automation (idea → nodes → live runs). That skill document grows with the starter
template itself; do not attempt to write automation logic from memory or habit — follow what that
README says at the time you read it.
