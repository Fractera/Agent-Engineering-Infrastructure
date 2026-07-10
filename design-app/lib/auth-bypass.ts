// Copy of the shared bypass (self-sufficiency iron rule): dev OR IP/onboarding mode opens the
// zone. Byte-identical to the FNS/bridges-app/projects-app copies.
export function shouldBypassAuth(): boolean {
  return process.env.NODE_ENV === "development"
      || process.env.FRACTERA_IP_NODOMAIN_MODE === "true";
}
