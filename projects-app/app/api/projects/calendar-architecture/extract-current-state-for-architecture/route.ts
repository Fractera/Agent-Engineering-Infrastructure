import { extractCurrentRoute } from "@/lib/entity-architecture-routes";

// Per-entity JSON2 slice for "calendar" (step 238) — GET ?automation=<cat/slug> -> EntitySlice (current only).
export const runtime = "nodejs";
export const GET = extractCurrentRoute("calendar");
