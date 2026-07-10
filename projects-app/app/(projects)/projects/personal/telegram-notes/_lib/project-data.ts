import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/lib/db";
import { PROJECT_COLUMNS, RECORD_TABLE } from "../_data/columns";
import type { CronJob, NoteRow, RecordRow } from "./types";
import { noteType } from "./note-type";

const CATEGORY = "personal";
const PROJECT = "telegram-notes";

// Identifier guard for the config-driven records table (RECORD_TABLE / column sources are
// engine-generated + gate-validated; re-checked so a hand edit can never inject SQL).
const IDENT = /^[a-zA-Z_][a-zA-Z0-9_]*$/;

// Rows of the UNIVERSAL records table (ontology entity 12 Record): project each column's
// `source` from RECORD_TABLE into a values map keyed by column id. Server-rendered first page;
// the /records API adds search + pagination.
export async function getRecords(): Promise<RecordRow[]> {
  if (!RECORD_TABLE || !IDENT.test(RECORD_TABLE)) return [];
  // image-type columns (step 207.18) are NOT table columns — they resolve through record_images via a
  // correlated subquery aliased to the declared source. MUST mirror records/route.ts exactly: selecting
  // first_image as a plain column here threw "no such column" → catch → EMPTY first page while the API
  // worked (the owner saw a blank records table with intact data — step 207.18c fix).
  const imageSources = new Set(
    PROJECT_COLUMNS.filter((c) => c.type === "image" && IDENT.test(c.source)).map((c) => c.source),
  );
  const sources = Array.from(
    new Set(PROJECT_COLUMNS.map((c) => c.source).filter((s) => IDENT.test(s) && !imageSources.has(s))),
  );
  const imageSelects = [...imageSources].map(
    (alias) =>
      `(SELECT i.media_url FROM record_images ri JOIN automation_images i ON i.id = ri.image_id ` +
      `WHERE ri.record_kind = 'note' AND ri.record_id = ${RECORD_TABLE}.id ORDER BY ri.created_at ASC LIMIT 1) AS ${alias}`,
  );
  const cols = ["id", ...sources.filter((s) => s !== "id"), ...imageSelects];
  try {
    const rows = await db
      .prepare(`SELECT ${cols.join(", ")} FROM ${RECORD_TABLE} ORDER BY id DESC LIMIT 20`)
      .all();
    return rows.map((row) => {
      const rec = row as Record<string, unknown>;
      const values: Record<string, unknown> = {};
      for (const c of PROJECT_COLUMNS) values[c.id] = rec[c.source];
      return { id: String(rec.id), values };
    });
  } catch {
    return [];
  }
}

// Server-rendered first page of the unified results table (step 188 Phase 3): the
// newest telegram_notes rows + the total count. The client table then handles search /
// sort / load-more via /api/projects/personal/telegram-notes/notes.
export async function getNotes(limit = 20): Promise<{ rows: NoteRow[]; total: number }> {
  try {
    const rows = await db
      .prepare(
        `SELECT id, hook_action, hook_phrase, condition, summary, reminder_due, delivered, created_at
           FROM telegram_notes WHERE project_slug = ?
          ORDER BY created_at DESC, id DESC LIMIT ?`,
      )
      .all(PROJECT, limit);
    const totalRow = (await db
      .prepare(`SELECT COUNT(*) AS n FROM telegram_notes WHERE project_slug = ?`)
      .get(PROJECT)) as { n: number } | null;
    return {
      rows: rows.map((r) => ({
        id: String(r.id),
        type: noteType(String(r.hook_action)),
        action: String(r.hook_action),
        hookPhrase: String(r.hook_phrase ?? ""),
        condition: r.condition === null || r.condition === undefined ? null : String(r.condition),
        summary: String(r.summary ?? ""),
        reminderDue: r.reminder_due === null ? null : Number(r.reminder_due),
        delivered: Boolean(r.delivered),
        createdAt: Number(r.created_at),
      })),
      total: totalRow?.n ?? 0,
    };
  } catch {
    return { rows: [], total: 0 }; // table not created yet — empty feed
  }
}

// Calendar entries (step 207 event+reminder model): a telegram_notes row can carry a reminder_due (when to
// NOTIFY) and/or an event_at (when the thing HAPPENS). Each of those two times becomes ITS OWN calendar
// entry, tagged type:'reminder'|'event', both sharing the row `id` so the UI can relate them (the reminder
// that belongs to which event). Keyed by the local YYYY-MM-DD; the calendar marks these dates and the right
// column lists the day's entries (step 207.5 timeline + filters + colors).
export type CalendarEvent = { id: string; date: string; time: string; title: string; type: "event" | "reminder" };
function toDateTime(unix: number): { date: string; time: string } {
  const when = new Date(unix * 1000);
  const y = when.getFullYear();
  const m = String(when.getMonth() + 1).padStart(2, "0");
  const d = String(when.getDate()).padStart(2, "0");
  const hh = String(when.getHours()).padStart(2, "0");
  const mm = String(when.getMinutes()).padStart(2, "0");
  return { date: `${y}-${m}-${d}`, time: `${hh}:${mm}` };
}
export async function getCalendarEvents(): Promise<CalendarEvent[]> {
  try {
    const rows = await db
      .prepare(
        `SELECT id, reminder_due, event_at, summary, full_text FROM telegram_notes
          WHERE project_slug = ? AND (reminder_due IS NOT NULL OR event_at IS NOT NULL)
          ORDER BY COALESCE(event_at, reminder_due) DESC LIMIT 500`,
      )
      .all(PROJECT);
    const out: CalendarEvent[] = [];
    for (const r of rows) {
      const id = String(r.id);
      const title = String(r.summary || r.full_text || "").slice(0, 200);
      if (r.event_at !== null && r.event_at !== undefined) {
        out.push({ id, ...toDateTime(Number(r.event_at)), title, type: "event" });
      }
      if (r.reminder_due !== null && r.reminder_due !== undefined) {
        out.push({ id, ...toDateTime(Number(r.reminder_due)), title, type: "reminder" });
      }
    }
    return out;
  } catch {
    return []; // table not created yet — no events
  }
}

// Finance ledger rows (step 207) — from the SEPARATE automation_finance table, sorted by kind (income
// first, then expense) so the section groups money in vs money out. categories is a JSON array of preset
// ids; parsed defensively (a bad value degrades to an empty list, never throws).
export type FinanceRecord = {
  id: string;
  kind: "income" | "expense";
  amount: number;
  categories: string[];
  summary: string;
  imageUrl: string | null;
  createdAt: number;
};
function parseCategoryIds(raw: unknown): string[] {
  try {
    const arr = JSON.parse(String(raw ?? "[]"));
    return Array.isArray(arr) ? arr.map(String) : [];
  } catch {
    return [];
  }
}
export async function getFinanceRecords(limit = 50): Promise<FinanceRecord[]> {
  try {
    const rows = await db
      .prepare(
        `SELECT id, kind, amount, categories, summary, image_url, created_at FROM automation_finance
          WHERE project = ? ORDER BY kind DESC, created_at DESC LIMIT ?`,
      )
      .all(PROJECT, limit);
    return rows.map((r) => ({
      id: String(r.id),
      kind: r.kind === "income" ? "income" : "expense",
      amount: Number(r.amount),
      categories: parseCategoryIds(r.categories),
      summary: String(r.summary ?? ""),
      imageUrl: r.image_url ? String(r.image_url) : null,
      createdAt: Number(r.created_at),
    })) as FinanceRecord[];
  } catch {
    return []; // table not created yet — no finance rows
  }
}

// Image registry rows (step 207.20 UI — owner: FOUR tables, integrated): every stored photo with its
// vision description, status, and the records it is linked to (via record_images, many-to-many).
export type ImageRecord = {
  id: string;
  url: string;
  description: string;
  kindHint: string;
  status: string;
  linked: string[]; // "note#5: summary…" lines resolved through the link table
  createdAt: number;
};
export async function getImageRecords(limit = 50): Promise<ImageRecord[]> {
  try {
    const rows = await db
      .prepare(
        `SELECT id, media_url, description, kind_hint, status, created_at FROM automation_images
          WHERE project = ? ORDER BY created_at DESC LIMIT ?`,
      )
      .all(PROJECT, limit);
    const out: ImageRecord[] = [];
    for (const r of rows) {
      const links = (await db
        .prepare(
          `SELECT ri.record_kind, ri.record_id,
                  COALESCE((SELECT n.summary FROM telegram_notes n WHERE ri.record_kind = 'note' AND n.id = ri.record_id),
                           (SELECT f.summary FROM automation_finance f WHERE ri.record_kind = 'finance' AND f.id = ri.record_id), '') AS summary
             FROM record_images ri WHERE ri.image_id = ? ORDER BY ri.created_at ASC LIMIT 5`,
        )
        .all(Number(r.id))) as Array<{ record_kind: string; record_id: number; summary: string }>;
      out.push({
        id: String(r.id),
        url: String(r.media_url ?? ""),
        description: String(r.description ?? ""),
        kindHint: String(r.kind_hint ?? "photo"),
        status: String(r.status ?? "pending"),
        linked: links.map((l) => `${l.record_kind}#${l.record_id}${l.summary ? `: ${String(l.summary).slice(0, 60)}` : ""}`),
        createdAt: Number(r.created_at),
      });
    }
    return out;
  } catch {
    return []; // table not created yet — no images
  }
}

// Geo-mark rows (step 207.20 UI): every stored place with its coordinates, source, status and linked
// records (via record_geo). The maps link is built client-side from lat/lng.
export type GeoRecord = {
  id: string;
  lat: number;
  lng: number;
  label: string;
  source: string;
  status: string;
  linked: string[];
  createdAt: number;
};
export async function getGeoRecords(limit = 50): Promise<GeoRecord[]> {
  try {
    const rows = await db
      .prepare(
        `SELECT id, lat, lng, label, source, status, created_at FROM automation_geo
          WHERE project = ? ORDER BY created_at DESC LIMIT ?`,
      )
      .all(PROJECT, limit);
    const out: GeoRecord[] = [];
    for (const r of rows) {
      const links = (await db
        .prepare(
          `SELECT rg.record_kind, rg.record_id,
                  COALESCE((SELECT n.summary FROM telegram_notes n WHERE rg.record_kind = 'note' AND n.id = rg.record_id),
                           (SELECT f.summary FROM automation_finance f WHERE rg.record_kind = 'finance' AND f.id = rg.record_id), '') AS summary
             FROM record_geo rg WHERE rg.geo_id = ? ORDER BY rg.created_at ASC LIMIT 5`,
        )
        .all(Number(r.id))) as Array<{ record_kind: string; record_id: number; summary: string }>;
      out.push({
        id: String(r.id),
        lat: Number(r.lat),
        lng: Number(r.lng),
        label: String(r.label ?? ""),
        source: String(r.source ?? "telegram"),
        status: String(r.status ?? "pending"),
        linked: links.map((l) => `${l.record_kind}#${l.record_id}${l.summary ? `: ${String(l.summary).slice(0, 60)}` : ""}`),
        createdAt: Number(r.created_at),
      });
    }
    return out;
  } catch {
    return []; // table not created yet — no geo marks
  }
}

export async function getCronJobs(): Promise<CronJob[]> {
  try {
    const raw = await readFile(
      join(
        process.cwd(),
        "app",
        "(projects)",
        "projects",
        CATEGORY,
        PROJECT,
        "cron.json",
      ),
      "utf8",
    );
    const jobs = JSON.parse(raw)?.jobs;
    if (!Array.isArray(jobs)) {
      return [];
    }
    return jobs.map((j) => ({
      id: String(j?.id ?? ""),
      title: String(j?.title ?? j?.id ?? ""),
      schedule: String(j?.schedule ?? ""),
      enabled: j?.enabled !== false,
    }));
  } catch {
    return []; // no cron.json yet — the project declares no scheduled runs
  }
}
