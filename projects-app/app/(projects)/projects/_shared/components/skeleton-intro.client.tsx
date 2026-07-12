"use client";

import { useEffect, useState } from "react";

// The frozen-skeleton blurb (owner): it explains a fresh automation ONCE. After the owner has opened the
// page a single time it disappears — the flag is per browser (localStorage), per automation. A brand-new
// project shows it; a project you have already visited never shows it again.
export function SkeletonIntro({ automation, children }: { automation: string; children: React.ReactNode }) {
  const [show, setShow] = useState(false);

  useEffect(() => {
    const key = `skeleton-intro-seen:${automation}`;
    try {
      if (localStorage.getItem(key)) return;      // already visited → never show again
      setShow(true);
      localStorage.setItem(key, "1");             // mark this first visit
    } catch {
      setShow(true);                               // storage unavailable → show it (harmless)
    }
  }, [automation]);

  if (!show) return null;
  return <>{children}</>;
}
