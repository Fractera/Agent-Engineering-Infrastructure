import { addTransportRoute } from "@/lib/entity-architecture-routes";

// Writes the pending, not-yet-developed brief for "cron" (step 238 pattern, extended for the cron entity).
// POST { automation, ref?, payload }. ref is ignored (automation-wide, like calendar/dashboard/etc).
export const runtime = "nodejs";
export const POST = addTransportRoute("cron");
