import { stat } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// NODE COMPILE (step 249) — what makes "saved the node → it runs" true, with NO application rebuild.
//
// Until now a node's behaviour reached the executor only through the generated static-import registry
// (_generated/executables.ts), i.e. through a FULL `next build` (~5-10 min on a small VPS) after every
// materialize. The owner's verdict: editing one node must never rebuild the whole app. So materialize now
// bundles the node's functions.ts into a self-contained ES module right next to it
// (_nodes/<slug>/functions.compiled.mjs), and the executor imports THAT file from disk at runtime —
// the registry stays only as the fallback for nodes compiled before this step.
//
// WHY A BUNDLE AND NOT A BARE TRANSPILE: node functions legitimately import runtime app libraries
// (@/lib/dashboard-rows, _shared/external-ai → @/lib/quiz). Those are plain Node + better-sqlite3 code
// (no next/* imports anywhere — verified), so esbuild folds the whole closure into one file; only the
// native module stays external and resolves from projects-app/node_modules at import time.
//
// The compile is FAST (tens of ms) and its error text goes straight back to the coding agent — a node
// that does not compile is refused at materialize, never discovered later by a broken run.

const COMPILED_NAME = "functions.compiled.mjs";

export function compiledPath(projectDir: string, slug: string): string {
  return join(projectDir, "_nodes", slug, COMPILED_NAME);
}

export type CompileResult = { ok: true; file: string } | { ok: false; error: string };

/** Bundle _nodes/<slug>/functions.ts into functions.compiled.mjs (self-contained, ESM, node platform). */
export async function compileNode(projectDir: string, slug: string): Promise<CompileResult> {
  const entry = join(projectDir, "_nodes", slug, "functions.ts");
  const outfile = compiledPath(projectDir, slug);
  try {
    const esbuild = await import("esbuild");
    await esbuild.build({
      entryPoints: [entry],
      outfile,
      bundle: true,
      format: "esm",
      platform: "node",
      target: "node20",
      sourcemap: false,
      logLevel: "silent",
      // "@/..." is the app's tsconfig alias — point it at the projects-app root, same as tsconfig paths.
      alias: { "@": process.cwd() },
      external: ["better-sqlite3"],
      // Bundled CJS dependencies may still call require()/__dirname at runtime — give the ESM output a
      // real require (the standard esbuild node-esm shim).
      banner: {
        js: `import { createRequire as __fractera_cr } from "node:module";\nconst require = __fractera_cr(import.meta.url);\n`,
      },
    });
    return { ok: true, file: outfile };
  } catch (e) {
    // esbuild throws an object carrying .errors[] — flatten to the readable text the coding agent needs.
    const errs = (e as { errors?: { text?: string; location?: { file?: string; line?: number } }[] }).errors;
    const flat = Array.isArray(errs) && errs.length
      ? errs.map((x) => `${x.location?.file ?? entry}:${x.location?.line ?? "?"} ${x.text ?? ""}`).join("\n")
      : ((e as Error).message ?? String(e));
    return { ok: false, error: flat };
  }
}

/** The runtime module of a node, when its compiled artifact exists and is not older than its source.
 *  Returns null when there is nothing (or something stale) to load — the caller falls back to the
 *  generated registry. The mtime rides the import URL as a cache-buster, so a re-materialized node is
 *  re-imported without a process restart (ESM caches by exact URL). */
export async function loadCompiledNode(projectDir: string, slug: string): Promise<Record<string, unknown> | null> {
  const file = compiledPath(projectDir, slug);
  const src = join(projectDir, "_nodes", slug, "functions.ts");
  try {
    const [artifact, source] = await Promise.all([stat(file), stat(src)]);
    if (artifact.mtimeMs < source.mtimeMs) return null; // stale — the source changed without a compile
    const url = `${pathToFileURL(file).href}?v=${Math.trunc(artifact.mtimeMs)}`;
    // An indirect import defeats the app bundler's static analysis: this must stay a REAL runtime
    // import of a file URL, never something webpack/turbopack tries to resolve at build time.
    const importer = new Function("u", "return import(u)") as (u: string) => Promise<Record<string, unknown>>;
    return await importer(url);
  } catch {
    return null;
  }
}

/** Whether a runtime artifact exists at all (fresh or not) — used by the activation gate together with
 *  the registry, so a just-materialized node counts as executable before any rebuild. */
export async function hasCompiledNode(projectDir: string, slug: string): Promise<boolean> {
  try {
    await stat(compiledPath(projectDir, slug));
    return true;
  } catch {
    return false;
  }
}
