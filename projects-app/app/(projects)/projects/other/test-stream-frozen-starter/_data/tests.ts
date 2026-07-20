import type { Probe } from "../_types/tests";

// This automation's TESTS (frozen standard v3, step 220 — see _shared/tests.ts and
// app/(projects)/README.md "The settings & tests declaration standard"). EMPTY BY DESIGN: a fresh
// skeleton has nothing to probe yet. Declare one probe per entity the automation touches (input /
// intermediate / output) once it has them — each carries its OWN prepared success/error text, and
// the Tests modal renders it. Channel-type probes reuse the shared route /api/projects/tests/<kind>:
//
//   export const PROBES: Probe[] = [
//     {
//       id: "openai", label: "AI key", hint: "OpenAI key authorizes", stage: "input",
//       binding: { type: "shared", kind: "openai" },
//       successText: "The OpenAI key is configured.",
//       errorText: "OpenAI key missing — set it in Settings.",
//     },
//   ];
export const PROBES: Probe[] = [];
