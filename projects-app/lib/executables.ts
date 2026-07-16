import { readdir, readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";

// THE EXECUTABLES REGISTRY (step 241) — how the general executor gets from "a node's cuid" to "the real
// compiled function".
//
// WHY A GENERATED REGISTRY AND NOT A DYNAMIC IMPORT: a node's code lives at
// app/(projects)/projects/<cat>/<slug>/_nodes/<node>/functions.ts. A path built at runtime cannot be imported
// — the folder name "(projects)" is a Next.js route group, and a template-literal import() is not statically
// analysable, so the bundler never includes those modules (proven the hard way in step 214). The one thing
// that DOES work is what step 238 Phase 3 used: an ordinary static import of the module. So we GENERATE a
// file full of static import() entries — one per node — and the executor looks its node up there. The
// generated file is code, so the bundler sees every node; the registry is regenerated whenever the set of
// nodes changes (create / materialize / delete), exactly like _data/diagram.ts.
//
// The key is "<category>/<slug>:<nodeSlug>" — the automation plus the node, which is what the executor holds.

const GENERATED_REL = join("app", "(projects)", "projects", "_generated", "executables.ts");

function projectsRoot(): string {
  return join(process.cwd(), "app", "(projects)", "projects");
}

/** Every (automation, nodeSlug) pair that has a functions.ts on disk, sorted for a stable, diffable file. */
async function scanNodes(): Promise<{ automation: string; node: string }[]> {
  const root = projectsRoot();
  const out: { automation: string; node: string }[] = [];
  const categories = (await readdir(root, { withFileTypes: true }).catch(() => []))
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name);
  for (const category of categories.sort()) {
    const projects = (await readdir(join(root, category), { withFileTypes: true }).catch(() => []))
      .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
      .map((d) => d.name);
    for (const project of projects.sort()) {
      const nodesDir = join(root, category, project, "_nodes");
      const nodes = (await readdir(nodesDir, { withFileTypes: true }).catch(() => []))
        .filter((d) => d.isDirectory())
        .map((d) => d.name);
      for (const node of nodes.sort()) {
        const src = await readFile(join(nodesDir, node, "functions.ts"), "utf8").catch(() => "");
        // Only a node with REAL exported function bodies is executable. A draft (a signature-only stub) is
        // deliberately left out: the executor must refuse to run it, not import an empty module.
        if (!/export\s+(async\s+)?function\s+\w+/.test(src)) continue;
        out.push({ automation: `${category}/${project}`, node });
      }
    }
  }
  return out;
}

/** Every automation that DECLARES its activation (_data/activation.ts) — the launch parameters one run of it
 *  takes (step 241 E3). Same reason as the node scan: the file must be reachable by a STATIC import. */
async function scanActivations(): Promise<string[]> {
  const root = projectsRoot();
  const out: string[] = [];
  const categories = (await readdir(root, { withFileTypes: true }).catch(() => []))
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name);
  for (const category of categories.sort()) {
    const projects = (await readdir(join(root, category), { withFileTypes: true }).catch(() => []))
      .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
      .map((d) => d.name);
    for (const project of projects.sort()) {
      const src = await readFile(join(root, category, project, "_data", "activation.ts"), "utf8").catch(() => "");
      if (!/export\s+const\s+ACTIVATION\b/.test(src)) continue;
      out.push(`${category}/${project}`);
    }
  }
  return out;
}

/** Every automation that DECLARES dashboard tables (_data/dashboard.ts, `export const PROJECT_DASHBOARD`) —
 *  the architecture bundle reads the REAL typed config through this registry (owner 2026-07-16, per-table
 *  dashboard slice), never a regex parse. Same static-import trick as nodes/activations. */
async function scanDashboards(): Promise<string[]> {
  const root = projectsRoot();
  const out: string[] = [];
  const categories = (await readdir(root, { withFileTypes: true }).catch(() => []))
    .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
    .map((d) => d.name);
  for (const category of categories.sort()) {
    const projects = (await readdir(join(root, category), { withFileTypes: true }).catch(() => []))
      .filter((d) => d.isDirectory() && !d.name.startsWith("_"))
      .map((d) => d.name);
    for (const project of projects.sort()) {
      const src = await readFile(join(root, category, project, "_data", "dashboard.ts"), "utf8").catch(() => "");
      if (!/export\s+const\s+PROJECT_DASHBOARD\b/.test(src)) continue;
      out.push(`${category}/${project}`);
    }
  }
  return out;
}

/** Rewrite app/(projects)/projects/_generated/executables.ts from what is on disk. Called wherever the set of
 *  nodes changes (create / materialize / delete) — the same places that regenerate _data/diagram.ts. */
export async function regenerateExecutables(): Promise<{ count: number; file: string }> {
  const nodes = await scanNodes();
  const entries = nodes
    .map(({ automation, node }) => {
      const [category, project] = automation.split("/");
      const rel = `../${category}/${project}/_nodes/${node}/functions`;
      return `  ${JSON.stringify(`${automation}:${node}`)}: () => import(${JSON.stringify(rel)}),`;
    })
    .join("\n");

  const activations = await scanActivations();
  const activationEntries = activations
    .map((automation) => {
      const [category, project] = automation.split("/");
      return `  ${JSON.stringify(automation)}: () => import(${JSON.stringify(`../${category}/${project}/_data/activation`)}),`;
    })
    .join("\n");

  const dashboards = await scanDashboards();
  const dashboardEntries = dashboards
    .map((automation) => {
      const [category, project] = automation.split("/");
      return `  ${JSON.stringify(automation)}: () => import(${JSON.stringify(`../${category}/${project}/_data/dashboard`)}),`;
    })
    .join("\n");

  const body = `// GENERATED — do not edit by hand (lib/executables.ts, step 241).
// One static import() per executable node: the bundler sees them all, so the general executor can call any
// node's REAL compiled functions without a runtime path (which a "(projects)" route group makes impossible).
// Regenerated whenever a node is created, materialized or deleted — like _data/diagram.ts.
//
// ACTIVATIONS (E3): the same trick for each automation's _data/activation.ts — the launch parameters ONE RUN
// of it takes. The control panel renders itself from that declaration and the executor validates a fork
// against it, so both read the automation's own file rather than presuming anything.

export type NodeModule = Record<string, unknown>;
export type ActivationModule = Record<string, unknown>;
export type DashboardModule = Record<string, unknown>;

export const EXECUTABLES: Record<string, () => Promise<NodeModule>> = {
${entries}
};

export const ACTIVATIONS: Record<string, () => Promise<ActivationModule>> = {
${activationEntries}
};

// DASHBOARDS (owner 2026-07-16): each automation's _data/dashboard.ts (PROJECT_DASHBOARD) — the architecture
// bundle reads the real typed table configs (columns, actions) through this, never a regex parse.
export const DASHBOARDS: Record<string, () => Promise<DashboardModule>> = {
${dashboardEntries}
};

export function executableKeys(): string[] {
  return Object.keys(EXECUTABLES);
}
`;
  const file = join(process.cwd(), GENERATED_REL);
  await mkdir(join(process.cwd(), "app", "(projects)", "projects", "_generated"), { recursive: true });
  await writeFile(file, body, "utf8");
  return { count: nodes.length, file };
}
