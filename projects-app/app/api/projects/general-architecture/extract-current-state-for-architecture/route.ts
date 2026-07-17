import { extractCurrentRoute } from "@/lib/entity-architecture-routes";

// Per-entity JSON2 slice for "general" (step 249) — GET ?automation=<cat/slug> -> EntitySlice (current state).
export const runtime = "nodejs";
export const GET = extractCurrentRoute("general");
