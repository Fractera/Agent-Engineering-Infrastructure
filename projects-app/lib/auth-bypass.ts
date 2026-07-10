// Copy of the FNS/bridges-app bypass (self-sufficiency iron rule): dev OR IP/onboarding mode
// opens the zone. Kept byte-identical to fractera-next-starter/lib/auth/auth-bypass.ts and
// bridges/app/lib/auth-bypass.ts so the three services gate identically.
export function shouldBypassAuth(): boolean {
  return process.env.NODE_ENV === "development"
      || process.env.FRACTERA_IP_NODOMAIN_MODE === "true";
}
