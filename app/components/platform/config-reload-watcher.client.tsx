"use client";

import { useEffect, useRef } from "react";

// Silent reload poller for "apply now" platform changes. The root layout renders this with the
// reloadNonce it was server-rendered with; we poll /api/platform/signature and, when the nonce
// differs from our boot value, reload the tab so it picks up the new default (theme / center
// width). An "apply next load" write does NOT bump the nonce, so it never triggers a reload.
// After the reload the page is re-rendered with the new nonce → values match → no loop.
//
// Reuses the heartbeat idea of PollBar (the live /architecture tree) but headless: no UI, pauses
// while the tab is hidden so a backgrounded tab is not polled.

const POLL_MS = 5000;

export function ConfigReloadWatcher({ nonce }: { nonce: number }) {
  const bootNonce = useRef(nonce);

  useEffect(() => {
    let stopped = false;

    async function check() {
      if (document.hidden) return;
      try {
        const res = await fetch("/api/platform/signature", { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { reloadNonce?: number };
        if (stopped) return;
        if (typeof data.reloadNonce === "number" && data.reloadNonce !== bootNonce.current) {
          window.location.reload();
        }
      } catch {
        /* network blip — try again next tick */
      }
    }

    const id = setInterval(check, POLL_MS);
    return () => {
      stopped = true;
      clearInterval(id);
    };
  }, []);

  return null;
}
