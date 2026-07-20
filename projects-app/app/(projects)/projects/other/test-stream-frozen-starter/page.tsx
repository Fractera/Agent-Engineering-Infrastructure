import AutomationEntry from "./_components";
import { AutomationViewPage } from "../../_shared/components/automation-view-page.client";
import { PROJECT_DESCRIPTION } from "./_data/description";
import { PROJECT_CONFIG } from "./_data/config";
import { USE_CASES } from "./_data/use-cases";
import { PROJECT_DASHBOARD } from "./_data/dashboard";
import { DIAGRAM_NODES } from "./_data/diagram";
import { ACTIVATION } from "./_data/activation";
import { AUTOMATION_TYPE } from "./_data/automation";

// Thin server entry of a frozen automation project. Header + footer come from the Projects-zone layout
// (step 213). TWO compositions (step 254.12, ROUTE-V3 law 5): the default is the owner's COCKPIT
// (AutomationEntry); ?view=public renders the VISITOR page — the same living sections, every entity in
// its view mode, zero admin chrome. The public surface behind the /projects* parallel routing serves
// exactly this composition.
export default async function Page({ searchParams }: { searchParams: Promise<{ view?: string }> }) {
  const { view } = await searchParams;
  if (view === "public") {
    return (
      <AutomationViewPage
        automation="other/test-stream-frozen-starter"
        title={PROJECT_DESCRIPTION.title}
        description={PROJECT_DESCRIPTION.description}
        nodes={DIAGRAM_NODES}
        dashboard={PROJECT_DASHBOARD}
        cases={USE_CASES}
        config={PROJECT_CONFIG.entities}
        controlPanel={{ schema: ACTIVATION, designed: ACTIVATION.params.length > 0, type: AUTOMATION_TYPE }}
      />
    );
  }
  return <AutomationEntry />;
}
