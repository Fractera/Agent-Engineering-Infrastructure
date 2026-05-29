import fs from "fs";
import { execSync } from "child_process";

export type CertInfo = {
  exists: boolean;
  path: string;
  expiresAt: string | null;   // ISO date or null
  sans: string[];             // Subject Alternative Names from the cert
  error: string | null;
};

// Inspect a PEM certificate file with openssl. Returns SAN list + expiry so
// the wizard can answer "does this cert cover all 7 hostnames we need".
// Safe to call on non-existent paths (returns {exists: false}).
export function readCertInfo(certPath: string): CertInfo {
  if (!fs.existsSync(certPath)) {
    return { exists: false, path: certPath, expiresAt: null, sans: [], error: null };
  }
  try {
    const text = execSync(
      `openssl x509 -in ${certPath} -noout -enddate -ext subjectAltName`,
      { timeout: 5000 }
    ).toString();

    // notAfter=May 29 12:34:56 2026 GMT
    let expiresAt: string | null = null;
    const m = text.match(/notAfter=(.+)/);
    if (m) {
      try { expiresAt = new Date(m[1].trim()).toISOString(); } catch { /* skip */ }
    }

    // X509v3 Subject Alternative Name:
    //     DNS:aifa.dev, DNS:www.aifa.dev, DNS:auth.aifa.dev, ...
    const sanLine = text.split("\n").find((l) => l.trim().startsWith("DNS:") || /\bDNS:/.test(l));
    const sans: string[] = [];
    if (sanLine) {
      const matches = sanLine.match(/DNS:([a-zA-Z0-9*.\-]+)/g);
      if (matches) {
        for (const dm of matches) {
          sans.push(dm.slice(4)); // strip "DNS:"
        }
      }
    }

    return { exists: true, path: certPath, expiresAt, sans, error: null };
  } catch (e) {
    return { exists: true, path: certPath, expiresAt: null, sans: [], error: String(e) };
  }
}

// Returns true if the cert covers EVERY required hostname (either via
// explicit SAN entry or a matching wildcard *.<parent>).
export function coversAllHostnames(certInfo: CertInfo, hostnames: string[]): boolean {
  if (!certInfo.exists || certInfo.sans.length === 0) return false;
  for (const host of hostnames) {
    if (certInfo.sans.includes(host)) continue;
    // Wildcard check: *.example.com matches foo.example.com but NOT example.com itself
    const dot = host.indexOf(".");
    if (dot < 0) return false;
    const parent = host.slice(dot + 1);
    if (certInfo.sans.includes(`*.${parent}`)) continue;
    return false;
  }
  return true;
}
