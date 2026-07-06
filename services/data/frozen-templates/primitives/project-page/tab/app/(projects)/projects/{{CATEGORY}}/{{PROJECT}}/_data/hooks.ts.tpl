// Default hook phrases declared for this project (step 187.4). Seeded at compose time
// from {{PROJECT_HOOK_PHRASES}} (the composer --hook-phrases arg, drawn from the 82-lang
// default-hook-phrases catalog for the slot's language). These are SUGGESTIONS shown in
// the Hooks panel: the user registers them (or their own wording) into the GLOBAL
// project_hooks table via /api/project-hooks, where app-wide uniqueness is enforced.
// Empty array → the panel starts with no suggestions (the user can still add hooks).
export type DefaultHook = {
  action: "save" | "remind" | "recall" | "custom";
  phrase: string;
  description: string;
  lang?: string;
};

export const DEFAULT_HOOKS: DefaultHook[] = {{PROJECT_HOOK_PHRASES}};
