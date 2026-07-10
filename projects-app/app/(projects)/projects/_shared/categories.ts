// The four permanent categories of the Projects layer (§3.12, step 174 master
// plan). Categories always exist, even when empty; a project is a NAMED folder
// /projects/<category>/<project-slug> — dynamic segments are forbidden in this
// layer. Slugs are fixed English identifiers (never localized, never renamed).
export type ProjectCategorySlug =
  | "automation"
  | "fractera-pages"
  | "personal"
  | "other";

export type ProjectCategory = {
  slug: ProjectCategorySlug;
  title: string;
  navLabel: string; // short label for the category nav buttons (step 207.10 item 3)
  description: string;
};

export const PROJECT_CATEGORIES: ProjectCategory[] = [
  {
    slug: "automation",
    title: "Automation",
    navLabel: "Business",
    description:
      "Repeatable business automations — scheduled publishing, data pipelines, " +
      "integrations with external APIs. Each project is a finished-cycle tool: " +
      "an n8n for one single task.",
  },
  {
    slug: "personal",
    title: "Personal effectiveness",
    navLabel: "Personal",
    description:
      "Private tools for the owner's own productivity — reminders, trackers, " +
      "personal dashboards and assistants.",
  },
  {
    slug: "fractera-pages",
    title: "Fractera pages",
    navLabel: "Fractera pages",
    description:
      "Projects that manage the pages of this workspace — bulk content " +
      "operations, page-group maintenance, publishing workflows.",
  },
  {
    slug: "other",
    title: "Other",
    navLabel: "Other",
    description:
      "Projects that do not fit the three categories above. If a project type " +
      "recurs here, it is a candidate for a category of its own.",
  },
];
