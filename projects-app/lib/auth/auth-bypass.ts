export function shouldBypassAuth(): boolean {
  return process.env.NODE_ENV === "development"
      || process.env.FRACTERA_IP_NODOMAIN_MODE === "true";
}
