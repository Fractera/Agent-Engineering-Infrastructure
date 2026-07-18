import { readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

// PAGE COMPILE (step 254.16, ROUTE-V3 law 7) — the step-249 light loop extended from node functions to
// UI: an owner-commissioned custom page (pages/<slug>/page.tsx inside the route) compiles to
// page.compiled.mjs and is LIVE the moment it compiles — no application rebuild, ever. The static host
// route (<route>/p/page.tsx, born with the automation) dynamic-imports the artifact with an mtime
// cache-bust, exactly like the node executor does.
//
// THE DEPENDENCY CONTRACT (v1, deliberately strict): a runtime page is SELF-CONTAINED —
//   - an async server component: `export default async function Page() { ... }`;
//   - plain JSX (the jsx-runtime is bundled in; no explicit react import needed);
//   - data via the global fetch, against the route's OWN api doors (law 6):
//     http://localhost:3003/projects/<cat>/<slug>/api/rows etc.;
//   - styling via inline styles / the utility classes already in the app bundle;
//   - ANY import statement is a COMPILE ERROR with a teaching message (the UI kit and client islands
//     are the next iteration of this contract — recorded, not silently allowed: a foreign import that
//     "works today" becomes an unownable dependency tomorrow).

const COMPILED_NAME = "page.compiled.mjs";
const PAGE_SLUG = /^[a-z][a-z0-9-]*$/;

export function compiledPagePath(projectDir: string, page: string): string {
  return join(projectDir, "pages", page, COMPILED_NAME);
}

export type PageCompileResult = { ok: true; file: string } | { ok: false; error: string };

export async function compilePage(projectDir: string, page: string): Promise<PageCompileResult> {
  if (!PAGE_SLUG.test(page)) return { ok: false, error: "invalid page slug (kebab-case, starts with a letter)" };
  const entry = join(projectDir, "pages", page, "page.tsx");
  let src: string;
  try { src = await readFile(entry, "utf8"); } catch {
    return { ok: false, error: `pages/${page}/page.tsx does not exist — author the page source first` };
  }

  // THE CONTRACT GATE — refuse imports BEFORE esbuild, with the teaching text (real statements only,
  // the 254.9 lesson: comment prose is not a dependency).
  const imports = [...src.matchAll(/^\s*(?:import|export)[^;\n]*?from\s+["']([^"']+)["']/gm)].map((m) => m[1]);
  const foreign = imports.filter((i) => i !== "react" && i !== "react/jsx-runtime");
  if (foreign.length) {
    return {
      ok: false,
      error:
        `the page imports [${foreign.join(", ")}] — a runtime page is SELF-CONTAINED (the dependency ` +
        `contract, ROUTE-V3 law 7): no imports. Write an async server component with plain JSX, fetch ` +
        `data from this automation's own api (/projects/<cat>/<slug>/api/...), style with inline styles ` +
        `or existing utility classes. The UI kit joins the contract in a later iteration.`,
    };
  }

  try {
    const esbuild = await import("esbuild");
    await esbuild.build({
      entryPoints: [entry],
      outfile: compiledPagePath(projectDir, page),
      bundle: true,
      format: "esm",
      platform: "node",
      target: "node20",
      jsx: "automatic",
      sourcemap: false,
      logLevel: "silent",
      banner: {
        js: `import { createRequire as __fractera_cr } from "node:module";\nconst require = __fractera_cr(import.meta.url);\n`,
      },
    });
    return { ok: true, file: compiledPagePath(projectDir, page) };
  } catch (e) {
    const errs = (e as { errors?: { text?: string; location?: { file?: string; line?: number } }[] }).errors;
    const flat = Array.isArray(errs) && errs.length
      ? errs.map((x) => `${x.location?.file ?? entry}:${x.location?.line ?? "?"} ${x.text ?? ""}`).join("\n")
      : ((e as Error).message ?? String(e));
    return { ok: false, error: flat };
  }
}

/** The page's runtime module, mtime-cache-busted — null when absent or stale (source newer). */
export async function loadCompiledPage(projectDir: string, page: string): Promise<{ default: (props: Record<string, unknown>) => unknown } | null> {
  if (!PAGE_SLUG.test(page)) return null;
  const file = compiledPagePath(projectDir, page);
  const src = join(projectDir, "pages", page, "page.tsx");
  try {
    const [artifact, source] = await Promise.all([stat(file), stat(src)]);
    if (artifact.mtimeMs < source.mtimeMs) return null;
    const url = `${pathToFileURL(file).href}?v=${Math.trunc(artifact.mtimeMs)}`;
    const importer = new Function("u", "return import(u)") as (u: string) => Promise<{ default: (props: Record<string, unknown>) => unknown }>;
    return await importer(url);
  } catch {
    return null;
  }
}
