import { extractFullRoute } from "@/lib/entity-architecture-routes";

// Per-entity JSON1 slice for "general" (step 249) — GET ?automation=<cat/slug> -> EntitySlice with history.
export const runtime = "nodejs";
export const GET = extractFullRoute("general");
