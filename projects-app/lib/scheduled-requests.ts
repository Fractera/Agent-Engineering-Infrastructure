import { randomUUID } from "node:crypto";
import { db } from "@/lib/db";

// SCHEDULED REQUESTS (step 254.8e) — the owner's law: «напомни через час» must fire IN an hour. A stream
// ask whose declared "when" lies in the future is STORED here instead of executing; the in-process ticker
// (instrumentation.ts, every 30s) executes due rows through the same executor the console uses. Each
// request — immediate or scheduled — is ONE process on the Processes timeline: green when done, grey
// while planned.

export type ScheduledRequest = {
  id: string; automation: string; input_json: string; due_at: string;
  status: "pending" | "done" | "failed"; run_id: string | null; created_at: string;
};

/** Parse the ask's optional "when": a datetime-local string (the console's field) or ISO. Returns the
 *  epoch ms, or null when absent/unparseable/in the past (→ execute now, never silently drop). */
export function parseWhen(input: Record<string, unknown>): number | null {
  const raw = input.when;
  if (typeof raw !== "string" || !raw.trim()) return null;
  const ms = Date.parse(raw);
  if (!Number.isFinite(ms)) return null;
  return ms > Date.now() + 15_000 ? ms : null;
}

export async function createScheduledRequest(automation: string, input: Record<string, unknown>, dueMs: number): Promise<ScheduledRequest> {
  const id = randomUUID();
  const dueAt = new Date(dueMs).toISOString();
  await db.prepare(
    `INSERT INTO automation_scheduled_requests (id, automation, input_json, due_at) VALUES (?, ?, ?, ?)`,
  ).run(id, automation, JSON.stringify(input), dueAt);
  return { id, automation, input_json: JSON.stringify(input), due_at: dueAt, status: "pending", run_id: null, created_at: new Date().toISOString() };
}

export async function pendingRequests(automation: string): Promise<ScheduledRequest[]> {
  return (await db.prepare(
    `SELECT * FROM automation_scheduled_requests WHERE automation = ? AND status = 'pending' ORDER BY due_at ASC`,
  ).all(automation)) as ScheduledRequest[];
}

/** Execute every due pending request (all automations) — the ticker's body. Lazy import of the executor
 *  keeps this module cycle-free. Failures mark the row failed (the timeline shows it honestly); one bad
 *  request never blocks the rest. */
export async function executeDueRequests(): Promise<number> {
  const due = (await db.prepare(
    `SELECT * FROM automation_scheduled_requests WHERE status = 'pending' AND due_at <= ?`,
  ).all(new Date().toISOString())) as ScheduledRequest[];
  let done = 0;
  for (const r of due) {
    try {
      const { executeAutomation } = await import("@/lib/executor");
      const input = JSON.parse(r.input_json || "{}") as Record<string, unknown>;
      delete input.when; // consumed — the nodes never see the scheduling field
      const result = (await executeAutomation(r.automation, input, {})) as { ok?: boolean; runId?: string };
      await db.prepare(
        `UPDATE automation_scheduled_requests SET status = ?, run_id = ? WHERE id = ?`,
      ).run(result?.ok ? "done" : "failed", result?.runId ?? null, r.id);
      done++;
    } catch {
      await db.prepare(`UPDATE automation_scheduled_requests SET status = 'failed' WHERE id = ?`).run(r.id);
    }
  }
  return done;
}
