import { PROJECT_DESCRIPTION } from "../_data/description";
import { DIAGRAM_NODES } from "../_data/diagram";
import { PROJECT_DASHBOARD } from "../_data/dashboard";
import { DiagramSection } from "../../../_shared/components/diagram-section.client";
import { ValidateButton } from "../../../_shared/components/validate-button.client";
import { DashboardAccordion } from "../../../_shared/components/dashboard-accordion.client";

// Reference example (step 243) — the STREAM counterpart of other/example-content-pipeline. The launch
// console (a text/voice field + "Ask" button, inline success/error) is NOT mounted here: page-level chrome
// (wave banner, page lock, the launch control panel) lives in the projects-zone layout (step 241 E3.1) and
// wraps every automation page — this one included, the moment its own `_data/activation.ts` declares a param.
export default function StockPriceLookupEntry() {
  const d = PROJECT_DESCRIPTION;
  return (
    <>
      <main className="mx-auto w-[85vw] max-w-full space-y-3 px-4 pt-8">
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">{d.title}</h1>
          <p className="max-w-3xl text-muted-foreground">{d.description}</p>
        </div>
        <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          This is the reference proof for the <strong>Stream</strong> automation type (step 243). Ask below —
          the console appears above the diagram, mounted by the projects-zone layout. Each node&apos;s
          functions live only in <code>_nodes/&lt;id&gt;/</code>. See app/(projects)/README.md.
        </div>
        <ValidateButton automation="other/example-stream-stock-price" />
      </main>
      <DiagramSection nodes={DIAGRAM_NODES} automation="other/example-stream-stock-price" />
      <main className="mx-auto w-[85vw] max-w-full space-y-8 px-4 py-8">
        <section className="space-y-3">
          <h3 className="text-lg font-semibold">Dashboard</h3>
          <DashboardAccordion automation="other/example-stream-stock-price" dashboard={PROJECT_DASHBOARD} />
        </section>
      </main>
    </>
  );
}
