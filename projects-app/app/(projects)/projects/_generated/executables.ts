// GENERATED — do not edit by hand (lib/executables.ts, step 241).
// One static import() per executable node: the bundler sees them all, so the general executor can call any
// node's REAL compiled functions without a runtime path (which a "(projects)" route group makes impossible).
// Regenerated whenever a node is created, materialized or deleted — like _data/diagram.ts.
//
// ACTIVATIONS (E3): the same trick for each automation's _data/activation.ts — the launch parameters ONE RUN
// of it takes. The control panel renders itself from that declaration and the executor validates a fork
// against it, so both read the automation's own file rather than presuming anything.

export type NodeModule = Record<string, unknown>;
export type ActivationModule = Record<string, unknown>;
export type DashboardModule = Record<string, unknown>;

export const EXECUTABLES: Record<string, () => Promise<NodeModule>> = {

};

export const ACTIVATIONS: Record<string, () => Promise<ActivationModule>> = {

};

// DASHBOARDS (owner 2026-07-16): each automation's _data/dashboard.ts (PROJECT_DASHBOARD) — the architecture
// bundle reads the real typed table configs (columns, actions) through this, never a regex parse.
export const DASHBOARDS: Record<string, () => Promise<DashboardModule>> = {

};

export function executableKeys(): string[] {
  return Object.keys(EXECUTABLES);
}
