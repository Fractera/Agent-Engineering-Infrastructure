// THE IN-PROCESS TICKER (step 254.8e) — executes due scheduled requests («напомни через час») every 30s,
// inside the projects-app process itself: no external cron dependency, survives pm2 reload (register()
// runs on every server start; Next 15+ instrumentation is stable). Guarded to the node runtime and to a
// single interval per process.
export async function register() {
  if (process.env.NEXT_RUNTIME && process.env.NEXT_RUNTIME !== "nodejs") return;
  const g = globalThis as { __fracteraScheduledTicker?: boolean };
  if (g.__fracteraScheduledTicker) return;
  g.__fracteraScheduledTicker = true;
  const tick = async () => {
    try {
      const { executeDueRequests } = await import("@/lib/scheduled-requests");
      await executeDueRequests();
    } catch { /* next tick retries — a broken tick must never crash the server */ }
  };
  setInterval(() => { void tick(); }, 30_000);
  void tick();
}
