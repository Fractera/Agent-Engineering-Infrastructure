import { extractFullRoute } from "@/lib/entity-architecture-routes";

// Per-entity JSON1 slice for "node" (step 238) — GET ?automation=<cat/slug> -> EntitySlice (current + history).
export const runtime = "nodejs";
export const GET = extractFullRoute("node");
