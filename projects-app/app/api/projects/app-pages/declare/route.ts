import { NextRequest, NextResponse } from "next/server";
import { authorize, resolveProject } from "@/lib/nodes";
import { createNodeId } from "@/lib/cuid";
import { ALL_ROLES } from "@/lib/roles";
import { writeMeta, relToUrl, type PageMeta } from "@/lib/app-pages/readme";
import { slugify } from "@/lib/app-pages/slug";

// DECLARE A PUBLIC APPLICATION PAGE (step 242; wizard redesign 242.2) — the accordion's "Add page". Declaring
// writes a README (no built file) under the slot `app/[lang]/…`; a coding agent turns it into a real page.
//
// AUDIENCE (owner's wizard, 242.2):
//   • "self"   — the page is for the owner only → gated to the owner tier (role `architect`); no per-user
//                isolation is needed, so no dynamic segment.
//   • "others" — external users use it too → gated to the chosen roles (default `user`). Per-user isolation
//                is done by authorization at build time (the coder reads the session user), NOT by a dynamic
//                route segment — so the declared page is non-dynamic here as well.
//
// UNIQUENESS: the folder leaf is `<english-slug>-<cuid8>`. Appending a cuid (owner's rule) guarantees no two
// declarations ever collide, so there is no name-probing loop.
export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as
    | { automation?: string; base?: string; title?: string; slug?: string; audience?: string; roles?: unknown[] }
    | null;

  const title = String(body?.title ?? "").trim();
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  // The automation tag is optional but resolved when present, so a bad slug is rejected up front.
  let automation: string | null = null;
  if (body?.automation) {
    const p = resolveProject(String(body.automation));
    if (!p.ok) return NextResponse.json({ error: p.error }, { status: 400 });
    automation = p.automation;
  }

  const forOthers = body?.audience === "others";
  // Roles: only for a multi-user page, only known roles, defaulting to `user`. A self page is owner-only.
  const roles = forOthers
    ? (Array.isArray(body?.roles) ? body!.roles.map(String).filter((r) => (ALL_ROLES as readonly string[]).includes(r)) : [])
    : ["architect"];
  const effectiveRoles = roles.length ? roles : forOthers ? ["user"] : ["architect"];

  // Everything lives under [lang] (multilingual, step 242.1). Honour a base folder the owner picked in the
  // tree (already under [lang]); otherwise the [lang] root.
  let base = String(body?.base ?? "").replace(/^\/+|\/+$/g, "").trim();
  if (base.split("/")[0] !== "[lang]") base = base ? `[lang]/${base}` : "[lang]";

  // The English slug (from the wizard's suggest-slug preview, or slugified here) + a cuid suffix for uniqueness.
  const englishSlug = slugify(String(body?.slug ?? "")) || slugify(title) || "page";
  const leaf = `${englishSlug}-${createNodeId().slice(-8)}`;
  const rel = `${base}/${leaf}`;

  const meta: PageMeta = {
    rel, title, kind: "page", dynamic: false, description: null,
    visibility: "rolesOnly", roles: effectiveRoles, automation, multilingual: true, tasks: [],
  };
  await writeMeta(meta);

  return NextResponse.json(
    { ok: true, page: { rel, title, url: relToUrl(rel), multilingual: true, roles: effectiveRoles, automation, taskCount: 0 } },
    { status: 201 },
  );
}
