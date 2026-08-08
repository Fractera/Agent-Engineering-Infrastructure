// Next calls register() once per server start — the designed place for a background task, and the
// only one that survives a pm2 reload without being tied to a request.
//
// Guarded by the runtime check because instrumentation also runs in the edge runtime, where there is
// no child_process and no git.
export async function register() {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  const { startAutoDeployWatch } = await import("./lib/auto-deploy");
  startAutoDeployWatch();
}
