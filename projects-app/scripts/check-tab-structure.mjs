// THE TAB-STRUCTURE GATE (step 298, owner's standard 2026-07-24). Every tab/section folder under a v2
// automation's `_components/` obeys ONE shape, identical everywhere (model of it: `calendar/`, `dashboard/`):
//
//   <tab>/index.tsx   — the COMPOSITION (public half on top, admin half below), never a switch;
//   <tab>/public/     — the runtime/public half (read-only; works without `_shared-v2`);
//   <tab>/admin/      — the ADMIN half, and the ONLY place that pulls the administrative layer
//                       (`_shared-v2`) — via the fail-silent dev-slot (`shared/dev-slot`).
//
// TWO LAWS enforced here:
//   1. a tab folder that has a `public/` MUST also have `admin/` and `index.tsx` (the full triple);
//   2. the dev-slot / `_shared-v2` mount lives INSIDE a tab folder (its own `index.tsx` composing the admin
//      half, or its `admin/` — the sample calendar/dashboard mount it in the tab's index.tsx). It must NEVER
//      live in the automation's TOP-LEVEL `_components/index.tsx`: that file only CALLS `<Tab/>` and composes
//      sections — mounting `DevSlot` / `_shared-v2` there bypasses the tab-folder standard.
//
// Folders exempt from the triple (they are shared plumbing, not tabs): `shared/`, `diagram/`, `generic/`,
// `notifications/`, `chrome/`, `tools/`, and any `*/components` / `*/public` / `*/admin` subdir themselves.
//
// Run: npm run check:tab-structure. Exit 1 with a teaching message on any violation.
import { readdirSync, readFileSync, existsSync, statSync } from "node:fs";
import { join, relative, sep } from "node:path";

const PROJECTS = join(process.cwd(), "app", "(projects)", "projects");
// 🔒 КАЖДАЯ АВТОМАТИЗАЦИЯ ДВУСЛОЙНОЙ МОДЕЛИ ПЕРЕЧИСЛЯЕТСЯ ЗДЕСЬ (шаг 313.E). Гейт проверяет ровно этот
// список, поэтому автоматизация, забытая в нём, живёт БЕЗ стандарта: `starter-v3` строился с 311.1 и всё
// это время не проверялся — так у вкладки «Ассистент» пропала половина `admin/`, и возразить было некому.
const V2_AUTOMATIONS = [
  join("_lib", "starters", "stream", "en"), // замороженный стартер v2 — донор при рождении
  join("other", "starter-v3"), // будущий замороженный шаблон v3
];
// Folders directly under `_components/` that are NOT tabs (shared plumbing / infra).
const NOT_TABS = new Set(["shared", "diagram", "generic", "notifications", "chrome", "tools"]);
const DEV_MARKERS = ["_shared-v2", "dev-slot", "DevSlot", "DevUseCasesPanel", "DevBuildWithAi"];

const violations = [];

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

for (const auto of V2_AUTOMATIONS) {
  const componentsRoot = join(PROJECTS, auto, "_components");
  if (!existsSync(componentsRoot)) continue;

  // ── LAW 1: a tab folder with public/ needs the full triple ────────────────────────────────────────────
  for (const name of readdirSync(componentsRoot)) {
    const dir = join(componentsRoot, name);
    if (!statSync(dir).isDirectory() || NOT_TABS.has(name)) continue;
    const hasPublic = existsSync(join(dir, "public"));
    const hasAdmin = existsSync(join(dir, "admin"));
    const hasIndex = existsSync(join(dir, "index.tsx"));
    // A tab is any folder that carries a public/ OR admin/ half.
    if (hasPublic || hasAdmin) {
      if (!hasPublic) violations.push(`${auto}/_components/${name}: has admin/ but NO public/ — every tab needs BOTH halves (public runtime + admin).`);
      if (!hasAdmin) violations.push(`${auto}/_components/${name}: has public/ but NO admin/ — the admin/ folder is where the administrative layer (_shared-v2) is pulled in. Add ${name}/admin/.`);
      if (!hasIndex) violations.push(`${auto}/_components/${name}: no index.tsx — the composition file that renders public/ + admin/ is mandatory.`);
    }
  }

  // ── LAW 2: the top-level `_components/index.tsx` must NOT mount the dev-slot / _shared-v2 itself ─────────
  const topIndex = join(componentsRoot, "index.tsx");
  if (existsSync(topIndex)) {
    const src = readFileSync(topIndex, "utf8");
    const usesDev = /^\s*(?:import|export)[^;\n]*(?:_shared-v2|dev-slot)/m.test(src)
      || /<\s*(?:DevSlot|DevUseCasesPanel|DevBuildWithAi)\b/.test(src);
    if (usesDev) {
      violations.push(
        `${auto}/_components/index.tsx: the TOP-LEVEL composition mounts the administrative layer ` +
        `(${DEV_MARKERS.filter((m) => src.includes(m)).join(", ")}) itself. It must only CALL <Tab/> and compose ` +
        `sections; the dev-slot / _shared-v2 mount belongs inside the tab folder (its index.tsx or admin/).`,
      );
    }
  }
}

if (violations.length) {
  console.error(`check:tab-structure — ${violations.length} violation(s):\n`);
  for (const v of violations) console.error("  ✗ " + v);
  process.exit(1);
}
console.log("check:tab-structure — OK (every tab folder is index.tsx + public/ + admin/; the _shared-v2 mount lives only in admin/)");
