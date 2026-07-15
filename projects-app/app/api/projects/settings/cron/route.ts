import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { authorize, resolveProject } from "@/lib/nodes";

// GENERIC per-automation cron settings (step: Cron entity). Generalizes the ONE existing precedent
// (personal/telegram-notes/settings/route.ts, which hardcodes its own path/job id) into a route ANY
// automation with a co-located cron.json can use — `automation` ("category/slug") picks the file via the
// SAME `resolveProject()` every other generic project route already uses (no path traversal). fractera-cron
// re-reads cron.json on every 15s tick — no restart needed, a write here takes effect on the next tick.
export const runtime = "nodejs";

const ALLOWED_SCHEDULES = new Set([
  "* * * * *", // every minute
  "*/5 * * * *", // every 5 minutes
  "*/15 * * * *", // every 15 minutes
  "*/30 * * * *", // every 30 minutes
  "0 * * * *", // hourly
  "0 */6 * * *", // every 6 hours
  "0 */12 * * *", // every 12 hours
  "0 0 * * *", // once a day
]);

function cronPath(projectDir: string): string {
  return join(projectDir, "cron.json");
}

async function readCron(projectDir: string): Promise<{ jobs: Array<Record<string, unknown>> }> {
  try {
    const raw = await readFile(cronPath(projectDir), "utf8");
    const parsed = JSON.parse(raw);
    return { jobs: Array.isArray(parsed?.jobs) ? parsed.jobs : [] };
  } catch {
    return { jobs: [] };
  }
}

// The declared job's `id` is generator-chosen (`"<slug>-cron-tick"`, see _lib/frozen-project-starter.ts) —
// this route does not need to know it: an automation is expected to declare exactly ONE cron job, so the
// first entry is authoritative, same resilience as telegram-notes' own `jobs.find(...) ?? jobs[0]`.
function pickJob(jobs: Array<Record<string, unknown>>): Record<string, unknown> | undefined {
  return jobs[0];
}

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const proj = resolveProject((req.nextUrl.searchParams.get("automation") ?? "").trim());
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });

  const { jobs } = await readCron(proj.projectDir);
  const job = pickJob(jobs);
  if (!job) return NextResponse.json({ exists: false, allowed: Array.from(ALLOWED_SCHEDULES) });
  return NextResponse.json({
    exists: true,
    schedule: String(job.schedule ?? "*/5 * * * *"),
    enabled: job.enabled === true,
    allowed: Array.from(ALLOWED_SCHEDULES),
  });
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = (await req.json().catch(() => null)) as
    | { automation?: string; schedule?: string; enabled?: boolean }
    | null;
  const proj = resolveProject(String(body?.automation ?? "").trim());
  if (!proj.ok) return NextResponse.json({ error: proj.error }, { status: 400 });
  if (body?.schedule !== undefined && !ALLOWED_SCHEDULES.has(body.schedule)) {
    return NextResponse.json({ error: "schedule not allowed" }, { status: 422 });
  }

  const data = await readCron(proj.projectDir);
  const job = pickJob(data.jobs);
  if (!job) return NextResponse.json({ error: "this automation has no cron.json to update" }, { status: 404 });
  if (body?.schedule !== undefined) job.schedule = body.schedule;
  if (body?.enabled !== undefined) job.enabled = body.enabled;

  try {
    await writeFile(cronPath(proj.projectDir), JSON.stringify(data, null, 2) + "\n", "utf8");
  } catch {
    return NextResponse.json({ error: "could not write cron.json" }, { status: 500 });
  }
  return NextResponse.json({ ok: true, schedule: String(job.schedule), enabled: job.enabled === true });
}
