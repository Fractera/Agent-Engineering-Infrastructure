import { ACTIVATIONS } from "@/app/(projects)/projects/_generated/executables";
import type { ActivationSchema } from "@/app/(projects)/projects/_shared/activation";
import { requiredParamKeys } from "@/app/(projects)/projects/_shared/activation";

// READING AN AUTOMATION'S ACTIVATION (step 241 E3) — the one place both the control panel and the executor
// ask "what does one run of this automation take?", so they can never disagree.
//
// The schema lives in the automation's OWN _data/activation.ts (written by the coding agent when it designs
// the automation's fork activation). It is reached through the generated registry — a runtime path cannot be
// imported inside the "(projects)" route group (lesson 214), so the registry carries a static import per
// automation, regenerated alongside the diagram.

export type { ActivationSchema };

/** The automation's declared activation, or null when it has none yet (not designed). */
export async function loadActivation(automation: string): Promise<ActivationSchema | null> {
  const load = ACTIVATIONS[automation];
  if (!load) return null;
  const mod = (await load().catch(() => null)) as { ACTIVATION?: ActivationSchema } | null;
  const schema = mod?.ACTIVATION;
  if (!schema || !Array.isArray(schema.params)) return null;
  return schema;
}

/** Which REQUIRED keys a fork's params are missing. [] = the fork can run (or nothing is required).
 *  An automation with no declaration yet returns [] here: the "you have not designed the launch" case is a
 *  different, earlier refusal (the panel's empty state), not a validation error. */
export async function missingParams(
  automation: string,
  params: Record<string, unknown>,
): Promise<string[]> {
  const schema = await loadActivation(automation);
  if (!schema) return [];
  return requiredParamKeys(schema).filter((k) => {
    const v = params[k];
    return v === undefined || v === null || (typeof v === "string" && !v.trim());
  });
}
