#!/usr/bin/env node
// ─────────────────────────────────────────────────────────────────────────────
// FROZEN AUTOMATION COMPOSER — the "запусти проект автоматизации" processor.
//
// The clean restart of the projects frozen template (step 214). Given a CATEGORY and a
// PROJECT name it materializes the frozen skeleton into projects-app: real folders +
// components that render a working (if minimal) page — header + footer from the zone
// layout (step 213) + a centered "coming soon" body. By construction: pure file copy +
// token substitution, ZERO code generation. Grows node by node — each development
// version adds one primitive to skeleton/, and a re-run shows the automation develop.
//
// Usage:
//   node compose.mjs --category <cat> --project <slug> [--title "Name"] --out <projects-app-root> [--force]
//   --category : one of automation | fractera-pages | personal | other
//   --project  : kebab-case slug (the folder name IS the project slug; dynamic segments forbidden)
//   --title    : display title (default: humanized slug)
//   --out      : the projects-app root (contains app/(projects)/…)
// ─────────────────────────────────────────────────────────────────────────────
import { readdir, readFile, writeFile, mkdir, stat } from "node:fs/promises";
import { existsSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const HERE = dirname(fileURLToPath(import.meta.url));
const SKELETON = join(HERE, "skeleton");
const CATEGORIES = ["automation", "fractera-pages", "personal", "other"];
const SLUG_RE = /^[a-z][a-z0-9-]*$/;

function arg(name, argv) {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 && argv[i + 1] && !argv[i + 1].startsWith("--") ? argv[i + 1] : null;
}
function has(name, argv) { return argv.includes(`--${name}`); }

function humanize(slug) {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}
function pascal(slug) {
  return slug.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join("");
}

async function walk(dir, acc = []) {
  for (const name of await readdir(dir)) {
    const full = join(dir, name);
    const st = await stat(full);
    if (st.isDirectory()) await walk(full, acc);
    else acc.push(full);
  }
  return acc;
}

async function main() {
  const argv = process.argv.slice(2);
  const category = arg("category", argv);
  const project = arg("project", argv);
  const title = arg("title", argv) || (project ? humanize(project) : "");
  const out = arg("out", argv);
  const force = has("force", argv);

  const err = (m) => { console.log(JSON.stringify({ ok: false, error: m })); process.exit(1); };
  if (!category || !CATEGORIES.includes(category)) err(`--category must be one of ${CATEGORIES.join(" | ")}`);
  if (!project || !SLUG_RE.test(project)) err("--project must be a kebab-case slug (starts with a letter)");
  if (!out) err("--out is required (the projects-app root)");

  const tokens = {
    "{{CATEGORY}}": category,
    "{{PROJECT}}": project,
    "{{PROJECT_TITLE}}": title,
    "{{PROJECT_PASCAL}}": pascal(project),
  };

  const destBase = join(out, "app", "(projects)", "projects", category, project);
  if (existsSync(destBase) && !force) {
    err(`project already exists: ${relative(out, destBase)} (pass --force to overwrite)`);
  }

  const emitted = [];
  for (const src of await walk(SKELETON)) {
    const rel = relative(SKELETON, src).replace(/\\/g, "/").replace(/\.tpl$/, "");
    let text = await readFile(src, "utf8");
    for (const [k, v] of Object.entries(tokens)) text = text.split(k).join(v);
    const leftover = text.match(/\{\{[A-Z_]+\}\}/g);
    if (leftover) err(`unsubstituted token(s) ${[...new Set(leftover)].join(", ")} in ${rel}`);
    const dest = join(destBase, rel);
    await mkdir(dirname(dest), { recursive: true });
    await writeFile(dest, text, "utf8");
    emitted.push(`app/(projects)/projects/${category}/${project}/${rel}`);
  }

  console.log(JSON.stringify({
    ok: true,
    version: 1,
    category, project, title,
    url: `/projects/${category}/${project}`,
    files: emitted,
    next: "Rebuild projects-app (Deploy). The page renders the standard header + footer + a centered 'Project coming soon'. The folder appears in /service/architecture. Next: add the following automation node to skeleton/ and re-run.",
  }, null, 2));
}

main().catch((e) => { console.log(JSON.stringify({ ok: false, error: String(e?.message ?? e) })); process.exit(1); });
