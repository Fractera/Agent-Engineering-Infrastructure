// Copy of the FNS/bridges-app bypass (self-sufficiency iron rule) — kept in step with
// projects-app/lib/auth/auth-bypass.ts (byte-identical twin).
//
// HOST-AWARE since step 256.4b (the owner's rule, 2026-07-18: «домен = защищённый поток УЖЕ СЕЙЧАС»).
// The IP/onboarding bypass opens the zone ONLY when the request itself arrives on an IP/localhost
// host. A DOMAIN request (projects.<apex>) is the protected flow and enforces real auth even while
// the server still runs in IP mode — attaching a domain IS opting into protection, no env flip needed.
export function shouldBypassAuth(host?: string | null): boolean {
  const envOpen = process.env.NODE_ENV === "development"
      || process.env.FRACTERA_IP_NODOMAIN_MODE === "true";
  if (!envOpen) return false;
  if (host === undefined) return true; // legacy callers without host context keep the old behavior
  const hostname = (host ?? "").split(":")[0];
  if (!hostname) return true; // server-internal call (no Host) — the onboarding path
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname === "localhost";
}
