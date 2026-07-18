// Byte-identical twin of projects-app/lib/auth-bypass.ts (see its header) — HOST-AWARE since 256.4b:
// the IP/onboarding bypass opens the zone only for IP/localhost hosts; a domain request is the
// protected flow and enforces real auth even in IP mode.
export function shouldBypassAuth(host?: string | null): boolean {
  const envOpen = process.env.NODE_ENV === "development"
      || process.env.FRACTERA_IP_NODOMAIN_MODE === "true";
  if (!envOpen) return false;
  if (host === undefined) return true; // legacy callers without host context keep the old behavior
  const hostname = (host ?? "").split(":")[0];
  if (!hostname) return true; // server-internal call (no Host) — the onboarding path
  return /^\d{1,3}(?:\.\d{1,3}){3}$/.test(hostname) || hostname === "localhost";
}
