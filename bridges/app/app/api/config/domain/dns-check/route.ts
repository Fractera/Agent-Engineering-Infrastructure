import { NextRequest, NextResponse } from "next/server";
import { promises as dns } from "dns";
import fs from "fs";
import { requireAuth } from "@/lib/require-auth";
import { readEnvFile } from "@/lib/env-file";

// Strict mode requires that ALL of these hostnames resolve to the
// server's public IP. NextAuth callbacks, the admin proxy and media
// uploads all rely on these subdomains; missing any one of them locks
// the user out after the switch.
const SUBDOMAIN_PREFIXES = ["", "auth", "admin", "data"] as const;

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

function readServerIp(): string | null {
  try {
    if (!fs.existsSync(SECRETS_FILE)) return null;
    const txt = fs.readFileSync(SECRETS_FILE, "utf-8");
    for (const line of txt.split("\n")) {
      const m = line.match(/^SERVER_IP=(.+)$/);
      if (m) return m[1].trim();
    }
  } catch {
    // fall through to other sources
  }
  // Fallback: bridges/app .env may carry it too.
  const env = readEnvFile("/opt/fractera/bridges/app/.env.local");
  return env.SERVER_IP ?? null;
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
