// THE ONE-ARROW GATE (step 254.2, ROUTE-V3 law 3) — enforces the entity import laws over
// app/(projects)/projects/_shared/entities/:
//   1. view/ may NEVER import admin/ (admin importing view is the allowed direction);
//   2. an entity may NEVER import another entity's folder (no cross-entity coupling).
// Run: npm run check:entity-imports. Exit 1 with a teaching message on any violation.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const ROOT = join(process.cwd(), "app", "(projects)", "projects", "_shared", "entities");

function walk(dir) {
  let out = [];
  let entries = [];
  try { entries = readdirSync(dir); } catch { return out; }
  for (const name of entries) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else if (/\.(ts|tsx)$/.test(name)) out.push(p);
  }
  return out;
}

const files = walk(ROOT);
const violations = [];

for (const file of files) {
  const rel = relative(ROOT, file).split(sep).join("/"); // "<entity>/(view|admin|...)/file"
  const [entity, layer] = rel.split("/");
  const src = readFileSync(file, "utf8");
  // Only REAL import/export statements — a `from "..."` inside a comment is prose (lesson 254.9).
  const imports = [...src.matchAll(/^\s*(?:import|export)[^;\n]*?from\s+["']([^"']+)["']/gm)].map((m) => m[1]);

  for (const imp of imports) {
    // Law 1: a view/ file must not import admin/ (its own or anyone's).
    if (layer === "view" && /(^|\/)admin(\/|$)/.test(imp)) {
      violations.push(
        `${rel}: imports "${imp}" — VIEW MUST NEVER IMPORT ADMIN (the one-arrow law: admin/ may import ` +
        `view/, never the reverse). Move the shared piece into view/ and let admin/ import it.`,
      );
    }
    // Law 2: no cross-entity imports (entities couple only through the base layer / route declarations).
    const m = imp.match(/entities\/([a-z0-9-]+)(\/|$)/) ?? (imp.startsWith("../") ? imp.match(/^\.\.\/(?:\.\.\/)*([a-z0-9-]+)\//) : null);
    if (imp.includes("entities/")) {
      const target = imp.match(/entities\/([a-z0-9-]+)/)?.[1];
      if (target && target !== entity) {
        violations.push(
          `${rel}: imports "${imp}" — AN ENTITY MUST NEVER IMPORT ANOTHER ENTITY (${entity} → ${target}). ` +
          `Entities compose only in the page container; share code via the base layer.`,
        );
      }
    }
    void m;
  }
}

if (violations.length) {
  console.error(`check:entity-imports — ${violations.length} violation(s):\n`);
  for (const v of violations) console.error("  ✗ " + v);
  process.exit(1);
}
console.log(`check:entity-imports — OK (${files.length} files scanned, one-arrow law holds)`);
