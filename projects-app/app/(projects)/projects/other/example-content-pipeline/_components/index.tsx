import { PROJECT_DESCRIPTION } from "../_data/description";
import { DIAGRAM_NODES } from "../_data/diagram";
import { DiagramSection } from "../../../_shared/components/diagram-section.client";
import { InstancesPanel } from "../../../_shared/components/instances-panel.client";
import { ValidateButton } from "../../../_shared/components/validate-button.client";

// Reference example (step 223.C). The Diagram is ALWAYS visible — full screen width, 80vh — not an
// accordion (owner design): the Master's nodes as a graph; click a node to open its full contract (name/
// description + Instruction + function cards, incl. the full external-AI system instruction). Press
// "Simulate run" to watch the active-node orange highlight walk through the nodes.
export default function ExampleEntry() {
  const d = PROJECT_DESCRIPTION;
  return (
    <>
      <main className="mx-auto max-w-5xl space-y-3 px-4 pt-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">{d.title}</h1>
          <p className="max-w-3xl text-muted-foreground">{d.description}</p>
        </div>
        <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          This is the reference for <strong>the node → functions contract</strong>. Click a node on the
          canvas to open its full contract on the right. Each node&apos;s functions live only in{" "}
          <code>_nodes/&lt;id&gt;/</code>. See app/(projects)/README.md.
        </div>
        <ValidateButton automation="other/example-content-pipeline" />
      </main>
      <DiagramSection nodes={DIAGRAM_NODES} automation="other/example-content-pipeline" />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <InstancesPanel nodes={DIAGRAM_NODES} automation="other/example-content-pipeline" />
      </main>
    </>
  );
}
