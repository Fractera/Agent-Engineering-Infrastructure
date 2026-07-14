// GENERATED — do not edit by hand (lib/executables.ts, step 241).
// One static import() per executable node: the bundler sees them all, so the general executor can call any
// node's REAL compiled functions without a runtime path (which a "(projects)" route group makes impossible).
// Regenerated whenever a node is created, materialized or deleted — like _data/diagram.ts.

export type NodeModule = Record<string, unknown>;

export const EXECUTABLES: Record<string, () => Promise<NodeModule>> = {
  "other/example-content-pipeline:find-sources": () => import("../other/example-content-pipeline/_nodes/find-sources/functions"),
  "other/example-content-pipeline:prepare-content": () => import("../other/example-content-pipeline/_nodes/prepare-content/functions"),
  "other/example-content-pipeline:publish": () => import("../other/example-content-pipeline/_nodes/publish/functions"),
};

export function executableKeys(): string[] {
  return Object.keys(EXECUTABLES);
}
