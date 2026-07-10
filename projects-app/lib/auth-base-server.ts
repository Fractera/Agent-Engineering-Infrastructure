// Server-side derivation of the Auth service's browser-facing base URL, from the
// REQUEST host header. The mirror of authBase() in lib/runtime-urls.ts (which is
// client-side, from window.location). We do NOT read NEXT_PUBLIC_* here: those are
// baked at build time and go stale across the IP→domain (Secure mode) switch,
// which has no app rebuild. Deriving from the request host works in both modes
// with one build.
//
// - IP / localhost (insecure mode): same host, auth on port 3001.
// - Domain (Secure mode): the auth service is the sibling subdomain auth.<apex>
//   on 443 (no port). Building <host>:3001 on a domain would yield
//   https://admin.<domain>:3001 → ERR_SSL_PROTOCOL_ERROR (3001 has no TLS).

// Service subdomain prefixes — used to recover the apex from any service host
// (e.g. admin.aifa.dev → aifa.dev) in domain/Secure mode. Mirrors KNOWN_PREFIXES
// in lib/runtime-urls.ts.
const KNOWN_PREFIXES = ["www", "auth", "admin", "data", "hermes", "lightrag"];

function isIpHost(hostname: string): boolean {
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname === "localhost";
}

function apexFrom(hostname: string): string {
  const labels = hostname.split(".");
  return KNOWN_PREFIXES.includes(labels[0]) ? labels.slice(1).join(".") : hostname;
}

// Build the Auth service base URL as the BROWSER must reach it, from a request's
// host header and protocol. `host` is the Host / X-Forwarded-Host value (may carry
// a :port in IP mode); `proto` is http or https (X-Forwarded-Proto). Falls back to
// localhost:3001 when host is missing (e.g. an internal request without a host).
export function authBaseFromHost(host: string | null, proto: string): string {
  if (!host) return "http://localhost:3001";
  const hostname = host.split(":")[0];
  const scheme = proto === "https" ? "https" : "http";
  if (isIpHost(hostname)) return `${scheme}://${hostname}:3001`;
  return `${scheme}://auth.${apexFrom(hostname)}`;
}
