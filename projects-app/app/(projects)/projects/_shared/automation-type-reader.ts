import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { db } from "@/lib/db";

// SHARED automation-type reader (step 238 — extracted from app/api/projects/global/route.ts's private
// automationType(), which the new groups-manifest.ts also needs). The type is declared in the project's
// _data/automation.ts (emitted by the starter since step 224 L6). Projects created BEFORE that file existed
// have none — for them we DERIVE it honestly: an automation that has forks (Instances) is Instanced;
// otherwise it is Stream. Never guess: read the file first.
export async function readAutomationType(
  projectDir: string,
  automation: string,
): Promise<"stream" | "instanced" | "chained"> {
  const src = await readFile(join(projectDir, "_data", "automation.ts"), "utf8").catch(() => "");
  const m = src.match(/AUTOMATION_TYPE\s*:\s*AutomationType\s*=\s*["'](stream|instanced|chained)["']/);
  if (m) return m[1] as "stream" | "instanced" | "chained";
  const fork = (await db.prepare(`SELECT 1 FROM automation_instances WHERE automation = ? LIMIT 1`).get(automation)) as unknown;
  return fork ? "instanced" : "stream";
}
