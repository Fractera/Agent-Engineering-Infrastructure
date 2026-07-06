// The ACTIONS registry as data — the automation ontology's central entity (step 188-R;
// canon: CRUD-DOCS/workspace-standards/automation-ontology.md). An Action is a named outcome
// of the automation: a branch of steps triggered by its hook phrases, with a color, a declared
// condition and a delivery channel. This starter is EMPTY: when the project is born from a
// decomposition (orchestrate-project-by-steps) this file is GENERATED from the graph's
// actions[] registry (marker `// fractera:actions <sheetId>`, deterministic rewrite). To add or
// change an action, extend the GRAPH and re-run the engine — never hand-edit a generated file.
export type ProjectActionHook = { phrase: string; lang: string };
export type ProjectAction = {
  id: string;
  title: string;
  description: string;
  color: string; // palette token — the UI maps it to theme-aware classes
  hooks: ProjectActionHook[];
  condition: string | null; // declared guard — implemented in the workflow step (R6)
  channel: string; // where this action's output is delivered
};

export const PROJECT_ACTIONS: ProjectAction[] = [];

// Lookup helper — unknown ids resolve to a neutral placeholder (never undefined), so the
// diagram/table render safely before the engine has generated the real registry.
export function projectAction(id: string): ProjectAction {
  return (
    PROJECT_ACTIONS.find((a) => a.id === id) ?? {
      id, title: id, description: "", color: "neutral", hooks: [], condition: null, channel: "",
    }
  );
}
