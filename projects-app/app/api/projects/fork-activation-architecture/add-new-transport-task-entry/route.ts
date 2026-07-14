import { addTransportRoute } from "@/lib/entity-architecture-routes";

// Writes the pending, not-yet-developed brief for "fork-activation" (step 239) — POST { automation, payload }.
// Automation-wide (ref=''), like the other requirement entities. A plain draft overwrite: nothing is archived
// here — archiving belongs to the hand-off (start-development / the wave, step 240).
export const runtime = "nodejs";
export const POST = addTransportRoute("fork-activation");
