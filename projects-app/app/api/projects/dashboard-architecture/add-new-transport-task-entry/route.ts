import { addTransportRoute } from "@/lib/entity-architecture-routes";

// Writes the pending, not-yet-developed brief for "dashboard" (step 238) — POST { automation, ref?, payload }.
// ref scopes one instance (node/edge/use-case cuid); ignored (automation-wide) for the other entities.
export const runtime = "nodejs";
export const POST = addTransportRoute("dashboard");
