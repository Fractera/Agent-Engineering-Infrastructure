import { readdir, readFile } from "fs/promises"
import { join, resolve, relative, extname } from "path"

// Server util: collect a route's source files (page.tsx/route.ts + everything in
// _components/) for the read-only code viewer. Read-only by contract — callers
// must never write. Security: every resolved path is checked to stay inside the
// app/app root; anything escaping it is refused.

export type SourceFile = { rel: string; content: string; language: string }

const LANG: Record<string, string> = {
  ".ts": "typescript", ".tsx": "typescript",
  ".js": "javascript", ".jsx": "javascript",
  ".json": "json", ".css": "css", ".md": "markdown",
}

function appRoot(): string {
  // process.cwd() is /opt/fractera/app; routes live under app/app/<segments>.
  return resolve(process.cwd(), "app")
}

// Map a route path to its on-disk directory under app/. "/" → app, "/dashboard"
// → app/dashboard, "/project/x" → app/project/x. API paths map straight through
// ("/api/project/default/products" → app/api/project/default/products).
export function routeDir(routePath: string): string {
  const clean = routePath.replace(/^\/+|\/+$/g, "")
  const dir = resolve(appRoot(), clean)
  // Refuse anything that escapes the app root.
  if (dir !== appRoot() && !dir.startsWith(appRoot() + "/")) {
    throw new Error("path escapes app root")
  }
  return dir
}

async function readIfExists(file: string): Promise<string | null> {
  try { return await readFile(file, "utf8") } catch { return null }
}

export async function collectSource(routePath: string): Promise<SourceFile[]> {
  const dir = routeDir(routePath)
  const root = appRoot()
  const out: SourceFile[] = []

  async function add(abs: string) {
    const content = await readIfExists(abs)
    if (content == null) return
    out.push({ rel: relative(root, abs), content, language: LANG[extname(abs)] ?? "plaintext" })
  }

  // The route entry: page.tsx for pages, route.ts for API endpoints. The
  // descriptor (_meta.ts) is intentionally excluded — it is not page code.
  await add(join(dir, "page.tsx"))
  await add(join(dir, "route.ts"))

  // Everything under _components/ (one level; nested kept simple for v1).
  try {
    const compDir = join(dir, "_components")
    for (const name of (await readdir(compDir)).sort()) {
      await add(join(compDir, name))
    }
  } catch { /* no _components — fine */ }

  return out
}
