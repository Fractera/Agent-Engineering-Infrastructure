import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getSession } from "@/lib/auth/get-session";
import { noteType } from "@/app/(projects)/projects/personal/telegram-notes/_lib/note-type";

// Server-side, paginated + searchable feed of the telegram_notes table (step 188
// Phase 3). The client table (notes-table.client.tsx) calls this for search / sort /
// load-more. Search is a LIKE over `summary` across ALL rows (not just the loaded
// page). Full text is NOT returned here — it is fetched lazily by notes/[id].
export const runtime = "nodejs";

const READ_ROLES = ["architect", "manager", "agent"];
const PROJECT = "telegram-notes";
const PAGE = 20;

// Whitelisted ORDER BY clauses (never interpolate user input into SQL).
const SORTS: Record<string, string> = {
  newest: "created_at DESC, id DESC",
  type: "hook_action ASC, created_at DESC",
  reminder_soon: "CASE WHEN reminder_due IS NULL THEN 1 ELSE 0 END ASC, reminder_due ASC",
  reminder_late: "CASE WHEN reminder_due IS NULL THEN 1 ELSE 0 END ASC, reminder_due DESC",
};

type Row = {
  id: number;
  hook_action: string;
  hook_phrase: string;
  condition: string | null;
  summary: string;
  reminder_due: number | null;
  delivered: number;
  created_at: number;
};

async function authorize(req: NextRequest): Promise<boolean> {
  const s = await getSession(req);
  return Boolean(s?.roles?.some((r) => READ_ROLES.includes(r)));
}

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const sp = req.nextUrl.searchParams;
  const q = (sp.get("q") ?? "").trim();
  const limit = Math.min(100, Math.max(1, Number(sp.get("limit")) || PAGE));
  const offset = Math.max(0, Number(sp.get("offset")) || 0);
  const orderBy = SORTS[sp.get("sort") ?? "newest"] ?? SORTS.newest;

  try {
    const where = ["project_slug = ?"];
    const args: unknown[] = [PROJECT];
    if (q) {
      where.push("summary LIKE ?");
      args.push(`%${q}%`);
    }
    const whereSql = where.join(" AND ");
    // images_count / first image via the record_images link table (step 207.18, rule R3) — a correlated
    // subquery pair keeps this one round-trip; the LIMIT-ed page keeps it cheap at any table size.
    const rows = (await db
      .prepare(
        `SELECT n.id, n.hook_action, n.hook_phrase, n.condition, n.summary, n.reminder_due, n.delivered, n.created_at,
                (SELECT COUNT(*) FROM record_images ri WHERE ri.record_kind = 'note' AND ri.record_id = n.id) AS images_count,
                (SELECT i.media_url FROM record_images ri JOIN automation_images i ON i.id = ri.image_id
                  WHERE ri.record_kind = 'note' AND ri.record_id = n.id ORDER BY ri.created_at ASC LIMIT 1) AS first_image
           FROM telegram_notes n WHERE ${whereSql.replace(/project_slug/g, "n.project_slug").replace(/summary LIKE/g, "n.summary LIKE")}
          ORDER BY ${orderBy} LIMIT ? OFFSET ?`,
      )
      .all(...args, limit, offset)) as unknown as (Row & { images_count?: number; first_image?: string | null })[];
    const totalRow = (await db
      .prepare(`SELECT COUNT(*) AS n FROM telegram_notes WHERE ${whereSql}`)
      .get(...args)) as { n: number } | null;

    return NextResponse.json({
      rows: rows.map((r) => ({
        id: String(r.id),
        type: noteType(r.hook_action),
        action: r.hook_action,
        hookPhrase: r.hook_phrase ?? "",
        condition: r.condition,
        summary: r.summary,
        reminderDue: r.reminder_due,
        delivered: Boolean(r.delivered),
        createdAt: r.created_at,
        imagesCount: r.images_count ?? 0,
        firstImage: r.first_image ?? null,
      })),
      total: totalRow?.n ?? 0,
    });
  } catch {
    // Table not created yet (no runs) — empty feed, not an error.
    return NextResponse.json({ rows: [], total: 0 });
  }
}
