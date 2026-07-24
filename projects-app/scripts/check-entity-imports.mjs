// THE IMPORT-LAW GATE. Two laws over two territories:
//
// A) THE ONE-ARROW LAW over app/(projects)/projects/_shared/entities/ (step 254.2, ROUTE-V3 law 3):
//    1. view/ may NEVER import admin/ (admin importing view is the allowed direction);
//    2. an entity may NEVER import another entity's folder (no cross-entity coupling).
//
// B) THE ONE-EXTERNAL-PATH LAW over a v2 automation's _components/ surface (step 298, RESILIENCE law
//    "production hard, development soft"): the runtime/public component layer is self-contained and reaches
//    NOTHING outside its own folder — with ONE exception, the soft dev/admin layer `_shared-v2`, and it may
//    be imported ONLY from the fail-silent dev-slot files. A public/runtime component that imports
//    `_shared-v2` (or any other outside path) is the violation: production must never depend on the dev
//    layer's life. 🔒 Weakening this to make an import pass is itself the violation.
//
// Run: npm run check:entity-imports. Exit 1 with a teaching message on any violation.
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const PROJECTS = join(process.cwd(), "app", "(projects)", "projects");
const ENTITIES_ROOT = join(PROJECTS, "_shared", "entities");

// v2 automation folders whose _components/ surface obeys the one-external-path law. The frozen template is
// the canonical case; add clones here as they graduate to the v2 two-layer model.
const V2_AUTOMATIONS = [join("other", "frozen-template-v-2")];
// The ONE allowed external path, and the ONLY files inside the folder permitted to import it.
const DEV_LAYER = "_shared-v2";
const DEV_SLOT_FILES = new Set(["_components/shared/dev-slot.tsx", "_components/shared/dev-slot.client.tsx"]);

// Only REAL import/export statements — a `from "..."` inside a comment is prose (lesson 254.9).
const importsOf = (src) =>
  [...src.matchAll(/^\s*(?:import|export)[^;\n]*?from\s+["']([^"']+)["']/gm)].map((m) => m[1]);

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

const violations = [];

// ── A) THE ONE-ARROW LAW over _shared/entities/ ────────────────────────────────────────────────────────
const entityFiles = walk(ENTITIES_ROOT);
for (const file of entityFiles) {
  const rel = relative(ENTITIES_ROOT, file).split(sep).join("/"); // "<entity>/(view|admin|...)/file"
  const [entity, layer] = rel.split("/");
  for (const imp of importsOf(readFileSync(file, "utf8"))) {
    if (layer === "view" && /(^|\/)admin(\/|$)/.test(imp)) {
      violations.push(
        `_shared/entities/${rel}: imports "${imp}" — VIEW MUST NEVER IMPORT ADMIN (the one-arrow law: ` +
        `admin/ may import view/, never the reverse). Move the shared piece into view/ and let admin/ import it.`,
      );
    }
    if (imp.includes("entities/")) {
      const target = imp.match(/entities\/([a-z0-9-]+)/)?.[1];
      if (target && target !== entity) {
        violations.push(
          `_shared/entities/${rel}: imports "${imp}" — AN ENTITY MUST NEVER IMPORT ANOTHER ENTITY (${entity} ` +
          `→ ${target}). Entities compose only in the page container; share code via the base layer.`,
        );
      }
    }
  }
}

// ── B) THE ONE-EXTERNAL-PATH LAW over each v2 automation's _components/ ─────────────────────────────────
// A relative import that climbs at or above the automation-folder root is "outside"; so is any "@/..." or
// any "_shared" path. Of everything outside, exactly ONE target is lawful — the dev layer `_shared-v2` — and
// only from the dev-slot files. `_shared-v2` is matched BEFORE the v1 `_shared` so the two never blur.
let scannedComponentFiles = 0;
for (const auto of V2_AUTOMATIONS) {
  const folder = join(PROJECTS, auto);
  const componentsRoot = join(folder, "_components");
  if (!existsSync(componentsRoot)) continue;
  for (const file of walk(componentsRoot)) {
    scannedComponentFiles++;
    const relFolder = relative(folder, file).split(sep).join("/"); // "_components/.../file"
    const isDevSlot = DEV_SLOT_FILES.has(relFolder);
    const depth = relFolder.split("/").length - 1; // dirs above this file, within the folder
    for (const imp of importsOf(readFileSync(file, "utf8"))) {
      const hitsDevLayer = new RegExp(`(^|/)${DEV_LAYER}(/|$)`).test(imp);
      if (hitsDevLayer) {
        if (!isDevSlot) {
          violations.push(
            `${auto}/${relFolder}: imports "${imp}" — a RUNTIME/PUBLIC COMPONENT MUST NEVER IMPORT THE DEV ` +
            `LAYER (${DEV_LAYER}). Production must not depend on the dev layer's life. Reach it ONLY through ` +
            `the fail-silent dev-slot (_components/shared/dev-slot.tsx / dev-slot.client.tsx).`,
          );
        }
        continue; // lawful when in a dev-slot file — this is the ONE allowed external path
      }
      // Anything else that leaves the folder is forbidden (there is only one lawful outside path).
      let outside = false;
      if (imp.startsWith("@/")) outside = true;
      else if (/(^|\/)_shared(\/|$)/.test(imp)) outside = true; // the v1 shared layer — not this folder's
      else if (imp.startsWith(".")) {
        const ups = (imp.match(/\.\.\//g) ?? []).length;
        if (ups > depth) outside = true; // climbs at/above the folder root
      }
      if (outside) {
        violations.push(
          `${auto}/${relFolder}: imports "${imp}" — a v2 automation's components reach NOTHING outside the ` +
          `folder except the one dev layer "${DEV_LAYER}" (and that only from the dev-slot). Copy what the ` +
          `runtime needs INTO this folder, or move dev-only code behind the dev-slot.`,
        );
      }
    }
  }
}

if (violations.length) {
  console.error(`check:entity-imports — ${violations.length} violation(s):\n`);
  for (const v of violations) console.error("  ✗ " + v);
  process.exit(1);
}
console.log(
  `check:entity-imports — OK (${entityFiles.length} entity files: one-arrow law holds; ` +
  `${scannedComponentFiles} v2 component files: one-external-path law holds, only "${DEV_LAYER}" via dev-slot)`,
);
