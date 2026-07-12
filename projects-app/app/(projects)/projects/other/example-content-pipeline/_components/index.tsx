import { PROJECT_DESCRIPTION } from "../_data/description";
import { DIAGRAM_NODES } from "../_data/diagram";
import { DiagramPanel } from "../../../_shared/components/diagram-panel.client";

// Reference example (step 223.C.2). It renders the Diagram panel DIRECTLY (not inside a collapsed
// accordion) so the node → functions contract is visible at a glance: each node shows its name +
// description, a pre-closed "Instruction" accordion, and one card per function with its typed I/O.
export default function ExampleEntry() {
  const d = PROJECT_DESCRIPTION;
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold">{d.title}</h1>
        <p className="max-w-3xl text-muted-foreground">{d.description}</p>
      </div>
      <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        This is the reference for <strong>the node → functions contract</strong>. The Master diagram
        below is three co-located nodes; each node&apos;s functions live only in{" "}
        <code>_nodes/&lt;id&gt;/</code>. See app/(projects)/README.md.
      </div>
      <DiagramPanel nodes={DIAGRAM_NODES} />
    </main>
  );
}
