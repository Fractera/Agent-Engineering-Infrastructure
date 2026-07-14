import type { NodeFunction } from "../../../../_shared/node-contract";
import type { Article } from "../prepare-content/functions";
import { addRow, patchRow } from "@/lib/dashboard-rows";

// REAL functions of "publish" (bodies added in step 241) — all deterministic application code, no AI.
// This is the automation's OUTPUT node: it turns the drafted article into a real, visible record.
//
// The record goes into the automation's OWN dashboard store through the EXISTING rows API (steps 228/229 —
// `lib/dashboard-rows.ts`, the same store the owner's "Add row" writes to), never into a bespoke table of its
// own. An automation writes what it produces through the surfaces the product already has: the run is then
// visible in the dashboard with no extra plumbing, and deleting the automation takes its output with it.
export type Page = { pageId: string };

/** Store the drafted article as a row of this automation's dashboard (status: draft). */
export async function createSitePage(article: Article, slug: string): Promise<Page> {
  const row = await addRow("other/example-content-pipeline", "records", {
    status: "draft",
    color: "blue",
    title: article.title,
    note: article.sections.map((s) => s.heading).join(" · "),
    when: new Date().toISOString(),
    slug,
  });
  return { pageId: row.id };
}

/** Record WHEN this page should go live — the seed of a fork's own launch schedule (E4).
 *  It THROWS when the row is not there: a step that changed nothing must never report success (the first real
 *  end-to-end run reported "ok" while the record silently stayed a draft — never again). */
export async function schedulePublication(pageId: string, publishAt: string): Promise<{ jobId: string }> {
  const ok = await patchRow(pageId, { status: "scheduled", when: publishAt });
  if (!ok) throw new Error(`schedulePublication: no page "${pageId}" to schedule`);
  return { jobId: `job-${pageId}` };
}

/** Flip the record to published and return its address. Throws if there is nothing to publish. */
export async function publishNow(pageId: string): Promise<{ url: string; publishedAt: string }> {
  const publishedAt = new Date().toISOString();
  const ok = await patchRow(pageId, { status: "published", color: "green", when: publishedAt });
  if (!ok) throw new Error(`publishNow: no page "${pageId}" to publish`);
  return { url: `/projects/other/example-content-pipeline#${pageId}`, publishedAt };
}

export const FUNCTIONS: NodeFunction[] = [
  {
    name: "createSitePage",
    paramsIn: { article: "Article", slug: "string" },
    returns: "{ pageId: string }",
    rules: ["deterministic; no AI inside the app"],
  },
  {
    name: "schedulePublication",
    paramsIn: { pageId: "string", publishAt: "ISODate" },
    returns: "{ jobId: string }",
  },
  {
    name: "publishNow",
    paramsIn: { pageId: "string" },
    returns: "{ url: string; publishedAt: ISODate }",
  },
];
