import fs from "fs";
import { execSync } from "child_process";
import { readEnvFile } from "@/lib/env-file";

const SECRETS_FILE = process.env.SECRETS_PATH ?? "/etc/fractera/secrets.env";

// Cache the resolved server IP for the lifetime of the process — it never
// changes mid-run, and shelling out to `hostname -I` on every request is
// wasteful. Shared across dns-check / wizard-state / health-check / activate.
let cachedServerIp: string | null | undefined;

export function readServerIp(): string | null {
  if (cachedServerIp !== undefined) return cachedServerIp;

  // 1. /etc/fractera/secrets.env if bootstrap wrote it there
  try {
    if (fs.existsSync(SECRETS_FILE)) {
      const txt = fs.readFileSync(SECRETS_FILE, "utf-8");
      for (const line of txt.split("\n")) {
        const m = line.match(/^SERVER_IP=(.+)$/);
        if (m) { cachedServerIp = m[1].trim(); return cachedServerIp; }
      }
    }
  } catch { /* fall through */ }

  // 2. bridges/app .env.local
  try {
    const env = readEnvFile("/opt/fractera/bridges/app/.env.local");
    if (env.SERVER_IP) { cachedServerIp = env.SERVER_IP; return cachedServerIp; }
  } catch { /* fall through */ }

  // 3. Ask the OS — works on every Linux box without external network.
  try {
    const out = execSync("hostname -I", { timeout: 2000 }).toString().trim();
    const first = out.split(/\s+/).find((ip) => /^\d+\.\d+\.\d+\.\d+$/.test(ip));
    if (first) { cachedServerIp = first; return cachedServerIp; }
  } catch { /* fall through */ }

  // 4. Last resort — public IP via ipify (requires outbound :443).
  try {
    const out = execSync("curl -s --max-time 5 https://api.ipify.org", { timeout: 6000 }).toString().trim();
    if (/^\d+\.\d+\.\d+\.\d+$/.test(out)) { cachedServerIp = out; return cachedServerIp; }
  } catch { /* give up */ }

  cachedServerIp = null;
  return null;
}

// All hostnames Fractera serves over HTTPS once a custom domain is attached.
// Single source of truth for the DNS wizard, wizard-state, health-check and
// dns-check. MUST match the certbot SAN list + nginx server blocks in
// app/api/config/domain/route.ts. `chat` was retired in step 205 (the built-in
// chat web UI was removed) — it is NOT in the provisioner's list, so it must not
// be here either: advertising a `chat` A-record the server never serves gave
// chat.<domain> a wrong-host TLS error (step 207.10 item 1).
// `projects` (:3003) + `design` (:3004) joined in step 197 — the automations and design layers
// run as their own processes with their own subdomains, mirroring admin (each self-gates via
// its own proxy.ts, so no nginx auth_request needed).
export const SUBDOMAINS = ["", "www", "auth", "admin", "projects", "design", "data", "hermes", "lightrag"] as const;

export function hostFor(prefix: string, domain: string): string {
  return prefix ? `${prefix}.${domain}` : domain;
}
