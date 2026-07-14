import { stubStartDevelopmentRoute } from "@/lib/entity-architecture-routes";

// "Start development" for the "dashboard" requirement (step 238 Phase 2) — POST { automation } -> materializes
// a Development Step from the pending brief, then archives+clears it. See stubStartDevelopmentRoute in
// lib/entity-architecture-routes.ts for the shared implementation (mirrors chain-spec/start-development).
export const runtime = "nodejs";
export const POST = stubStartDevelopmentRoute("dashboard");
