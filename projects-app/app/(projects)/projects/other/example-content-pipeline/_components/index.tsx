import { PROJECT_DESCRIPTION } from "../_data/description";
import { DIAGRAM_NODES } from "../_data/diagram";
import { DiagramCanvas } from "../../../_shared/components/diagram-canvas.client";

// Reference example (step 223.C). It renders the Diagram CANVAS directly: the Master's nodes as a graph;
// click a node to open its full contract (name/description + Instruction + function cards, incl. the
// full external-AI system instruction) in the side panel.
export default function ExampleEntry() {
  const d = PROJECT_DESCRIPTION;
  return (
    <main className="mx-auto max-w-5xl space-y-6 px-4 py-8">
      <div className="space-y-1">
        <h1 className="text-3xl font-semibold">{d.title}</h1>
        <p className="max-w-3xl text-muted-foreground">{d.description}</p>
      </div>
      <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
        This is the reference for <strong>the node → functions contract</strong>. Click a node on the
        canvas to open its full contract on the right. Each node&apos;s functions live only in{" "}
        <code>_nodes/&lt;id&gt;/</code>. See app/(projects)/README.md.
      </div>
      <DiagramCanvas nodes={DIAGRAM_NODES} />
    </main>
  );
}
