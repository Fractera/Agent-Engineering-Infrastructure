import { NextRequest, NextResponse } from "next/server";
import { promises as dns } from "dns";
import https from "https";
import { requireAuth } from "@/lib/require-auth";
import { readServerIp, SUBDOMAINS, hostFor } from "@/lib/server-ip";

type HostResult = {
  host: string;
  dnsOk: boolean;
  resolved: string[];
  httpsStatus: number | null;
  certValid: boolean;
  error: string | null;
};

// One HTTPS HEAD against the host. Uses strict cert validation (default
// rejectUnauthorized: true). 5-second timeout per host so the whole sweep
// finishes in ~5s even if one host hangs.
function probe(host: string): Promise<{ status: number | null; certValid: boolean; error: string | null }> {
  return new Promise((resolve) => {
    const req = https.request({
      host,
      port: 443,
      method: "HEAD",
      path: "/",
      timeout: 5000,
      // Default: rejectUnauthorized: true — any cert issue (expired, wrong
      // SAN, untrusted CA) makes the request fail with a TLS error, which we
      // catch and treat as certValid=false.
    }, (res) => {
      resolve({ status: res.statusCode ?? null, certValid: true, error: null });
    });

    req.on("timeout", () => {
      req.destroy();
      resolve({ status: null, certValid: false, error: "timeout" });
    });
    req.on("error", (err: NodeJS.ErrnoException) => {
      const code = err.code ?? err.message ?? "ERROR";
      // Classify TLS-related codes so the UI can show cert vs network errors
      // distinctly.
      const isTls =
        code.startsWith("CERT_") ||
        code === "UNABLE_TO_VERIFY_LEAF_SIGNATURE" ||
        code === "DEPTH_ZERO_SELF_SIGNED_CERT" ||
        code === "SELF_SIGNED_CERT_IN_CHAIN" ||
        code === "ERR_TLS_CERT_ALTNAME_INVALID";
      resolve({ status: null, certValid: !isTls, error: code });
    });
    req.end();
  });
}

export async function POST(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { domain?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const domain = (body.domain ?? "").trim().toLowerCase();
  if (!domain || !/^[a-z0-9.-]+\.[a-z]{2,}$/.test(domain)) {
    return NextResponse.json({ error: "Missing or invalid domain" }, { status: 400 });
  }

  const serverIp = readServerIp();
  const hosts = SUBDOMAINS.map((p) => hostFor(p, domain));

  const results: HostResult[] = await Promise.all(hosts.map(async (host) => {
    // DNS first — if it doesn't resolve to our IP, no point trying HTTPS.
    let resolved: string[] = [];
    let dnsOk = false;
    let dnsError: string | null = null;
    try {
      resolved = await dns.resolve4(host);
      dnsOk = !!serverIp && resolved.includes(serverIp);
    } catch (err: unknown) {
      dnsError = (err as { code?: string })?.code ?? "ERROR";
    }

    if (!dnsOk) {
      return {
        host,
        dnsOk: false,
        resolved,
        httpsStatus: null,
        certValid: false,
        error: dnsError ?? `DNS does not point to ${serverIp ?? "this server"}`,
      };
    }

    const p = await probe(host);
    return {
      host,
      dnsOk: true,
      resolved,
      httpsStatus: p.status,
      certValid: p.certValid,
      error: p.error,
    };
  }));

  // "All OK" requires every host to resolve AND respond 200/301/302 AND have
  // a valid cert. Redirects to https from http are fine; what matters is the
  // TLS handshake succeeded with a trusted cert.
  const allOk = results.every((r) =>
    r.dnsOk && r.certValid &&
    r.httpsStatus !== null && r.httpsStatus >= 200 && r.httpsStatus < 400
  );

  return NextResponse.json({
    domain,
    serverIp,
    allOk,
    results,
  });
}
