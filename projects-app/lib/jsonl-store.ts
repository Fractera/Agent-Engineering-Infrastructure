import { appendFile, mkdir, readFile, rename, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

// ─────────────────────────────────────────────────────────────────────────────
// THE APPEND-ONLY JOURNAL (block 4 of the file-system refactor, owner 2026-07-20).
//
// WHY RUNTIME DATA NEEDS A DIFFERENT MECHANISM THAN THE GRAPH. Blocks 1–3 moved STRUCTURE into files, and
// structure is small, rewritten whole, and touched by one deliberate action at a time. Runtime is the
// opposite: it grows without bound, it is written many times per second during a run, and it is written
// while somebody else is reading it. Rewriting a whole JSON file per event would be quadratic and would
// lose updates whenever two writes overlap.
//
// So runtime is a JOURNAL: one JSON object per line, only ever APPENDED.
//   · An append is a single write with the O_APPEND flag — the kernel places it at the end of the file
//     atomically, so concurrent appends interleave as whole lines instead of corrupting each other.
//   · A change is a new line carrying the same `id` — readers FOLD the journal, later lines patching
//     earlier ones. Nothing is ever edited in place.
//   · A deletion is a tombstone line (`__del: true`), never a rewrite.
//   · When the journal grows past COMPACT_AT lines it is COMPACTED: the folded state is written to a temp
//     file and renamed over the journal, which is atomic.
//
// A half-written last line (a process killed mid-append) is tolerated: the reader drops unparseable lines
// rather than throwing, because losing the last event of a crashed run must never make the whole history
// unreadable.
// ─────────────────────────────────────────────────────────────────────────────

/** Every journal record carries an id (what it is about) and a kind (which collection it belongs to). */
export type JournalRecord = Record<string, unknown> & { id: string; __kind?: string; __del?: boolean };

const COMPACT_AT = 4000;

/** Serialize compactions per file so two of them never race each other. */
const compacting = new Map<string, Promise<unknown>>();

export async function appendRecord(file: string, record: JournalRecord): Promise<void> {
  await mkdir(dirname(file), { recursive: true });
  await appendFile(file, `${JSON.stringify(record)}\n`, "utf8");
}

/** Append several records in ONE write — fewer syscalls and no chance of a reader seeing half a batch. */
export async function appendRecords(file: string, records: JournalRecord[]): Promise<void> {
  if (!records.length) return;
  await mkdir(dirname(file), { recursive: true });
  await appendFile(file, records.map((r) => `${JSON.stringify(r)}\n`).join(""), "utf8");
}

/** Fold the journal into the current state: id → merged record, in first-seen order, tombstones removed. */
export async function foldJournal(file: string): Promise<Map<string, JournalRecord>> {
  let raw = "";
  try { raw = await readFile(file, "utf8"); } catch { return new Map(); }
  const state = new Map<string, JournalRecord>();
  for (const line of raw.split("\n")) {
    if (!line.trim()) continue;
    let rec: JournalRecord;
    try { rec = JSON.parse(line) as JournalRecord; } catch { continue; } // torn last line — skip, never throw
    if (!rec || typeof rec.id !== "string") continue;
    if (rec.__del) { state.delete(rec.id); continue; }
    const prev = state.get(rec.id);
    state.set(rec.id, prev ? { ...prev, ...rec } : rec);
  }
  return state;
}

/** The folded records of one kind. */
export async function readKind(file: string, kind: string): Promise<JournalRecord[]> {
  return [...(await foldJournal(file)).values()].filter((r) => r.__kind === kind);
}

/** Rewrite the journal as its folded state when it has grown long. Best-effort: a failed compaction leaves
 *  the journal exactly as it was, which is always readable. */
export async function compactIfNeeded(file: string): Promise<void> {
  const prev = compacting.get(file) ?? Promise.resolve();
  const run = prev.then(async () => {
    let raw = "";
    try { raw = await readFile(file, "utf8"); } catch { return; }
    const lines = raw.split("\n").filter((l) => l.trim()).length;
    if (lines < COMPACT_AT) return;
    const state = await foldJournal(file);
    const tmp = `${file}.tmp-${process.pid}-${Date.now()}`;
    await writeFile(tmp, [...state.values()].map((r) => `${JSON.stringify(r)}\n`).join(""), "utf8");
    await rename(tmp, file);
  });
  compacting.set(file, run.catch(() => undefined));
  await run.catch(() => undefined);
}
