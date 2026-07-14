import { extractFullRoute } from "@/lib/entity-architecture-routes";

// Per-entity JSON1 slice for "fork-activation" (step 239) — GET ?automation=<cat/slug> -> EntitySlice with the
// entity's full history.
export const runtime = "nodejs";
export const GET = extractFullRoute("fork-activation");
