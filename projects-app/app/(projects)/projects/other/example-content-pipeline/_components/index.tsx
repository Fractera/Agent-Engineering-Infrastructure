import { PROJECT_DESCRIPTION } from "../_data/description";
import { DIAGRAM_NODES } from "../_data/diagram";
import { DiagramSection } from "../../../_shared/components/diagram-section.client";
import { InstancesPanel } from "../../../_shared/components/instances-panel.client";
import { ValidateButton } from "../../../_shared/components/validate-button.client";
import { DashboardAccordion } from "../../../_shared/components/dashboard-accordion.client";
import { ProcessesTimeline } from "../../../_shared/components/processes-timeline.client";
import { EXAMPLE_DASHBOARD } from "../_data/dashboard";

// Reference example (step 223.C). The Diagram is ALWAYS visible — full screen width, 80vh — not an
// accordion (owner design): the Master's nodes as a graph; click a node to open its full contract (name/
// description + Instruction + function cards, incl. the full external-AI system instruction). Press
// "Simulate run" to watch the active-node orange highlight walk through the nodes.
export default function ExampleEntry() {
  const d = PROJECT_DESCRIPTION;
  return (
    <>
      <main className="mx-auto w-[85vw] max-w-full space-y-3 px-4 pt-8">
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
      {/* The launch control panel is NOT mounted here (step 241 E3.1): page-level chrome lives in the
          projects-zone layout, so every automation page gets it — this one included. */}
      <main className="mx-auto w-[85vw] max-w-full space-y-8 px-4 py-8">
        {/* Anchor for the Gantt bars' click-to-scroll (step 230). */}
        <div id="instances-panel">
          <InstancesPanel nodes={DIAGRAM_NODES} automation="other/example-content-pipeline" />
        </div>
        {/* The PROCESSES / Gantt timeline (step 230) — a row per fork; appears once forks exist. */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Processes</h3>
          <ProcessesTimeline automation="other/example-content-pipeline" />
        </section>
        {/* The DASHBOARD standard (step 228) — one tab, two config-driven tables; the first has 10+ columns
            of every type (several hidden by default) to exercise the picker + horizontal scroll. */}
        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Dashboard</h3>
          <DashboardAccordion automation="other/example-content-pipeline" dashboard={EXAMPLE_DASHBOARD} />
        </section>
      </main>
    </>
  );
}
