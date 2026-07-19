import { readFile, writeFile, mkdir } from "node:fs/promises";
import { join } from "node:path";
import { randomBytes } from "node:crypto";

// THE AGENT GATE (263.1 round 6) — the room agent's service pass into the platform APIs.
//
// The root cause it fixes (proven live 2026-07-19): in Secure/domain mode every /api/projects/* route
// requires a browser session cookie, but the coding agent works in a TERMINAL on the server itself and
// has none — its apply / materialize / entity-summary / validate calls all died with 403, so the agent
// reported "success" in the terminal while nothing ever reached the live automation.
//
// The pass is a per-server random secret file. The handoff task text embeds it as an
// `X-Fractera-Agent-Gate` header for every platform call the agent makes. Trust model: the secret lives
// on the server's own filesystem next to the automations — anyone able to read it already has full
// filesystem access, so presenting it proves "I run on this server", which is exactly the party the
// room flow trusts. Browsers never see it except inside the authorized owner's handoff text.
const FILE = join(process.cwd(), "project-config", "agent-gate-secret");
let cached: string | null = null;

export async function agentGateSecret(): Promise<string> {
  if (cached) return cached;
  try {
    const raw = (await readFile(FILE, "utf8")).trim();
    if (raw) { cached = raw; return raw; }
  } catch { /* first run — generate below */ }
  const fresh = randomBytes(24).toString("hex");
  await mkdir(join(process.cwd(), "project-config"), { recursive: true });
  await writeFile(FILE, fresh + "\n", "utf8");
  cached = fresh;
  return fresh;
}
