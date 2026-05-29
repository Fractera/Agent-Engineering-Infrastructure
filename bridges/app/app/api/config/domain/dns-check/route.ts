import { NextRequest, NextResponse } from "next/server";
import { promises as dns } from "dns";
import { execSync } from "child_process";
import fs from "fs";
import { requireAuth } from "@/lib/require-auth";
import { readEnvFile } from "@/lib/env-file";

// Strict mode requires that ALL of these hostnames resolve to the
// server's public IP. After the Secure switch, nginx terminates TLS
// for all six and reverse-proxies to local ports:
//   apex (3000), auth.* (3001), admin.* (3002), data.* (3300),
//   hermes.* (9119), lightrag.* (9621).
// Missing any one of them locks the user out of part of the workspace
// (mixed-content blocks the iframe / sign-in callback fails).
const SUBDOMAIN_PREFIXES = ["", "auth", "admin", "data", "hermes", "lightrag"] as const;

const SECRETS_FILE = process.env.SECRETS_PATH ?? "/etc/fractera/secrets.env";

// Lightweight in-memory cache so a user clicking the "check" button a
// few times in a row doesn't slam our recursive resolver.
type CacheEntry = { at: number; payload: unknown };
const cache = new Map<string, CacheEntry>();
const TTL_MS = 60_000;

type RecordResult = {
  host: string;
  resolved: string[];
  matchesServer: boolean;
  error: string | null;
};

// Cache the resolved server IP for the lifetime of the process — it never
// changes mid-run, and shelling out to `hostname -I` on every request is
// wasteful.
let cachedServerIp: string | null | undefined;

function readServerIp(): string | null {
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

async function checkHost(host: string, serverIp: string | null): Promise<RecordResult> {
  try {
    const resolved = await dns.resolve4(host);
    const matchesServer = !!serverIp && resolved.includes(serverIp);
    return { host, resolved, matchesServer, error: null };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code ?? "ERROR";
    return { host, resolved: [], matchesServer: false, error: code };
  }
}

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const domain = req.nextUrl.searchParams.get("domain")?.trim().toLowerCase();
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
    return NextResponse.json({ error: "Missing or invalid domain" }, { status: 400 });
  }

  const cached = cache.get(domain);
  if (cached && Date.now() - cached.at < TTL_MS) {
    return NextResponse.json(cached.payload);
  }

  const serverIp = readServerIp();
  const hosts = SUBDOMAIN_PREFIXES.map((p) => (p ? `${p}.${domain}` : domain));
  const results = await Promise.all(hosts.map((h) => checkHost(h, serverIp)));
  const allOk = !!serverIp && results.every((r) => r.matchesServer);

  const payload = {
    domain,
    serverIp,
    allOk,
    results,
  };
  cache.set(domain, { at: Date.now(), payload });
  return NextResponse.json(payload);
}
