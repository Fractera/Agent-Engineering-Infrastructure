import { stubStartDevelopmentRoute } from "@/lib/entity-architecture-routes";

// "Start development" for the "fork-activation" requirement (step 239) — POST { automation } -> materializes a
// Development Step from the pending brief (buildStubEntityStepMessage gives fork-activation its own brief: the
// three jobs — start settings, fork creation with those settings, launch scheduling), then archives+clears it.
// Same shared implementation as the other requirement entities; step 240 replaces this per-entity dispatch
// with the single page-level wave.
export const runtime = "nodejs";
export const POST = stubStartDevelopmentRoute("fork-activation");
