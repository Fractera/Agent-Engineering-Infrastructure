import { readFile } from "node:fs/promises";
import { join } from "node:path";

export type CronState = { exists: boolean; enabled: boolean; schedule: string };

/** Reads a project's own co-located cron.json (if any) and returns its single job's state. Read-only,
 *  server-side helper — used by the hub cards' compact status badges (category-hub.server.tsx). Kept
 *  separate from app/api/projects/settings/cron/route.ts's own read/write cycle (that route needs the RAW
 *  jobs array to mutate and rewrite; this one only ever needs the derived state). */
export async function readCronState(projectDir: string): Promise<CronState> {
  try {
    const raw = await readFile(join(projectDir, "cron.json"), "utf8");
    const parsed = JSON.parse(raw) as { jobs?: Array<Record<string, unknown>> };
    const job = Array.isArray(parsed.jobs) ? parsed.jobs[0] : undefined;
    if (!job) return { exists: false, enabled: false, schedule: "*/5 * * * *" };
    return { exists: true, enabled: job.enabled === true, schedule: String(job.schedule ?? "*/5 * * * *") };
  } catch {
    return { exists: false, enabled: false, schedule: "*/5 * * * *" };
  }
}
