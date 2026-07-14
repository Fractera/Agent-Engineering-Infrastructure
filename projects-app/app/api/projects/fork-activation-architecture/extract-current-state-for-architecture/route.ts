import { extractCurrentRoute } from "@/lib/entity-architecture-routes";

// Per-entity JSON2 slice for "fork-activation" (step 239) — GET ?automation=<cat/slug> -> EntitySlice (current
// only). The tenth entity: how a run of an INSTANCED automation is started (start settings -> fork -> schedule).
export const runtime = "nodejs";
export const GET = extractCurrentRoute("fork-activation");
