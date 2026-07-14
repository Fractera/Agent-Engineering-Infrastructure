import { mkdir, writeFile, readFile, rm, rmdir } from "node:fs/promises";
import { join, resolve } from "node:path";

// APPLICATION-PAGES README STORE (step 242) — a trimmed, filesystem-KEYED copy of the service Architecture
// page's readme-file.ts (`bridges/app/lib/architecture/readme-file.ts`). The automation owner declares PUBLIC
// pages in the application layer (the slot `app/`) for EXTERNAL users of their automation; each declared page
// is a folder with a README.md carrying a machine block + a to-do list a coding agent picks up. Same idea as
// the architect's Architecture page, but: OWNER-facing (projects-app :3003), pages default under `[lang]`
// (multilingual), and each README is TAGGED with the automation that spawned it.
//
// WHY REL-KEYED (not URL-keyed like the service page): the service page keys READMEs by URL path, which drops
// the `[lang]` segment — fine for its architect-only, non-localized service pages, but it cannot address a
// multilingual page at `app/[lang]/<slug>/`. This store keys everything by the FILESYSTEM rel path under the
// slot's `app/` (e.g. "[lang]/calorie"), so a localized page is addressed unambiguously. The URL is a derived
// display field only.
//
// FAULT ISOLATION (owner's requirement): projects-app reaches the slot fs directly via slotRoot() — the SAME
// accessor lib/dev-steps.ts uses — so :3003 never calls :3002. The slot README is the shared source of truth
// on disk; only the runtime component is copied, not shared.

function slotRoot(): string {
  const override = process.env.SLOT_DIR;
  if (override) return resolve(override);
  return resolve(process.cwd(), "../app");
}
export function appRoot(): string {
  return resolve(slotRoot(), "app");
}

/** Filesystem dir for a rel path under the slot app, with an escape guard (a rel can never climb out). */
export function dirForRel(rel: string): string {
  const clean = rel.replace(/^\/+|\/+$/g, "");
  const root = appRoot();
  const dir = clean ? resolve(root, clean) : root;
  if (dir !== root && !dir.startsWith(root + "/")) throw new Error("path escapes app root");
  return dir;
}

/** A rel path → the URL it serves (strip route groups + a leading [lang], keep other dynamic segments) —
 *  mirrors fs-scan.ts toPath, for display only. */
export function relToUrl(rel: string): string {
  const segs = rel.split("/").filter(Boolean);
  const out: string[] = [];
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (s.startsWith("(") && s.endsWith(")")) continue;
    if (i === 0 && s === "[lang]") continue;
    out.push(s);
  }
  return out.length ? "/" + out.join("/") : "/";
}

export type Task = { id: string; body: string };
export type PageMeta = {
  rel: string;                 // filesystem rel under slot app — the key
  title: string;
  kind: "page" | "api";
  dynamic: boolean;
  description?: string | null;
  visibility: "public" | "rolesOnly";  // declared pages default public (external users)
  roles?: string[];
  automation?: string | null;  // the automation that declared this page (step 242 association)
  multilingual: boolean;       // rendered under [lang] for 10 locales
  tasks: Task[];
};

const META_OPEN = "<!-- fractera:apppage";
const META_CLOSE = "-->";

// ---- id helpers (base64url, opaque to the UI) --------------------------------
export function taskClientId(rel: string, taskId: string): string {
  return Buffer.from(rel, "utf8").toString("base64url") + "~" + taskId;
}
export function parseTaskClientId(token: string): { rel: string; taskId: string } {
  const i = token.indexOf("~");
  const p = i < 0 ? token : token.slice(0, i);
  return { rel: Buffer.from(p, "base64url").toString("utf8"), taskId: i < 0 ? "" : token.slice(i + 1) };
}

function metaFromRel(rel: string): PageMeta {
  const segs = rel.replace(/^\/+|\/+$/g, "").split("/").filter(Boolean);
  const last = segs[segs.length - 1] ?? "";
  const dynamic = last.startsWith("[") && last.endsWith("]");
  return {
    rel, title: last || rel, kind: "page", dynamic,
    visibility: "public", multilingual: segs[0] === "[lang]", automation: null, tasks: [],
  };
}

// ---- render (structured → markdown + machine block) --------------------------
function renderBody(m: PageMeta): string {
  const lines: string[] = [];
  lines.push(`# ${m.title}`, "");
  lines.push(`> A PUBLIC application page, declared by the automation owner for EXTERNAL users.`);
  lines.push(`> This README is the record a coding agent reads to build / change this page.`, "");
  lines.push(`- **URL:** \`${relToUrl(m.rel)}\``);
  lines.push(`- **Folder:** \`app/${m.rel}\``);
  lines.push(`- **Kind:** ${m.kind}`);
  lines.push(`- **Visible to:** ${m.visibility === "rolesOnly" ? `role(s): ${(m.roles ?? []).join(", ") || "—"}` : "EVERYONE (public)"}`);
  lines.push(`- **Multilingual:** ${m.multilingual ? "yes — build under [lang] for all locales" : "no"}`);
  if (m.automation) lines.push(`- **Declared by automation:** \`${m.automation}\``);
  if (m.description) lines.push(`- **Description:** ${m.description}`);
  lines.push("");
  lines.push("## To-do (for the agent)");
  if (m.tasks.length === 0) lines.push("_No open tasks._");
  else for (const t of m.tasks) lines.push(`- ${t.body}`);
  lines.push("");
  return lines.join("\n");
}

function render(m: PageMeta): string {
  const machine = {
    title: m.title, kind: m.kind, dynamic: m.dynamic, description: m.description ?? null,
    visibility: m.visibility, roles: m.roles, automation: m.automation ?? null,
    multilingual: m.multilingual, tasks: m.tasks,
  };
  return `${renderBody(m)}\n${META_OPEN}\n${JSON.stringify(machine)}\n${META_CLOSE}\n`;
}

// ---- read / write ------------------------------------------------------------
export async function readMeta(rel: string): Promise<PageMeta | null> {
  let text = "";
  try { text = await readFile(join(dirForRel(rel), "README.md"), "utf8"); } catch { return null; }
  const start = text.indexOf(META_OPEN);
  if (start >= 0) {
    const end = text.indexOf(META_CLOSE, start);
    try {
      const d = JSON.parse(text.slice(start + META_OPEN.length, end).trim());
      return {
        rel,
        title: String(d.title ?? rel),
        kind: d.kind === "api" ? "api" : "page",
        dynamic: !!d.dynamic,
        description: d.description ?? null,
        visibility: d.visibility === "rolesOnly" ? "rolesOnly" : "public",
        roles: Array.isArray(d.roles) ? d.roles.map(String) : undefined,
        automation: d.automation ? String(d.automation) : null,
        multilingual: !!d.multilingual,
        tasks: Array.isArray(d.tasks) ? d.tasks.map((t: { id?: unknown; body?: unknown }) => ({ id: String(t?.id ?? crypto.randomUUID()), body: String(t?.body ?? "") })).filter((t: Task) => t.body) : [],
      };
    } catch { /* fall through */ }
  }
  // A human-authored README without our machine block: read the H1 as the title.
  const m = metaFromRel(rel);
  m.title = (text.match(/^#\s+(.+)$/m)?.[1] ?? m.title).trim();
  return m;
}

export async function writeMeta(m: PageMeta): Promise<void> {
  const dir = dirForRel(m.rel);
  await mkdir(dir, { recursive: true });
  await writeFile(join(dir, "README.md"), render(m), "utf8");
}

export async function removeReadme(rel: string): Promise<void> {
  const dir = dirForRel(rel);
  try { await rm(join(dir, "README.md")); } catch { /* already gone */ }
  try { await rmdir(dir); } catch { /* folder not empty (a built page) — leave it */ }
}

// ---- task mutations (read-modify-write the whole file) -----------------------
export async function addTask(rel: string, body: string): Promise<Task> {
  const m = (await readMeta(rel)) ?? metaFromRel(rel);
  const task: Task = { id: crypto.randomUUID(), body: body.trim() };
  m.tasks.push(task);
  await writeMeta(m);
  return task;
}

export async function removeTask(rel: string, taskId: string): Promise<void> {
  const m = await readMeta(rel);
  if (!m) return;
  m.tasks = m.tasks.filter((t) => t.id !== taskId);
  await writeMeta(m);
}

export async function clearTasks(rel: string): Promise<void> {
  const m = await readMeta(rel);
  if (!m) return;
  m.tasks = [];
  await writeMeta(m);
}
