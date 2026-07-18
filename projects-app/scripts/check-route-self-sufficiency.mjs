// THE ROUTE SELF-SUFFICIENCY GATE (step 254.9, ROUTE-V3 law 1) — proves a route's BEHAVIOUR layer never
// reaches outside its own folder:
//   - _nodes/** and _data/**: imports must be relative and stay INSIDE the route (its _types/_lib/_data);
//     "@/..." and anything containing "_shared" are violations;
//   - _lib/rows.ts is the ONE declared bridge: it (and only it) may import "@/lib/dashboard-rows";
//   - the cockpit surface (page.tsx, _components/, _meta.ts) is BASE-LAYER territory and is not scanned
//     here (its machinery migrates in later sub-steps).
// Run: node scripts/check-route-self-sufficiency.mjs <category>/<slug>. Teaching messages, exit 1 on any
// violation. 🔒 Weakening this gate to make an import pass is itself the violation (ROUTE-V3 lock).
import { readdirSync, readFileSync, statSync, existsSync } from "node:fs";
import { join, relative, sep } from "node:path";

const arg = process.argv[2];
if (!arg || !/^[a-z][a-z0-9-]*\/[a-z][a-z0-9-]*$/.test(arg)) {
  console.error("usage: node scripts/check-route-self-sufficiency.mjs <category>/<slug>");
  process.exit(2);
}
const ROUTE = join(process.cwd(), "app", "(projects)", "projects", ...arg.split("/"));
if (!existsSync(ROUTE)) {
  console.error(`route not found: ${ROUTE}`);
  process.exit(2);
}

function walk(dir) {
  let out = [];
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) out = out.concat(walk(p));
    else if (/\.(ts|tsx|mjs)$/.test(name) && !name.endsWith(".compiled.mjs")) out.push(p);
  }
  return out;
}

const SCANNED_TOPS = new Set(["_nodes", "_data", "_lib", "_types"]);
const violations = [];

for (const file of walk(ROUTE)) {
  const rel = relative(ROUTE, file).split(sep).join("/");
  const top = rel.split("/")[0];
  if (!SCANNED_TOPS.has(top)) continue; // the cockpit surface is base-layer territory (later sub-steps)
  const isBridge = rel === "_lib/rows.ts";
  const src = readFileSync(file, "utf8");
  for (const m of src.matchAll(/from\s+["']([^"']+)["']/g)) {
    const imp = m[1];
    if (isBridge && imp === "@/lib/dashboard-rows") continue; // the one declared crossing
    if (imp.startsWith("@/")) {
      violations.push(
        `${rel}: imports "${imp}" — a route's behaviour NEVER imports platform code ("@/..."). Copy the ` +
        `helper into this route's _lib/ (duplication is the accepted price of autonomy), or use the ` +
        `declared bridge _lib/rows.ts for table rows.`,
      );
      continue;
    }
    if (imp.includes("_shared")) {
      violations.push(
        `${rel}: imports "${imp}" — a route's behaviour NEVER imports _shared. The route carries its OWN ` +
        `copies in _types/ (types) and _lib/ (helpers) — import those instead.`,
      );
      continue;
    }
    if (imp.startsWith(".")) {
      // A relative import must resolve INSIDE the route: count how far up it climbs vs how deep it is.
      const depth = rel.split("/").length - 1; // dirs above the file, within the route
      const ups = (imp.match(/\.\.\//g) ?? []).length;
      if (ups > depth) {
        violations.push(
          `${rel}: imports "${imp}" — this climbs OUT of the route's folder. Everything a node or ` +
          `declaration needs lives inside the route (_types/, _lib/, _data/).`,
        );
      }
    }
  }
}

if (violations.length) {
  console.error(`check-route-self-sufficiency ${arg} — ${violations.length} violation(s):\n`);
  for (const v of violations) console.error("  ✗ " + v);
  process.exit(1);
}
console.log(`check-route-self-sufficiency ${arg} — OK (behaviour layer fully self-contained)`);
