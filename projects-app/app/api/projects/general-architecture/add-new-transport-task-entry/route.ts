import { addTransportRoute } from "@/lib/entity-architecture-routes";

// Writes the pending brief for "general" (step 249 — the owner's free Sparkles comment on the whole
// automation) — POST { automation, payload: { brief } }. ref is always '' (automation-wide).
export const runtime = "nodejs";
export const POST = addTransportRoute("general");
