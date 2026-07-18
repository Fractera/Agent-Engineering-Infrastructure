"use client";

import { ControlPanelEntity } from "../entities/controlpanel";

// COMPAT WRAPPER (step 254.3) — the launch console moved to the view/admin/container pattern at
// _shared/entities/controlpanel/ (ROUTE-V3 law 3): view = the interaction plane (the one-shot ask
// console), admin = the management plane (fork manager + the design Quiz). This name stays because the
// skeleton and the zone mount import it; it IS the admin composition now — one logic source.
export function ActivationLayer({ automation }: { automation: string }) {
  return <ControlPanelEntity automation={automation} mode="admin" />;
}
