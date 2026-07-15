import { PROJECT_DESCRIPTION } from "../_data/description";
import { DIAGRAM_NODES } from "../_data/diagram";
import { PROJECT_DASHBOARD } from "../_data/dashboard";
import { DiagramSection } from "../../../_shared/components/diagram-section.client";
import { ValidateButton } from "../../../_shared/components/validate-button.client";
import { DashboardAccordion } from "../../../_shared/components/dashboard-accordion.client";
import { DevelopmentWaveBanner } from "../../../_shared/components/development-wave-banner.client";
import { ActivationLayer } from "../../../_shared/components/activation-layer.client";

// Reference example (step 243) — the STREAM counterpart of other/example-content-pipeline. Notification +
// launch console are rendered HERE (step 243.1 — moved out of the projects-zone layout so the owner's
// required page order, status bar/notification/title, can be per-page); this project has no status bar of
// its own (hand-built reference, not a createFrozenProject output), so they sit at the very top.
export default function StockPriceLookupEntry() {
  const d = PROJECT_DESCRIPTION;
  return (
    <>
      <main className="mx-auto w-[85vw] max-w-full space-y-3 px-4 pt-8">
        <DevelopmentWaveBanner automation="other/example-stream-stock-price" />
        <div className="space-y-1">
          <h1 className="text-3xl font-semibold">{d.title}</h1>
          <p className="max-w-3xl text-muted-foreground">{d.description}</p>
        </div>
        <div className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          This is the reference proof for the <strong>Stream</strong> automation type (step 243). Ask below —
          the console appears above the diagram. Each node&apos;s functions live only in{" "}
          <code>_nodes/&lt;id&gt;/</code>. See app/(projects)/README.md.
        </div>
        <ValidateButton automation="other/example-stream-stock-price" />
      </main>
      <ActivationLayer automation="other/example-stream-stock-price" />
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
