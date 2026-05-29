import { NextRequest, NextResponse } from "next/server";
import { promises as dns } from "dns";
import { requireAuth } from "@/lib/require-auth";
import { readServerIp, SUBDOMAINS as SUBDOMAIN_PREFIXES, hostFor } from "@/lib/server-ip";

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
  const hosts = SUBDOMAIN_PREFIXES.map((p) => hostFor(p, domain));
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
