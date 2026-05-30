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

// One HTTPS GET against the host. Uses strict cert validation (default
// rejectUnauthorized: true). 5-second timeout per host so the whole sweep
// finishes in ~5s even if one host hangs.
//
// GET (not HEAD): several services we proxy (Hermes :9119, LightRAG :9621)
// reject HEAD with 405 even though they serve a page on GET. What we actually
// need to verify is "TLS handshake succeeds with a trusted cert and the
// service responds" — GET reflects that for every service type. We tear the
// response down as soon as headers arrive (res.destroy) so we never download
// the body.
function probe(host: string): Promise<{ status: number | null; certValid: boolean; error: string | null }> {
  return new Promise((resolve) => {
    const req = https.request({
      host,
      port: 443,
      method: "GET",
      path: "/",
      timeout: 5000,
      // Default: rejectUnauthorized: true — any cert issue (expired, wrong
      // SAN, untrusted CA) makes the request fail with a TLS error, which we
      // catch and treat as certValid=false.
    }, (res) => {
      const status = res.statusCode ?? null;
      res.destroy(); // headers are enough — don't pull the body
      resolve({ status, certValid: true, error: null });
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

  // "All OK" requires every host to resolve, complete a TLS handshake with a
  // trusted cert, and return SOME HTTP response below 500. The actual status
  // code (200 / 307 / 404 / 405 …) is informational: a backend like the data
  // service legitimately 404s at "/", and that does not mean Secure mode will
  // break it — the cert is what matters. Only a missing response (null =
  // timeout / TLS failure) or a 5xx (service genuinely down) counts as a
  // failure here.
  const allOk = results.every((r) =>
    r.dnsOk && r.certValid &&
    r.httpsStatus !== null && r.httpsStatus >= 200 && r.httpsStatus < 500
  );

  return NextResponse.json({
    domain,
    serverIp,
    allOk,
    results,
  });
}
