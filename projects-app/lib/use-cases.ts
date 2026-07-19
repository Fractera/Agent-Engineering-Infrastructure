import { createHash } from "node:crypto";
import { readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/lib/db";
import { createNodeId } from "@/lib/cuid";
import { writeVersionByRef, nextVersionByRef } from "@/lib/entity-store";

// USER CASES (step 231) — the automation's scenarios, and the FIRST stage of its life. The owner's rule:
// an automation cannot be created from an instruction alone. Before any node is designed, the Quiz collects
// the use cases (free speech, voice encouraged), and before any development step is handed to a coding
// agent, the owner must read the cases back and confirm the AI understood him.
//
// STORAGE — the same Model-B split the diagram uses (lib/nodes.ts): the DB row is the SOURCE (so the panel
// updates without a rebuild), _data/use-cases.ts is the REGENERATED file artefact (so the coding agent, the
// build, and a fresh clone of the repo see the cases as code). Never hand-edit the generated file.

export type UseCaseRow = {
  cuid: string; automation: string; ord: number; title: string; summary: string; status: string;
};

/** The lifecycle statuses (mirrors _shared/use-cases.ts — kept as a plain list on the server side). */
export const USE_CASE_STATUSES = [
  "new", "in-approval", "approved", "in-development", "testing", "in-use",
] as const;

export async function listCases(automation: string): Promise<UseCaseRow[]> {
  return (await db.prepare(
    `SELECT cuid, automation, ord, title, summary, status FROM automation_use_cases
     WHERE automation = ? ORDER BY ord ASC`,
  ).all(automation)) as UseCaseRow[];
}

export async function caseByCuid(cuid: string): Promise<UseCaseRow | undefined> {
  return (await db.prepare(
    `SELECT cuid, automation, ord, title, summary, status FROM automation_use_cases WHERE cuid = ?`,
  ).get(cuid)) as UseCaseRow | undefined;
}

async function nextOrd(automation: string): Promise<number> {
  const r = (await db.prepare(
    `SELECT COALESCE(MAX(ord), -1) + 1 AS n FROM automation_use_cases WHERE automation = ?`,
  ).get(automation)) as { n: number };
  return r.n;
}

export async function addCase(
  automation: string,
  c: { title: string; summary?: string; status?: string },
): Promise<UseCaseRow> {
  const cuid = createNodeId();
  await db.prepare(
    `INSERT INTO automation_use_cases (cuid, automation, ord, title, summary, status)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(cuid, automation, await nextOrd(automation), c.title.slice(0, 200), (c.summary ?? "").trim(), c.status ?? "new");
  return (await caseByCuid(cuid)) as UseCaseRow;
}

/** Archives the case's CURRENT (about-to-be-superseded) state into entity_history before a mutation lands —
 *  the "a status transition archives the outgoing state" half of the step-238 standard. CUID-scoped like
 *  node/edge (a case's cuid is already globally unique), so this reuses the same ref-based helpers. */
async function archiveCaseVersion(row: UseCaseRow, reason: string): Promise<void> {
  const version = await nextVersionByRef("usecase", row.cuid);
  await writeVersionByRef(row.automation, "usecase", row.cuid, version, {
    title: row.title, summary: row.summary, status: row.status, ord: row.ord, reason,
  }, null);
}

export async function updateCase(
  cuid: string,
  patch: { title?: string; summary?: string; status?: string },
): Promise<void> {
  const cur = await caseByCuid(cuid);
  if (!cur) return;
  const statusChanged = patch.status !== undefined && patch.status !== cur.status;
  await archiveCaseVersion(cur, statusChanged ? `status: ${cur.status} -> ${patch.status}` : "edited");
  await db.prepare(
    `UPDATE automation_use_cases SET title = ?, summary = ?, status = ?, updated_at = ? WHERE cuid = ?`,
  ).run(
    (patch.title ?? cur.title).slice(0, 200),
    patch.summary ?? cur.summary,
    patch.status ?? cur.status,
    new Date().toISOString(),
    cuid,
  );
}

export async function deleteCase(cuid: string): Promise<void> {
  const cur = await caseByCuid(cuid);
  if (cur) await archiveCaseVersion(cur, "deleted");
  await db.prepare(`DELETE FROM automation_use_cases WHERE cuid = ?`).run(cuid);
}

// ─── the file artefact ───────────────────────────────────────────────────────────────────────────────

const esc = (s: string) => s.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\r?\n/g, "\\n");

/** Regenerate the project's _data/use-cases.ts from the DB (the diagram's `regenerateDiagram` pattern). */
export async function regenerateUseCasesFile(projectDir: string, automation: string): Promise<void> {
  const cases = await listCases(automation);
  const rows = cases
    .map((c) => `  { id: "${esc(c.cuid)}", title: "${esc(c.title)}", status: "${c.status}", summary: "${esc(c.summary)}" },`)
    .join("\n");
  // v16 routes (254.9) carry their OWN _types/use-cases — the artefact must import THAT, or check:route
  // flags every quiz-born route (caught live on automation-48qwh, 263.1). Pre-v16 routes keep _shared.
  const hasOwnTypes = await stat(join(projectDir, "_types", "use-cases.ts")).then(() => true).catch(() => false);
  const contract = hasOwnTypes ? "../_types/use-cases" : "../../../_shared/use-cases";
  const body =
    `import type { UseCase } from "${contract}";\n\n` +
    `// GENERATED from the use-case store (step 231) — the cases the owner described in the Quiz, in order.\n` +
    `// The DB is the source; this file is the artefact the build and the coding agent read. Do not hand-edit:\n` +
    `// it is rewritten on every add / edit / delete. To change a case, use the pencil in the Use cases panel.\n` +
    `export const USE_CASES: UseCase[] = [\n${rows || "  // no cases yet — the Quiz collects them first"}\n];\n`;
  await mkdir(join(projectDir, "_data"), { recursive: true });
  await writeFile(join(projectDir, "_data", "use-cases.ts"), body, "utf8");
}

/** Lift the cases an OLD project already carries in its _data/use-cases.ts into the store, once. Projects
 *  born before this step (telegram-notes) keep their cases; the store then owns them. Idempotent: it only
 *  ever runs while the store is empty for this automation. */
export async function seedStoreFromFile(automation: string, projectDir: string): Promise<void> {
  const have = await listCases(automation);
  if (have.length) return;
  const src = await readFile(join(projectDir, "_data", "use-cases.ts"), "utf8").catch(() => "");
  if (!src) return;
  // The generated shape is flat and quoted — parse it with a tolerant regex rather than importing TS.
  const blocks = [...src.matchAll(/\{[^{}]*\}/g)].map((m) => m[0]);
  for (const b of blocks) {
    const f = (k: string) => (b.match(new RegExp(`${k}\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`)) ?? [])[1];
    const title = f("title");
    if (!title) continue;
    const status = f("status") ?? "new";
    await addCase(automation, {
      title: title.replace(/\\n/g, "\n").replace(/\\"/g, '"'),
      summary: (f("summary") ?? "").replace(/\\n/g, "\n").replace(/\\"/g, '"'),
      status: (USE_CASE_STATUSES as readonly string[]).includes(status) ? status : "new",
    });
  }
}

// ─── the review gate ─────────────────────────────────────────────────────────────────────────────────

/** WHAT the owner confirms: the exact set of cases, in order. Any add / edit / delete changes this hash and
 *  the confirmation goes stale — the next development step asks for it again. */
export function caseSetHash(cases: UseCaseRow[]): string {
  const payload = cases.map((c) => `${c.cuid}|${c.title}|${c.summary}`).join("\n");
  return createHash("sha256").update(payload).digest("hex").slice(0, 32);
}

export type ReviewState = { reviewed: boolean; hasCases: boolean; reviewedAt: string | null };

export async function reviewState(automation: string): Promise<ReviewState> {
  const cases = await listCases(automation);
  const row = (await db.prepare(
    `SELECT reviewed_at, reviewed_hash FROM automation_use_cases_review WHERE automation = ?`,
  ).get(automation)) as { reviewed_at: string; reviewed_hash: string } | undefined;
  const fresh = Boolean(row && cases.length && row.reviewed_hash === caseSetHash(cases));
  return { reviewed: fresh, hasCases: cases.length > 0, reviewedAt: fresh ? row!.reviewed_at : null };
}

/** The owner pressed "I read them — the AI understood me". Records what he confirmed, and moves every case
 *  that was still `new` to `approved` (the lifecycle's agreement point). */
export async function confirmReview(automation: string): Promise<ReviewState> {
  const cases = await listCases(automation);
  if (!cases.length) return { reviewed: false, hasCases: false, reviewedAt: null };
  for (const c of cases) {
    if (c.status === "new" || c.status === "in-approval") await updateCase(c.cuid, { status: "approved" });
  }
  const fresh = await listCases(automation);
  const at = new Date().toISOString();
  await db.prepare(`DELETE FROM automation_use_cases_review WHERE automation = ?`).run(automation);
  await db.prepare(
    `INSERT INTO automation_use_cases_review (automation, reviewed_at, reviewed_hash) VALUES (?, ?, ?)`,
  ).run(automation, at, caseSetHash(fresh));
  return { reviewed: true, hasCases: true, reviewedAt: at };
}

/** THE GATE (step 231) — every path that materializes a development step calls this first. No cases, or a
 *  case set the owner has not confirmed since it last changed → the step is refused.
 *
 *  It returns only the REASON, never the sentence: the owner-facing text lives in one place (the ten-language
 *  table in lib/quiz.ts) and the routes attach it in his language. Keeping the text out of here also keeps
 *  the import one-way (quiz → use-cases), with no cycle. */
export async function assertUseCasesReviewed(
  automation: string,
): Promise<{ ok: true } | { ok: false; reason: "no-cases" | "not-reviewed" }> {
  const st = await reviewState(automation);
  if (!st.hasCases) return { ok: false, reason: "no-cases" };
  if (!st.reviewed) return { ok: false, reason: "not-reviewed" };
  return { ok: true };
}
