"use client";

import { ProcessesEntity } from "../entities/processes";

// COMPAT WRAPPER (step 254.6) — the processes entity moved to the view/admin/container pattern at
// _shared/entities/processes/ (ROUTE-V3 law 3). Kept only for any out-of-tree import; the accordion
// monolith uses ProcessesEntity directly. IS the full admin composition.
export function ProcessesTimeline({ automation }: { automation: string }) {
  return <ProcessesEntity automation={automation} mode="admin" />;
}
