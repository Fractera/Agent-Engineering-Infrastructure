import { extractFullRoute } from "@/lib/entity-architecture-routes";

// Per-entity JSON1 slice for "cron" (step 238 pattern) — GET ?automation=<cat/slug> -> EntitySlice (current + history).
export const runtime = "nodejs";
export const GET = extractFullRoute("cron");
