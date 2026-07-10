import { NextRequest, NextResponse } from "next/server";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getSession } from "@/lib/auth/get-session";

// Project settings that live in the co-located cron.json (step 188 Phase 4): the poll
// schedule and the enabled flag of the automation. fractera-cron re-reads cron.json on
// every tick (no restart needed), so a write here takes effect on the next tick. The
// bot-key/OpenAI keys are handled by the env setter + the OpenAI forwarder, not here.
export const runtime = "nodejs";

const WRITE_ROLES = ["architect", "manager", "agent"];
const JOB_ID = "telegram-notes-poll";

// Schedules the interval selector may set — all valid 5-field cron, minute-granular
// (the substrate scheduler cannot express sub-minute). Whitelisted so we never write an
// arbitrary string into cron.json.
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

function cronPath(): string {
  return join(
    process.cwd(),
    "app",
    "(projects)",
    "projects",
    "personal",
    "telegram-notes",
    "cron.json",
  );
}

async function readCron(): Promise<{ jobs: Array<Record<string, unknown>> }> {
  try {
    const raw = await readFile(cronPath(), "utf8");
    const parsed = JSON.parse(raw);
    return { jobs: Array.isArray(parsed?.jobs) ? parsed.jobs : [] };
  } catch {
    return { jobs: [] };
  }
}

async function authorize(req: NextRequest): Promise<boolean> {
  const s = await getSession(req);
  return Boolean(s?.roles?.some((r) => WRITE_ROLES.includes(r)));
}

export async function GET(req: NextRequest) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { jobs } = await readCron();
  const job = jobs.find((j) => j.id === JOB_ID) ?? jobs[0];
  return NextResponse.json({
    schedule: String(job?.schedule ?? "* * * * *"),
    enabled: job?.enabled !== false,
    allowed: Array.from(ALLOWED_SCHEDULES),
  });
}

export async function POST(req: NextRequest) {
  if (!(await authorize(req))) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  let body: { schedule?: string; enabled?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid JSON body" }, { status: 400 });
  }
  if (body.schedule !== undefined && !ALLOWED_SCHEDULES.has(body.schedule)) {
    return NextResponse.json({ error: "schedule not allowed" }, { status: 422 });
  }

  const data = await readCron();
  const job = data.jobs.find((j) => j.id === JOB_ID) ?? data.jobs[0];
  if (!job) {
    return NextResponse.json({ error: "no cron job to update" }, { status: 404 });
  }
  if (body.schedule !== undefined) job.schedule = body.schedule;
  if (body.enabled !== undefined) job.enabled = body.enabled;

  try {
    await writeFile(cronPath(), JSON.stringify(data, null, 2) + "\n", "utf8");
  } catch {
    return NextResponse.json({ error: "could not write cron.json" }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    schedule: String(job.schedule),
    enabled: job.enabled !== false,
  });
}
