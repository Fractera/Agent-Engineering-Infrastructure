import { extractCurrentRoute } from "@/lib/entity-architecture-routes";

// Per-entity JSON2 slice for "cron" (step 238 pattern) — GET ?automation=<cat/slug> -> EntitySlice (current only).
export const runtime = "nodejs";
export const GET = extractCurrentRoute("cron");
