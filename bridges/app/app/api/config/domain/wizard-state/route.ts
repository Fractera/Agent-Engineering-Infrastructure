import { NextRequest, NextResponse } from "next/server";
import { promises as dns } from "dns";
import Database from "better-sqlite3";
import { requireAuth } from "@/lib/require-auth";
import { readServerIp, SUBDOMAINS, hostFor } from "@/lib/server-ip";
import { readCertInfo, coversAllHostnames } from "@/lib/cert-info";
import { readEnvFile } from "@/lib/env-file";

const APP_DB = process.env.APP_DB_PATH ?? "/opt/fractera/app/data/app.db";

const ENV_FILES = [
  "/opt/fractera/services/auth/.env.local",
  "/opt/fractera/bridges/app/.env.local",
  "/opt/fractera/app/.env.local",
  "/opt/fractera/services/data/.env",
];

type SiteSettingsRow = {
  custom_domain?: string | null;
  cert_source?: "auto" | "upload";
};

function readDomain(): { domain: string | null; certSource: "auto" | "upload" } {
  try {
    const db = new Database(APP_DB, { readonly: true });
    const row = db.prepare("SELECT custom_domain, cert_source FROM site_settings WHERE id = 1").get() as SiteSettingsRow | undefined;
    db.close();
    return {
      domain: row?.custom_domain ?? null,
      certSource: row?.cert_source ?? "auto",
    };
  } catch {
    return { domain: null, certSource: "auto" };
  }
}

async function dnsCheck(domain: string, serverIp: string | null) {
  const hosts = SUBDOMAINS.map((p) => hostFor(p, domain));
  const results = await Promise.all(hosts.map(async (h) => {
    try {
      const resolved = await dns.resolve4(h);
      return { host: h, matches: !!serverIp && resolved.includes(serverIp) };
    } catch {
      return { host: h, matches: false };
    }
  }));
  return {
    allOk: !!serverIp && results.every((r) => r.matches),
    missingHosts: results.filter((r) => !r.matches).map((r) => r.host),
  };
}

function isStrictMode(): boolean {
  // Secure mode is active when FRACTERA_IP_NODOMAIN_MODE is explicitly "false"
  // in ALL four env files. Any one of them still "true" or unset = demo/open.
  for (const f of ENV_FILES) {
    const vars = readEnvFile(f);
    if (vars.FRACTERA_IP_NODOMAIN_MODE !== "false") return false;
  }
  return true;
}

export async function GET(req: NextRequest) {
  const ok = await requireAuth(req.headers.get("cookie") ?? "");
  if (!ok) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { domain, certSource } = readDomain();

  // No domain entered yet — wizard hasn't started.
  if (!domain) {
    return NextResponse.json({
      domain: null,
      step1: { complete: false },
      step2: { complete: false, certSource: null },
      step3: { complete: false },
      step4: { complete: false },
      currentStep: 1,
    });
  }

  const serverIp = readServerIp();
  const expectedHosts = SUBDOMAINS.map((p) => hostFor(p, domain));

  // Step 1 — DNS resolves 7/7
  const dnsResult = await dnsCheck(domain, serverIp);

  // Step 2 — cert file exists AND covers all 7 hostnames
  const certPath = certSource === "upload"
    ? `/etc/fractera/certs/${domain}/fullchain.pem`
    : `/etc/letsencrypt/live/${domain}/fullchain.pem`;
  const certInfo = readCertInfo(certPath);
  const certComplete = coversAllHostnames(certInfo, expectedHosts);

  // Step 3 — end-to-end is "complete" only after the user actually clicked
  // the Final check button and it returned all-ok within the last 24h.
  // We don't auto-mark it from DNS+cert alone; reading is cheap but
  // re-doing HTTPS handshakes on every wizard-state poll would be wasteful.
  // The dedicated /health-check endpoint persists nothing — UI tracks its
  // last-result client-side. So here step3 is computed as a "ready to run"
  // gate: complete iff step1 AND step2 are complete.
  const step3Ready = dnsResult.allOk && certComplete;

  // Step 4 — strict mode active in all 4 env files
  const strictActive = isStrictMode();

  let currentStep: 1 | 2 | 3 | 4 | 5;
  if (strictActive) currentStep = 5;
  else if (step3Ready) currentStep = 4;
  else if (certComplete) currentStep = 3;
  else if (dnsResult.allOk) currentStep = 2;
  else currentStep = 1;

  return NextResponse.json({
    domain,
    serverIp,
    expectedHosts,
    step1: {
      complete: dnsResult.allOk,
      missingHosts: dnsResult.missingHosts,
    },
    step2: {
      complete: certComplete,
      certSource,
      certPath,
      certExists: certInfo.exists,
      certSans: certInfo.sans,
      certExpiresAt: certInfo.expiresAt,
    },
    step3: {
      // "complete" here just means "the gate is open" — UI tracks the
      // actual last-run result locally and re-renders when the user clicks
      // Final check.
      ready: step3Ready,
    },
    step4: {
      complete: strictActive,
    },
    currentStep,
  });
}
